import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Brain, Loader2 } from "lucide-react";
import { adviseOnDecision, type RiskAdviceRow } from "@/lib/guard.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<RiskAdviceRow["advisor_level"], string> = {
  low: "border-success/40 text-success",
  elevated: "border-warning/50 text-warning",
  high: "border-destructive/50 text-destructive",
  critical: "border-destructive text-destructive",
};

/**
 * Advisory AI risk read on one decision. Never changes the verdict — the
 * deterministic engine already enforced it. This only adds nuance for a human.
 */
export function AiSecondOpinion({ decisionId }: { decisionId: string }) {
  const advise = useServerFn(adviseOnDecision);
  const [advice, setAdvice] = useState<RiskAdviceRow | null>(null);

  const mutation = useMutation({
    mutationFn: () => advise({ data: { id: decisionId } }),
    onSuccess: (value) => setAdvice(value as RiskAdviceRow),
    onError: (error) => toast.error(error instanceof Error ? error.message : "The risk layer could not run"),
  });

  return (
    <div className="rounded-md border border-border bg-surface/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Brain className="size-4 text-primary" /> AI risk layer (advisory)
        </p>
        <Button size="sm" variant="outline" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Brain className="size-4" />}
          {advice ? "Read again" : "Get a second opinion"}
        </Button>
      </div>

      {advice ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "rounded border px-2 py-0.5 font-mono uppercase tracking-wider",
                LEVEL_STYLES[advice.advisor_level],
              )}
            >
              {advice.advisor_level} · {advice.advisor_score}/100
            </span>
            <span className="text-muted-foreground">
              {advice.advisor_agrees
                ? "Agrees with the rule-based verdict."
                : "Disagrees with the rule-based verdict — worth a human look."}
            </span>
          </div>
          <p className="text-sm">{advice.advisor_headline}</p>
          <ul className="space-y-1">
            {advice.advisor_concerns.map((concern, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                · {concern}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Advisory only. The deterministic rules decided this verdict and this read is stored on the audit entry.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          The rules already decided this action. Ask the AI layer for nuance the rules can't express — a command that
          looks suspicious even though nothing matched, or context that makes a flagged action look routine. It never
          changes the verdict.
        </p>
      )}
    </div>
  );
}
