import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/guard/types";

const STYLES: Record<Verdict, string> = {
  allow: "border-success/40 bg-success/12 text-success",
  needs_approval: "border-warning/40 bg-warning/12 text-warning",
  deny: "border-destructive/40 bg-destructive/12 text-destructive",
};

const LABELS: Record<Verdict, string> = {
  allow: "Allowed",
  needs_approval: "Needs approval",
  deny: "Blocked",
};

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider",
        STYLES[verdict],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABELS[verdict]}
    </span>
  );
}

export function RiskMeter({ score }: { score: number }) {
  const tone = score >= 60 ? "bg-destructive" : score >= 35 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <span className="font-mono text-xs text-muted-foreground">{score}</span>
    </div>
  );
}
