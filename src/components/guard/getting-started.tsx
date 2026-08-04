import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, ArrowRight, Compass } from "lucide-react";
import { getPolicy, listDecisions, listKeys } from "@/lib/guard.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const POLICY_SAVED_KEY = "containment.policy.saved";

type Step = {
  title: string;
  body: string;
  done: boolean;
  to: "/policy" | "/console" | "/dashboard" | "/agent-run";
  cta: string;
};

export function GettingStarted() {
  const fetchKeys = useServerFn(listKeys);
  const fetchDecisions = useServerFn(listDecisions);
  const fetchPolicy = useServerFn(getPolicy);

  const keys = useQuery({ queryKey: ["keys"], queryFn: () => fetchKeys() as Promise<unknown[]> });
  const decisions = useQuery({
    queryKey: ["decisions"],
    queryFn: () => fetchDecisions() as Promise<Array<{ source?: string }>>,
  });
  const policy = useQuery({ queryKey: ["policy"], queryFn: () => fetchPolicy() as Promise<{ id: string } | null> });

  const [policySaved, setPolicySaved] = useState(false);
  useEffect(() => {
    setPolicySaved(window.localStorage.getItem(POLICY_SAVED_KEY) === "1");
  }, []);

  const loading = keys.isLoading || decisions.isLoading || policy.isLoading;
  const hasPolicy = Boolean(policy.data?.id);
  const hasDecision = (decisions.data ?? []).length > 0;
  const hasKey = (keys.data ?? []).length > 0;
  const hasAgentRun = (decisions.data ?? []).some(
    (row) => (row as { source?: string }).source === "agent_run",
  );

  const steps: Step[] = [
    {
      title: "1. Set your policy",
      body: "Choose which escape vectors to block, monitor vs. enforce, and your allowlists.",
      done: policySaved && hasPolicy,
      to: "/policy",
      cta: "Open policy",
    },
    {
      title: "2. Watch a real agent get guarded",
      body: "Paste any public GitHub repo. An AI agent plans the exact commands it would run on it, then Containment rules on each one live — allowed, gated or blocked.",
      done: hasAgentRun,
      to: "/agent-run",
      cta: "Run an agent",
    },
    {
      title: "3. Try your own action in the playground",
      body: "Paste a command, path or URL your agent might run and see the verdict instantly.",
      done: hasDecision,
      to: "/console",
      cta: "Open playground",
    },
    {
      title: "4. Connect your own agent",
      body: "A key lets your real agent ask Containment before it acts. Create one, then paste the ready-made cURL / TypeScript / Python snippet into your agent code.",
      done: hasKey,
      to: "/console",
      cta: "Create a key",
    },
  ];

  const complete = steps.every((step) => step.done);
  if (loading || complete) return null;

  const next = steps.find((step) => !step.done)!;

  return (
    <section className="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Start here — four steps to a guarded agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Containment checks every action your AI agent wants to take and returns allow, needs approval or deny.
          </p>

          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step) => (
              <li
                key={step.title}
                className={cn(
                  "rounded-md border p-3",
                  step.done ? "border-border bg-surface/40" : "border-border bg-card",
                  step === next ? "ring-1 ring-primary/50" : "",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border text-[10px]",
                      step.done ? "border-success/50 bg-success/15 text-success" : "border-border text-muted-foreground",
                    )}
                  >
                    {step.done ? <Check className="size-3" /> : null}
                  </span>
                  <p className="text-sm font-medium">{step.title}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{step.body}</p>
                {!step.done ? (
                  <Button asChild size="sm" variant={step === next ? "default" : "outline"} className="mt-3">
                    <Link to={step.to}>
                      {step.cta}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <p className="mt-3 text-xs text-success">Done</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
