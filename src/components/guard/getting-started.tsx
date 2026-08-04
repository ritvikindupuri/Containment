import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, ArrowRight, X, Compass } from "lucide-react";
import { getPolicy, listDecisions, listKeys } from "@/lib/guard.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "containment.getting-started.dismissed";
export const POLICY_SAVED_KEY = "containment.policy.saved";

type Step = {
  title: string;
  body: string;
  done: boolean;
  to: "/policy" | "/console" | "/dashboard";
  cta: string;
};

export function GettingStarted() {
  const fetchKeys = useServerFn(listKeys);
  const fetchDecisions = useServerFn(listDecisions);
  const fetchPolicy = useServerFn(getPolicy);

  const keys = useQuery({ queryKey: ["keys"], queryFn: () => fetchKeys() as Promise<unknown[]> });
  const decisions = useQuery({ queryKey: ["decisions"], queryFn: () => fetchDecisions() as Promise<unknown[]> });
  const policy = useQuery({ queryKey: ["policy"], queryFn: () => fetchPolicy() as Promise<{ id: string } | null> });

  const [dismissed, setDismissed] = useState(true);
  const [policySaved, setPolicySaved] = useState(false);
  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    setPolicySaved(window.localStorage.getItem(POLICY_SAVED_KEY) === "1");
  }, []);

  const loading = keys.isLoading || decisions.isLoading || policy.isLoading;
  const hasPolicy = Boolean(policy.data?.id);
  const hasDecision = (decisions.data ?? []).length > 0;
  const hasKey = (keys.data ?? []).length > 0;

  const steps: Step[] = [
    {
      title: "1. Set your policy",
      body: "Choose which escape vectors to block, monitor vs. enforce, and your allowlists.",
      done: policySaved && hasPolicy,
      to: "/policy",
      cta: "Open policy",
    },
    {
      title: "2. Try an action in the playground",
      body: "Paste a command, path or URL your agent might run and see the verdict instantly.",
      done: hasDecision,
      to: "/console",
      cta: "Open playground",
    },
    {
      title: "3. Connect your agent",
      body: "Create a key and POST each action to the guard endpoint before your agent runs it.",
      done: hasKey,
      to: "/console",
      cta: "Create a key",
    },
  ];

  const complete = steps.every((step) => step.done);
  if (loading || dismissed || complete) return null;

  const next = steps.find((step) => !step.done)!;

  return (
    <section className="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Start here — three steps to a guarded agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Containment checks every action your AI agent wants to take and returns allow, needs approval or deny.
          </p>

          <ol className="mt-4 grid gap-3 md:grid-cols-3">
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
        <Button
          size="sm"
          variant="ghost"
          aria-label="Dismiss getting started"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
    </section>
  );
}
