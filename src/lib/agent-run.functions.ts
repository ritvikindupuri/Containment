import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlannedStep, PolicySuggestion, RepoContext } from "@/lib/agent-run.server";

export type AgentRunPlan = {
  repo: RepoContext;
  steps: PlannedStep[];
  examples: PlannedStep[];
  policy: PolicySuggestion;
  pod?: {
    name: string;
    namespace: string;
    status: string;
    ip: string;
    createdAt: string;
    nodeName: string;
    securityContext: {
      runAsUser: number;
      runAsNonRoot: boolean;
      readOnlyRootFilesystem: boolean;
      allowPrivilegeEscalation: boolean;
    };
  } | undefined;
};

export const ingestRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => ({ url: String(input?.url ?? "").slice(0, 400) }))
  .handler(async ({ data }): Promise<AgentRunPlan> => {
    const { fetchRepoContext, planAgentRun } = await import("@/lib/agent-run.server");
    const { k8sSandboxClient } = await import("@/lib/sandbox/k8s-client");
    const { context, excerpts } = await fetchRepoContext(data.url);
    const plan = await planAgentRun(context, excerpts);

    // Dynamically provision a dedicated, locked-down Kubernetes Sandbox pod for this repository
    let podInfo: AgentRunPlan["pod"] = undefined;
    try {
      const pod = await k8sSandboxClient.createEphemeralPod(context.repo, context.repo);
      podInfo = {
        name: pod.name,
        namespace: pod.namespace,
        status: pod.status,
        ip: pod.ip,
        createdAt: pod.createdAt,
        nodeName: pod.nodeName,
        securityContext: {
          runAsUser: pod.securityContext.runAsUser,
          runAsNonRoot: pod.securityContext.runAsNonRoot,
          readOnlyRootFilesystem: pod.securityContext.readOnlyRootFilesystem,
          allowPrivilegeEscalation: pod.securityContext.allowPrivilegeEscalation,
        },
      };
    } catch {
      // Continue even if pod creation fallback is needed
    }

    return { repo: context, pod: podInfo, ...plan };
  });

export const terminateEphemeralPod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { podName: string }) => ({ podName: String(input?.podName ?? "") }))
  .handler(async ({ data }) => {
    const { k8sSandboxClient } = await import("@/lib/sandbox/k8s-client");
    await k8sSandboxClient.terminatePod(data.podName);
    return { ok: true };
  });
