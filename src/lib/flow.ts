import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDecisions } from "@/lib/guard.functions";
import { useRepoSession } from "@/lib/repo-session";

/** The three stages of the app, in the order a company actually rolls this out. */
export type StageKey = "setup" | "live_run" | "audit";

export type Stage = {
  key: StageKey;
  step: number;
  label: string;
  to: "/console" | "/agent-run" | "/dashboard";
  title: string;
  body: string;
  cta: string;
  unlocked: boolean;
  done: boolean;
  lockedHint: string;
};

type DecisionLite = {
  verdict?: string;
  approval_state?: string;
};

export function useFlowProgress() {
  const fetchDecisions = useServerFn(listDecisions);
  const decisions = useQuery({
    queryKey: ["decisions"],
    queryFn: () => fetchDecisions() as Promise<DecisionLite[]>,
    refetchInterval: 20_000,
  });
  const { session, loaded } = useRepoSession();

  const rows = decisions.data ?? [];
  const pendingApprovals = rows.filter((row) => row.approval_state === "pending").length;
  const resolvedApprovals = rows.filter(
    (row) => row.approval_state === "approved" || row.approval_state === "rejected",
  ).length;

  // Progress is read from the CURRENT session only. Decisions left over from an
  // earlier session must never unlock a later step of a new one.
  const repoDone = Boolean(session);
  const policyDone = repoDone && Boolean(session?.policy_approved);
  const examplesDone = policyDone && (session?.examples_run ?? 0) > 0;
  const setupDone = repoDone && policyDone && examplesDone;
  const runDone = setupDone && Boolean(session?.live_run_done);
  const auditDone = runDone && (pendingApprovals === 0 || resolvedApprovals > 0);
  const policyTuned = runDone && Boolean(session?.policy_version);


  const stages: Stage[] = [
    {
      key: "setup",
      step: 1,
      label: "Setup",
      to: "/console",
      title: "Set up from a repository",
      body: "Paste a public GitHub repo. We read it, write the policy and the actions worth testing, and you approve them.",
      cta: "Open setup",
      unlocked: true,
      done: setupDone,
      lockedHint: "",
    },
    {
      key: "live_run",
      step: 2,
      label: "Live run",
      to: "/agent-run",
      title: "Watch an agent get guarded",
      body: "The agent runs its whole plan for that repo, one action at a time. Risky actions stop; borderline ones wait for you.",
      cta: "Open live run",
      unlocked: setupDone,
      done: runDone,
      lockedHint: "Finish setup first: ingest a repo, approve its policy and run one suggested action.",
    },
    {
      key: "audit",
      step: 3,
      label: "Audit & approvals",
      to: "/dashboard",
      title: "Review what happened",
      body: "Every decision is logged. Anything marked needs approval waits in the approval queue for an AI review and your call.",
      cta: "Open audit",
      unlocked: runDone,
      done: auditDone,
      lockedHint: "Complete one live run first — there is nothing to audit yet.",
    },
    {
      key: "policy",
      step: 4,
      label: "Policy",
      to: "/policy",
      title: "Tune the policy by hand",
      body: "Once you have seen real verdicts, tighten thresholds, allowlists and enforcement. Every save is a new version.",
      cta: "Open policy",
      unlocked: runDone,
      done: policyTuned,
      lockedHint: "Complete one live run first — tune the policy against real verdicts, not guesses.",
    },
  ];

  return {
    stages,
    loading: decisions.isLoading || !loaded,
    pendingApprovals,
    complete: stages.every((stage) => stage.done),
    next: stages.find((stage) => !stage.done) ?? null,
    stageFor: (key: StageKey) => stages.find((stage) => stage.key === key)!,
  };
}
