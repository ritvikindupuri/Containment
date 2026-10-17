import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Boxes,
  Cpu,
  Layers,
  Lock,
  Radio,
  Server,
  ShieldCheck,
} from "lucide-react";
import { getSandboxClusterStatus } from "@/lib/sandbox.functions";
import { cn } from "@/lib/utils";

export function KubernetesSandboxHud({
  activePodName,
  isExecuting = false,
  className,
}: {
  activePodName?: string | null;
  isExecuting?: boolean;
  className?: string;
}) {
  const getStatus = useServerFn(getSandboxClusterStatus);
  const { data: cluster } = useQuery({
    queryKey: ["k8s-cluster-status"],
    queryFn: () => getStatus(),
    refetchInterval: 10_000,
  });

  if (!cluster) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-surface/80 p-4 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Cluster / Runtime info */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Boxes className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight">Kubernetes Sandbox</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
                  cluster.mode === "emulated"
                    ? "bg-secondary text-secondary-foreground border border-border"
                    : "bg-success/15 text-success border border-success/30",
                )}
              >
                <Radio className="size-2.5 animate-pulse" />
                {cluster.mode === "emulated" ? "Emulated K8s Node" : "Live K8s Cluster"}
              </span>
              {isExecuting && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] text-warning border border-warning/30 animate-pulse">
                  Executing in Pod
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              namespace: <span className="text-foreground">{cluster.namespace}</span> | runtime:{" "}
              <span className="text-foreground">{cluster.runtimeClass ?? "runsc (gVisor)"}</span>
            </p>
          </div>
        </div>

        {/* Security badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs">
            <ShieldCheck className="size-3.5 text-success" />
            <span className="text-muted-foreground">PSS:</span>
            <span className="font-mono font-medium text-foreground">Restricted</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs">
            <Lock className="size-3.5 text-primary" />
            <span className="text-muted-foreground">Caps:</span>
            <span className="font-mono font-medium text-foreground">Drop ALL</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs">
            <Layers className="size-3.5 text-warning" />
            <span className="text-muted-foreground">FS:</span>
            <span className="font-mono font-medium text-foreground">ReadOnlyRoot</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2.5 py-1 text-xs">
            <Server className="size-3.5 text-foreground" />
            <span className="text-muted-foreground">Egress:</span>
            <span className="font-mono font-medium text-foreground">NetPolicy Deny-All</span>
          </div>
        </div>
      </div>

      {activePodName && (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Active Sandbox Pod:</span>
            <span className="font-mono text-primary font-medium">{activePodName}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Cpu className="size-3" />
              <span>Limits: 1000m CPU / 1024Mi RAM</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
