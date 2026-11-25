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
      const repoUrl = `https://github.com/${context.owner}/${context.repo}`;
      const pod = await k8sSandboxClient.createEphemeralPod(context.repo, context.repo, repoUrl);
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
    } catch (err) {
      // If no cluster is configured, the live run can still evaluate actions in emulation.
      // On a real cluster, fail ingest so an empty workspace is not silently used.
      if (process.env["K8S_EMULATION_MODE"] !== "true") {
        throw err instanceof Error ? err : new Error("Failed to provision the Kubernetes sandbox pod");
      }
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
