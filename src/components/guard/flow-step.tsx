import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";

/** One step in the guided console flow. Locked until the previous step is done. */
export function FlowStep({
  index,
  title,
  summary,
  locked,
  lockedHint,
  done,
  active,
  children,
}: {
  index: number;
  title: string;
  summary: string;
  locked: boolean;
  lockedHint: string;
  done: boolean;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card transition-colors",
        locked ? "border-border/60 opacity-60" : done ? "border-success/40" : "border-border",
        active && !locked ? "border-primary/50 ring-1 ring-primary/30" : "",
      )}
    >
      <header className="flex items-start gap-3 border-b border-border/60 p-4">
        <span
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border font-mono text-xs",
            done
              ? "border-success/50 bg-success/15 text-success"
              : locked
                ? "border-border text-muted-foreground"
                : "border-primary/50 bg-primary/10 text-primary",
          )}
        >
          {done ? <Check className="size-3.5" /> : locked ? <Lock className="size-3" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{locked ? lockedHint : summary}</p>
        </div>
        {done && !locked ? <span className="label-mono text-success">done</span> : null}
      </header>
      {locked ? null : <div className="p-4">{children}</div>}
    </section>
  );
}
