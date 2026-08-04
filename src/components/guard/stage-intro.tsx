import { Info } from "lucide-react";
import type { StageKey } from "@/lib/flow";

type Intro = {
  what: string;
  do_here: string;
  next: string;
  parts: Array<{ name: string; does: string }>;
};

/** Plain-English explanation of every page and every component on it. */
export const STAGE_INTRO: Record<StageKey | "policy", Intro> = {
  setup: {
    what: "This is where Containment learns about the code your AI agent will work on. You give it a public GitHub repository; it reads the real files and works out what safe behaviour looks like for that project.",
    do_here:
      "Paste a repo URL, then approve the policy we suggest and run one or two of the suggested test actions. That is the whole setup — no manual configuration needed.",
    next: "When setup is done, step 2 (Live run) unlocks so you can watch a full agent run get guarded.",
    parts: [
      {
        name: "Repository box",
        does: "Reads the repo's metadata, file tree and setup files (README, package.json, Dockerfile…) and asks an AI to write the exact actions an agent would take on it.",
      },
      {
        name: "Suggested policy",
        does: "The rules we recommend for this repo: which hosts it may call, where it may write, which tools need a human, and the risk scores that block or pause an action. Approving it saves a new policy version.",
      },
      {
        name: "Suggested actions",
        does: "Repo-specific test cases — ordinary build steps plus realistic escape attempts. Press Run on one to see the verdict without touching your real agent.",
      },
      {
        name: "Agent keys",
        does: "The password your real agent uses to call Containment from your own codebase or CI. Copy the ready-made cURL, TypeScript or Python snippet.",
      },
    ],
  },
  live_run: {
    what: "A dry run of a whole agent session. The agent works through its plan for your repo one action at a time, and every action is submitted to your policy before it is allowed to happen.",
    do_here:
      "Press Run and watch. Blocked actions stop the agent, borderline ones pause for your approval, and routine ones sail through. Then download the PDF report.",
    next: "After a run, step 3 (Audit & approvals) unlocks with the permanent record of every decision.",
    parts: [
      {
        name: "Sandbox seal",
        does: "Says SEALED while nothing unsafe got through, and ESCAPE GOT THROUGH the moment an unsafe action executed anyway (which happens in monitor mode).",
      },
      {
        name: "The four counters",
        does: "Blocked, held for approval, allowed, and escaped — the headline numbers for this run.",
      },
      {
        name: "Action list",
        does: "Each action with its verdict, risk score out of 100 and the rules that fired. Untrusted text that influenced an action is quoted so you can see prompt injection at work.",
      },
      {
        name: "Download PDF report",
        does: "A dated, print-ready report of this run: status, counters, policy version, the full audit table and the reasoning behind each verdict.",
      },
    ],
  },
  audit: {
    what: "The permanent record. Every decision Containment has ever made for your workspace — from the playground, from live runs and from your real agent through the API.",
    do_here:
      "Clear the approval queue: each held action gets an AI security review, then you release or hold it. Expand any log row to see the rules behind its verdict.",
    next: "Once the queue is clear you are fully set up. The agent already wrote and versioned your policy — you can fine-tune it by hand from the link on this page if you ever need to.",
    parts: [
      {
        name: "Containment status",
        does: "Workspace-wide view of whether anything has escaped, plus attempts caught per vector: shell, filesystem, network and injection.",
      },
      {
        name: "Approval queue",
        does: "Actions too risky to allow but not clearly malicious. An AI reviewer explains the risk and recommends release or hold; your decision is written onto the audit record.",
      },
      {
        name: "Decision log",
        does: "Every action with its verdict, risk score, source, the policy version that ruled it, and the exact rule findings.",
      },
    ],
  },
  policy: {
    what: "The rulebook itself. This is the same policy the API enforces for your production agents, so changes here change what your real agent is allowed to do.",
    do_here:
      "Tighten thresholds and allowlists based on the verdicts you just saw, add a note describing what changed, and save. Enforce mode blocks; monitor mode only records.",
    next: "Every save creates a new version, and each future decision records the version that ruled it — so you always know which rules applied.",
    parts: [
      {
        name: "Vector switches",
        does: "Turn guarding on or off for shell execution, filesystem access, network egress and prompt injection.",
      },
      {
        name: "Risk thresholds",
        does: "Deny threshold: the score at which an action is blocked. Approval threshold: the score at which it pauses for a human.",
      },
      {
        name: "Allowlists",
        does: "Hosts your agent may call, directories it may write to, and tools that always need human approval.",
      },
      {
        name: "Version history",
        does: "A snapshot of every saved version with your change note, so audits can prove which rules were live at any time.",
      },
    ],
  },
};

export function StageIntro({ stage }: { stage: StageKey | "policy" }) {
  const intro = STAGE_INTRO[stage];
  return (
    <section className="mb-8 rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-foreground">{intro.what}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface/40 p-3">
              <p className="label-mono">What you do here</p>
              <p className="mt-1 text-xs text-muted-foreground">{intro.do_here}</p>
            </div>
            <div className="rounded-md border border-border bg-surface/40 p-3">
              <p className="label-mono">What happens next</p>
              <p className="mt-1 text-xs text-muted-foreground">{intro.next}</p>
            </div>
          </div>
          <details className="group">
            <summary className="cursor-pointer text-xs text-primary underline-offset-2 hover:underline">
              What does each thing on this page do?
            </summary>
            <dl className="mt-3 grid gap-2 md:grid-cols-2">
              {intro.parts.map((part) => (
                <div key={part.name} className="rounded-md border border-border p-3">
                  <dt className="text-xs font-medium">{part.name}</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{part.does}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </div>
    </section>
  );
}
