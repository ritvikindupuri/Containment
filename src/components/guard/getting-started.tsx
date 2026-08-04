import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Compass, Lock } from "lucide-react";
import { useFlowProgress } from "@/lib/flow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const POLICY_SAVED_KEY = "containment.policy.saved";

/**
 * The permanent guided rail. Shows the three stages in order, what is unlocked,
 * and the single next thing to do. Cannot be dismissed until the flow is done.
 */
export function GettingStarted() {
  const { stages, loading, complete, next, pendingApprovals } = useFlowProgress();
  if (loading || complete) return null;

  return (
    <section className="mb-8 rounded-lg border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <Compass className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">Start here — each step unlocks the next</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Containment checks every action your AI agent wants to take and answers allow, needs approval or deny.
            {pendingApprovals > 0 && stages[2]?.unlocked
              ? ` ${pendingApprovals} action${pendingApprovals === 1 ? "" : "s"} are waiting for your approval in step 3.`
              : ""}

          </p>

          <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stages.map((stage) => (
              <li
                key={stage.key}
                className={cn(
                  "rounded-md border p-3",
                  stage.done
                    ? "border-border bg-surface/40"
                    : stage.unlocked
                      ? "border-border bg-card"
                      : "border-border/60 bg-card/50 opacity-70",
                  stage === next ? "ring-1 ring-primary/50" : "",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border font-mono text-[10px]",
                      stage.done
                        ? "border-success/50 bg-success/15 text-success"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {stage.done ? <Check className="size-3" /> : stage.unlocked ? stage.step : <Lock className="size-2.5" />}
                  </span>
                  <p className="text-sm font-medium">
                    {stage.step}. {stage.label}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{stage.unlocked ? stage.body : stage.lockedHint}</p>
                {stage.done ? (
                  <p className="mt-3 text-xs text-success">Done</p>
                ) : stage.unlocked ? (
                  <Button asChild size="sm" variant={stage === next ? "default" : "outline"} className="mt-3">
                    <Link to={stage.to}>
                      {stage.cta}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="size-3" /> Locked
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
