import { k8sSandboxClient } from "./k8s-client";
import type {
  KubernetesClusterStatus,
  SandboxExecutionResult,
  SandboxPod,
} from "./types";
import { evaluateAction } from "@/lib/guard/engine";
import type { GuardAction, GuardPolicy, GuardResult } from "@/lib/guard/types";

export type GuardedSandboxExecution = {
  guard: GuardResult;
  executedInSandbox: boolean;
  sandbox?: SandboxExecutionResult;
  pod?: {
    name: string;
    namespace: string;
    ip: string;
    runtimeClass: string | null;
  };
  reasonIfSkipped?: string;
};

/**
 * High-level orchestrator that intercepts an action via Containment Guard Firewall,
 * and if ALLOWED (or approved), dispatches execution to an isolated Kubernetes Sandbox Pod.
 */
export async function executeWithKubernetesSandbox(
  action: GuardAction,
  policy: GuardPolicy,
  sessionId: string = "default-session",
): Promise<GuardedSandboxExecution> {
  // Step 1: In-memory Containment Guard evaluation (<10ms)
  const guardResult = evaluateAction(action, policy);

  // Step 2: Defense-in-depth gate
  // If the action is denied or needs human approval, DO NOT let it touch the Kubernetes sandbox!
  if (guardResult.verdict === "deny") {
    return {
      guard: guardResult,
      executedInSandbox: false,
      reasonIfSkipped: "Action was blocked by Containment guardrail policy before reaching the Kubernetes cluster.",
    };
  }

  if (guardResult.verdict === "needs_approval") {
    return {
      guard: guardResult,
      executedInSandbox: false,
      reasonIfSkipped: "Action is held in the human-in-the-loop approval queue. Execution in Kubernetes sandbox is paused.",
    };
  }

  // Step 3: Action is verified safe (or policy is monitor mode) -> Execute inside isolated Kubernetes Sandbox Pod
  const pod = await k8sSandboxClient.ensurePod(sessionId, action.agent_id);
  const sandboxResult = await k8sSandboxClient.executeInPod(sessionId, action, policy);

  return {
    guard: guardResult,
    executedInSandbox: true,
    sandbox: sandboxResult,
    pod: {
      name: pod.name,
      namespace: pod.namespace,
      ip: pod.ip,
      runtimeClass: pod.securityContext.runtimeClassName ?? "gvisor",
    },
  };
}

export async function getKubernetesStatus(): Promise<KubernetesClusterStatus> {
  return k8sSandboxClient.getClusterStatus();
}

export async function listActiveSandboxPods(): Promise<SandboxPod[]> {
  return k8sSandboxClient.listPods();
}

export async function destroySandboxSession(sessionId: string): Promise<boolean> {
  return k8sSandboxClient.terminatePod(sessionId);
}
