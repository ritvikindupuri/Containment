import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { actionSchema } from "@/lib/guard/schemas";
import {
  executeWithKubernetesSandbox,
  getKubernetesStatus,
  listActiveSandboxPods,
  destroySandboxSession,
  type GuardedSandboxExecution,
} from "./sandbox/k8s-sandbox.server";
import type { KubernetesClusterStatus, SandboxPod } from "./sandbox/types";
import { DEFAULT_POLICY, type GuardAction, type GuardPolicy } from "@/lib/guard/types";

type AuthedSupabase = { from: (table: string) => any };

async function getCallerPolicy(supabase: AuthedSupabase, userId: string): Promise<{ id: string; version: number; policy: GuardPolicy }> {
  const existing = await supabase
    .from("policies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.data) {
    const row = existing.data;
    return {
      id: row.id,
      version: row.version ?? 1,
      policy: {
        mode: row.mode,
        block_shell: row.block_shell,
        block_filesystem: row.block_filesystem,
        block_network: row.block_network,
        block_injection: row.block_injection,
        allowed_hosts: row.allowed_hosts ?? DEFAULT_POLICY.allowed_hosts,
        allowed_write_paths: row.allowed_write_paths ?? DEFAULT_POLICY.allowed_write_paths,
        approval_required_tools: row.approval_required_tools ?? DEFAULT_POLICY.approval_required_tools,
        deny_threshold: row.deny_threshold ?? 60,
        approval_threshold: row.approval_threshold ?? 35,
      },
    };
  }

  return {
    id: "default-policy",
    version: 1,
    policy: DEFAULT_POLICY,
  };
}

/**
 * Returns current Kubernetes cluster connection status, active pods, and sandbox security posture.
 */
export const getSandboxClusterStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<KubernetesClusterStatus> => {
    return getKubernetesStatus();
  });

/**
 * Lists all active sandbox pods in the containment-sandbox namespace.
 */
export const getActiveSandboxPods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<SandboxPod[]> => {
    return listActiveSandboxPods();
  });

/**
 * Runs a proposed action through Containment Guard Firewall, and if ALLOWED,
 * executes it inside an isolated Kubernetes Sandbox Pod. Logs the verdict & telemetry to Supabase.
 */
export const executeInKubernetesSandbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const data = input as { action: unknown; sessionId?: string };
    return {
      action: actionSchema.parse(data.action),
      sessionId: String(data.sessionId ?? "default-run").slice(0, 64),
    };
  })
  .handler(async ({ data, context }): Promise<GuardedSandboxExecution & { decision_id?: string | undefined }> => {
    const { supabase, userId } = context;
    const { id: policyId, version: policyVersion, policy } = await getCallerPolicy(supabase as AuthedSupabase, userId);

    const result = await executeWithKubernetesSandbox(
      data.action as GuardAction,
      policy,
      data.sessionId,
    );

    // Commit decision & audit record to Supabase
    let decisionId: string | undefined;
    try {
      const logged = await supabase.from("decisions").insert({
        user_id: userId,
        policy_id: policyId,
        policy_version: policyVersion,
        approval_state: result.guard.intended_verdict === "needs_approval" ? "pending" : "none",
        agent_id: data.action.agent_id ?? "k8s-sandbox-runner",
        source: "k8s_sandbox",
        action_type: result.guard.action_type,
        verdict: result.guard.intended_verdict,
        risk_score: result.guard.risk_score,
        enforced: result.guard.enforced,
        reasons: JSON.parse(JSON.stringify(result.guard.findings)),
        action: JSON.parse(JSON.stringify(data.action)),
        resolution_note: result.executedInSandbox
          ? `Executed in K8s Sandbox Pod ${result.pod?.name} (exit code: ${result.sandbox?.exitCode}, duration: ${result.sandbox?.durationMs}ms)`
          : (result.reasonIfSkipped ?? null),
      }).select("id").maybeSingle();

      if (logged?.data?.id) {
        decisionId = logged.data.id;
      }
    } catch {
      // Gracefully continue even if DB insert fails
    }

    return {
      ...result,
      decision_id: decisionId,
    };
  });

/**
 * Terminates an active session sandbox pod.
 */
export const terminateSandboxSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: String(input.sessionId) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const ok = await destroySandboxSession(data.sessionId);
    return { ok };
  });
