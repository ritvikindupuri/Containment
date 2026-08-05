import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { AgentRunPlan } from "@/lib/agent-run.functions";
import {
  closeFlowSession,
  deleteFlowSession,
  listFlowSessions,
  restoreFlowSession,
  saveFlowSession,
  wipeFlowSessions,
  type FlowSessionRow,
} from "@/lib/session.functions";

/**
 * The repo the user ingested, plus how far they have progressed through the
 * guided flow. Stored on the user's ACCOUNT (not the browser), so signing back
 * in resumes exactly where they left off instead of restarting the flow.
 */
export type RepoSession = {
  id: string;
  plan: AgentRunPlan;
  policy_approved: boolean;
  policy_version: number | null;
  examples_run: number;
  live_run_done?: boolean;
  ingested_at: string;
  updated_at: string;
};

/**
 * A session is only usable when the stored plan still matches the shape the UI
 * renders. Anything older or truncated is discarded rather than crashing the
 * page with "plan.steps.map is not a function".
 */
function isUsable(value: unknown): value is RepoSession {
  if (!value || typeof value !== "object") return false;
  const session = value as RepoSession;
  const plan = session.plan as AgentRunPlan | undefined;
  if (!plan || typeof plan !== "object") return false;
  if (!plan.repo || typeof plan.repo !== "object" || !plan.repo.owner || !plan.repo.repo) return false;
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) return false;
  if (!Array.isArray(plan.examples)) return false;
  if (!plan.policy || typeof plan.policy !== "object") return false;
  if (!Array.isArray(plan.policy.allowed_hosts)) return false;
  return true;
}

function toSession(row: FlowSessionRow): RepoSession | null {
  const draft: RepoSession = {
    id: row.local_id,
    plan: row.plan,
    policy_approved: row.policy_approved,
    policy_version: row.policy_version,
    examples_run: row.examples_run,
    live_run_done: row.live_run_done,
    ingested_at: row.ingested_at,
    updated_at: row.updated_at,
  };
  return isUsable(draft) ? draft : null;
}

export function useRepoSession() {
  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(listFlowSessions);
  const save = useServerFn(saveFlowSession);
  const close = useServerFn(closeFlowSession);
  const restoreFn = useServerFn(restoreFlowSession);
  const removeFn = useServerFn(deleteFlowSession);
  const wipeFn = useServerFn(wipeFlowSessions);

  const query = useQuery({
    queryKey: ["flow-sessions"],
    queryFn: () => fetchSessions() as Promise<FlowSessionRow[]>,
  });

  const rows = query.data ?? [];
  const history = rows.map(toSession).filter((entry): entry is RepoSession => entry !== null);
  const currentRow = rows.find((row) => row.is_current) ?? null;
  const session = currentRow ? toSession(currentRow) : null;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["flow-sessions"] });
  }, [queryClient]);

  const persist = useMutation({
    mutationFn: (input: RepoSession) =>
      save({
        data: {
          local_id: input.id,
          plan: input.plan,
          policy_approved: input.policy_approved,
          policy_version: input.policy_version,
          examples_run: input.examples_run,
          live_run_done: input.live_run_done ?? false,
          ingested_at: input.ingested_at,
        },
      }),
    onSuccess: invalidate,
  });

  const start = useCallback(
    (plan: AgentRunPlan) => {
      const draft: RepoSession = {
        id: `s_${Date.now().toString(36)}`,
        plan,
        policy_approved: false,
        policy_version: null,
        examples_run: 0,
        live_run_done: false,
        ingested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!isUsable(draft)) {
        throw new Error("That plan came back incomplete — try ingesting the repository again.");
      }
      queryClient.setQueryData<FlowSessionRow[]>(["flow-sessions"], (prev) => [
        {
          local_id: draft.id,
          plan: draft.plan,
          policy_approved: false,
          policy_version: null,
          examples_run: 0,
          live_run_done: false,
          is_current: true,
          ingested_at: draft.ingested_at,
          updated_at: draft.updated_at,
        },
        ...(prev ?? []).map((row) => ({ ...row, is_current: false })),
      ]);
      persist.mutate(draft);
    },
    [persist, queryClient],
  );

  const update = useCallback(
    (patch: Partial<Omit<RepoSession, "plan" | "id">>) => {
      if (!session) return;
      const next = { ...session, ...patch, updated_at: new Date().toISOString() };
      queryClient.setQueryData<FlowSessionRow[]>(["flow-sessions"], (prev) =>
        (prev ?? []).map((row) =>
          row.local_id === next.id
            ? {
                ...row,
                policy_approved: next.policy_approved,
                policy_version: next.policy_version,
                examples_run: next.examples_run,
                live_run_done: next.live_run_done ?? false,
                updated_at: next.updated_at,
              }
            : row,
        ),
      );
      persist.mutate(next);
    },
    [persist, queryClient, session],
  );

  /** Put the current session away without losing it — it stays in history. */
  const clear = useCallback(async () => {
    await close();
    invalidate();
  }, [close, invalidate]);

  /** Reload an archived session, with every setting and step it had. */
  const restore = useCallback(
    async (id: string) => {
      await restoreFn({ data: { local_id: id } });
      invalidate();
    },
    [invalidate, restoreFn],
  );

  const remove = useCallback(
    async (id: string) => {
      await removeFn({ data: { local_id: id } });
      invalidate();
    },
    [invalidate, removeFn],
  );

  /** Full wipe: current session and every archived one. */
  const wipe = useCallback(async () => {
    await wipeFn();
    invalidate();
  }, [invalidate, wipeFn]);

  return {
    session,
    history,
    loaded: !query.isLoading,
    start,
    update,
    clear,
    restore,
    remove,
    wipe,
  };
}
