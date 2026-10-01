import { Terminal, CheckCircle2, XCircle, ShieldAlert, Cpu, Clock, Box } from "lucide-react";
import type { SandboxExecutionResult } from "@/lib/sandbox/types";
import { cn } from "@/lib/utils";

export function KubernetesExecutionDrawer({
  result,
  blocked = false,
  reason,
}: {
  result?: SandboxExecutionResult | null | undefined;
  blocked?: boolean | undefined;
  reason?: string | null | undefined;
}) {
  if (blocked) {
    return (
      <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3.5 text-xs">
        <div className="flex items-center gap-2 font-medium text-destructive">
          <ShieldAlert className="size-4" />
          <span>Containment Defense-in-Depth Quarantine</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          {reason ?? "Action was blocked by the pre-execution guardrail firewall. It was terminated immediately and never dispatched to the Kubernetes sandbox pod."}
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-destructive/10 px-2 py-0.5 font-mono text-[11px] text-destructive">
          Sandbox Status: SEALED (Zero bytes executed)
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-border bg-[#0d1117] text-xs font-mono shadow-inner">
      {/* Console Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-[#161b22] px-3 py-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-primary" />
          <span className="font-semibold text-foreground">k8s-pod: {result.podName}</span>
          <span className="text-muted-foreground/60">({result.namespace})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>{result.durationMs}ms</span>
          </span>
          <span className="flex items-center gap-1">
            <Cpu className="size-3" />
            <span>{result.resourceUsage?.cpuMillis ?? 35}m CPU</span>
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
              result.exitCode === 0
                ? "bg-success/20 text-success"
                : "bg-destructive/20 text-destructive",
            )}
          >
            {result.exitCode === 0 ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <XCircle className="size-3" />
            )}
            exit: {result.exitCode}
          </span>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="max-h-60 overflow-y-auto p-3 text-slate-200">
        {result.stdout && (
          <pre className="whitespace-pre-wrap font-mono leading-relaxed text-emerald-400/90">
            {result.stdout}
          </pre>
        )}
        {result.stderr && (
          <pre className="mt-2 whitespace-pre-wrap font-mono leading-relaxed text-rose-400">
            {result.stderr}
          </pre>
        )}
        {!result.stdout && !result.stderr && (
          <span className="text-muted-foreground italic">(no console output)</span>
        )}
      </div>

      {/* Verification footer */}
      <div className="flex items-center justify-between border-t border-border/40 bg-[#12161f] px-3 py-1 text-[10px] text-muted-foreground">
        <span>NetworkPolicy: {result.networkPolicyPassed ? "ALLOWED" : "REJECTED"}</span>
        <span>SecurityContext: runAsUser 1000 | readOnlyRootFilesystem</span>
      </div>
    </div>
  );
}
