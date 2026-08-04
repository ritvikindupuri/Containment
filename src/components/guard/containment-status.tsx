import { ShieldCheck, ShieldAlert, TerminalSquare, FolderLock, Network, Bug, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Finding, Verdict, Vector } from "@/lib/guard/types";

export type StatusDecision = {
  verdict: Verdict;
  enforced: boolean;
  reasons: unknown;
  created_at: string;
};

const VECTORS: Array<{ key: Vector; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "shell", label: "Command", icon: TerminalSquare },
  { key: "filesystem", label: "Filesystem", icon: FolderLock },
  { key: "network", label: "Network", icon: Network },
  { key: "injection", label: "Injection", icon: Bug },
];

/**
 * Big visual answer to "did the agent actually get out?".
 * Contained  = every risky action was blocked before it ran.
 * Breached   = a risky action was recorded but not enforced (monitor mode), so it ran.
 */
export function ContainmentStatus({ decisions }: { decisions: StatusDecision[] }) {
  const risky = decisions.filter((d) => d.verdict !== "allow");
  const stopped = risky.filter((d) => d.enforced);
  const escaped = risky.filter((d) => !d.enforced);
  const breached = escaped.length > 0;
  const idle = decisions.length === 0;

  const perVector = VECTORS.map((vector) => {
    const count = risky.filter((decision) => {
      const findings = Array.isArray(decision.reasons) ? (decision.reasons as Finding[]) : [];
      return findings.some((finding) => finding.vector === vector.key);
    }).length;
    return { ...vector, count };
  });

  const lastEscape = escaped[0]?.created_at;

  return (
    <section
      className={cn(
        "mb-8 overflow-hidden rounded-lg border",
        breached ? "border-destructive/50 bg-destructive/5" : "border-success/40 bg-success/5",
        idle && "border-border bg-card",
      )}
    >
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <p className="label-mono">Containment status</p>
          <div className="mt-2 flex items-center gap-3">
            {breached ? (
              <ShieldAlert className="size-8 shrink-0 text-destructive" />
            ) : (
              <ShieldCheck className={cn("size-8 shrink-0", idle ? "text-muted-foreground" : "text-success")} />
            )}
            <h2 className="text-2xl font-semibold tracking-tight">
              {idle ? "No agent activity yet" : breached ? "Escape not blocked" : "Sandbox intact"}
            </h2>
          </div>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {idle
              ? "Once your agents send actions here, this panel tells you at a glance whether anything got out of the sandbox."
              : breached
                ? `${escaped.length} risky action${escaped.length === 1 ? "" : "s"} were flagged but allowed to run because the policy was in monitor mode. Switch the policy to enforce to stop them.`
                : `${stopped.length} escape attempt${stopped.length === 1 ? "" : "s"} were blocked before they ran. Nothing left the sandbox.`}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {perVector.map((vector) => (
              <div key={vector.key} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <vector.icon className="size-4" />
                  <span className="label-mono">{vector.label}</span>
                </div>
                <p className="mt-1 text-xl font-semibold">{vector.count}</p>
                <p className="text-xs text-muted-foreground">attempts caught</p>
              </div>
            ))}
          </div>

          {lastEscape ? (
            <p className="mt-4 font-mono text-xs text-destructive">
              last unblocked action: {new Date(lastEscape).toLocaleString()}
            </p>
          ) : null}
        </div>

        {/* Sandbox diagram */}
        <div className="flex items-center justify-center">
          <div
            className={cn(
              "relative flex size-56 items-center justify-center rounded-full border-2 border-dashed",
              breached ? "border-destructive/60" : idle ? "border-border" : "border-success/60",
            )}
          >
            <div
              className={cn(
                "absolute inset-4 rounded-full",
                breached ? "bg-destructive/10" : idle ? "bg-surface/40" : "bg-success/10",
                !idle && !breached && "animate-pulse",
              )}
            />
            <div className="relative flex flex-col items-center gap-2">
              <Bot
                className={cn(
                  "size-10",
                  breached ? "text-destructive" : idle ? "text-muted-foreground" : "text-success",
                )}
              />
              <p className="font-mono text-xs text-muted-foreground">agent</p>
              <p
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  breached
                    ? "bg-destructive/20 text-destructive"
                    : idle
                      ? "bg-secondary text-muted-foreground"
                      : "bg-success/20 text-success",
                )}
              >
                {idle ? "idle" : breached ? "escaped" : "contained"}
              </p>
            </div>
            <span
              className={cn(
                "absolute -bottom-3 rounded-full border bg-background px-3 py-1 font-mono text-[10px]",
                breached ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground",
              )}
            >
              {stopped.length} blocked · {escaped.length} through
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
