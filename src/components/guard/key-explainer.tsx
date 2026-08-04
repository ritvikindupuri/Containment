import { ArrowRight, Bot, ShieldHalf, Terminal, Ban, CheckCheck } from "lucide-react";

const FLOW = [
  {
    icon: Bot,
    title: "Your agent decides",
    body: "Your AI agent is about to run a command, open a file, call an API or use a tool.",
  },
  {
    icon: ShieldHalf,
    title: "It asks Containment first",
    body: "Your code sends that action here with the agent key. The key tells us which workspace and policy to use.",
  },
  {
    icon: CheckCheck,
    title: "We answer in one word",
    body: "allow, needs_approval or deny — with the rules that fired and a risk score.",
  },
  {
    icon: Terminal,
    title: "Your code obeys",
    body: "Run the action only on allow. On deny, throw. On needs_approval, ask a human.",
  },
];

const LINES: Array<{ code: string; note: string }> = [
  { code: "POST /api/public/v1/guard", note: "The one endpoint your agent calls." },
  { code: 'x-guard-key: agk_live_…', note: "Your agent key — proves the request is yours, like a password for the agent." },
  { code: '"type": "shell"', note: "What kind of action it is: shell, file_read, file_write, network or tool_call." },
  { code: '"command": "npm install lodash"', note: "The actual thing the agent wants to do." },
  { code: '→ {"verdict":"allow"}', note: "If this is not \"allow\", your code must not run the action." },
];

/** Plain-language explanation of what agent keys are for and how the request works. */
export function KeyExplainer() {
  return (
    <div className="space-y-4 rounded-md border border-primary/25 bg-primary/5 p-4">
      <div>
        <p className="label-mono text-primary">What is this for?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          An agent key is how your <em>real</em> agent — the one running in your codebase, CI job or product — talks to
          Containment. The playground above is you testing by hand; the key is how the agent does it automatically,
          every time it wants to act.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {FLOW.map((step, index) => (
          <li key={step.title} className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <step.icon className="size-4 text-primary" />
              <p className="text-sm font-medium">
                {index + 1}. {step.title}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-md border border-border bg-card p-3">
        <p className="label-mono">Line by line</p>
        <ul className="mt-2 space-y-2">
          {LINES.map((line) => (
            <li key={line.code} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <code className="shrink-0 font-mono text-xs text-warning">{line.code}</code>
              <span className="text-xs text-muted-foreground">{line.note}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Ban className="mt-0.5 size-3.5 shrink-0 text-destructive" />
        No key, no decisions: without one your agent runs unguarded and nothing shows up in the audit trail.
        <ArrowRight className="mt-0.5 size-3.5 shrink-0" />
      </p>
    </div>
  );
}
