import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useFlowProgress, type StageKey } from "@/lib/flow";
import { Button } from "@/components/ui/button";

/**
 * Wraps a page so it only renders once the stages before it are finished.
 * Locked pages explain what to do instead of showing an empty screen.
 */
export function FlowGate({ stage, children }: { stage: StageKey; children: ReactNode }) {
  const { stages, loading, stageFor } = useFlowProgress();
  const current = stageFor(stage);

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Checking where you are in the flow…</p>;
  }
  if (current.unlocked) return <>{children}</>;

  const blocker = stages.find((item) => item.step < current.step && !item.done) ?? stages[0]!;

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-border bg-card p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full border border-border">
        <Lock className="size-5 text-muted-foreground" />
      </span>
      <span className="label-mono mt-4 block">Step {current.step} — locked</span>
      <h1 className="mt-2 text-2xl font-semibold">{current.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{current.lockedHint}</p>
      <Button asChild className="mt-6">
        <Link to={blocker.to}>
          Go to step {blocker.step}: {blocker.label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </section>
  );
}
