import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlannedStep, RepoContext } from "@/lib/agent-run.server";

export type AgentRunPlan = { repo: RepoContext; steps: PlannedStep[] };

export const ingestRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => ({ url: String(input?.url ?? "").slice(0, 400) }))
  .handler(async ({ data }): Promise<AgentRunPlan> => {
    const { fetchRepoContext, planAgentRun } = await import("@/lib/agent-run.server");
    const { context, excerpts } = await fetchRepoContext(data.url);
    const steps = await planAgentRun(context, excerpts);
    return { repo: context, steps };
  });
