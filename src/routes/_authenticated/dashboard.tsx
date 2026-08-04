import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion, Inbox } from "lucide-react";
import { AppShell } from "@/components/guard/app-shell";
import { GettingStarted } from "@/components/guard/getting-started";
import { ContainmentStatus } from "@/components/guard/containment-status";
import { ApprovalQueue } from "@/components/guard/approval-queue";
import { FlowGate } from "@/components/guard/flow-gate";
import { VerdictBadge, RiskMeter } from "@/components/guard/verdict-badge";
import { listDecisions } from "@/lib/guard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Finding, Verdict } from "@/lib/guard/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Audit trail — Containment" },
      { name: "description", content: "Every guarded agent action, its verdict, risk score and the rules that fired." },
      { property: "og:title", content: "Audit trail — Containment" },
      { property: "og:description", content: "Every guarded agent action, its verdict and the rules that fired." },
    ],
  }),
  component: DashboardPage,
});

type DecisionRow = {
  id: string;
  agent_id: string | null;
  source: string;
  action_type: string;
  verdict: Verdict;
  risk_score: number;
  enforced: boolean;
  reasons: unknown;
  action: unknown;
  policy_version: number | null;
  created_at: string;
};

const FILTERS: Array<{ key: "all" | Verdict; label: string }> = [
  { key: "all", label: "All" },
  { key: "deny", label: "Blocked" },
  { key: "needs_approval", label: "Needs approval" },
  { key: "allow", label: "Allowed" },
];

function DashboardPage() {
  const fetchDecisions = useServerFn(listDecisions);
  const { data, isLoading, error } = useQuery({
    queryKey: ["decisions"],
    queryFn: () => fetchDecisions() as Promise<DecisionRow[]>,
    refetchInterval: 15000,
  });
  const [filter, setFilter] = useState<"all" | Verdict>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);
  const visible = filter === "all" ? rows : rows.filter((row) => row.verdict === filter);

  const stats = useMemo(
    () => ({
      total: rows.length,
      denied: rows.filter((r) => r.verdict === "deny").length,
      approval: rows.filter((r) => r.verdict === "needs_approval").length,
      allowed: rows.filter((r) => r.verdict === "allow").length,
    }),
    [rows],
  );

  return (
    <AppShell>
      <FlowGate stage="audit">
      <GettingStarted />
      <ContainmentStatus decisions={rows} />
      <div className="mb-8 mt-8">
        <ApprovalQueue />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-mono">Audit trail</span>
          <h1 className="mt-2 text-3xl font-semibold">Guarded actions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last 200 decisions across every key in this workspace, newest first.
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-border p-1">
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? "secondary" : "ghost"}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Decisions" value={stats.total} icon={Inbox} tone="text-foreground" />
        <StatCard label="Blocked" value={stats.denied} icon={ShieldAlert} tone="text-destructive" />
        <StatCard label="Needs approval" value={stats.approval} icon={ShieldQuestion} tone="text-warning" />
        <StatCard label="Allowed" value={stats.allowed} icon={ShieldCheck} tone="text-success" />
      </div>

      <Card className="mt-6 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Decision log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading decisions…</p>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">
              {error instanceof Error ? error.message : "Could not load decisions."}
            </p>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Run an action through the playground and it will appear within seconds.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/console">Open the playground</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((row) => {
                const findings = Array.isArray(row.reasons) ? (row.reasons as Finding[]) : [];
                const open = openId === row.id;
                return (
                  <div key={row.id} className="py-3">
                    <button
                      className="flex w-full flex-wrap items-center gap-3 text-left"
                      onClick={() => setOpenId(open ? null : row.id)}
                    >
                      <VerdictBadge verdict={row.verdict} />
                      <span className="font-mono text-xs text-muted-foreground">{row.action_type}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-sm">{describeAction(row.action)}</span>
                      <RiskMeter score={row.risk_score} />
                      {!row.enforced ? <span className="label-mono">monitor</span> : null}
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </span>
                    </button>
                    {open ? (
                      <div className="mt-3 space-y-3 rounded-md border border-border bg-surface/50 p-4">
                        <p className="label-mono">
                          agent {row.agent_id ?? "unknown"} · via {row.source} · policy v{row.policy_version ?? 1}
                        </p>
                        {findings.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No rules fired for this action.</p>
                        ) : (
                          findings.map((finding, index) => (
                            <div key={`${finding.rule}-${index}`} className="text-sm">
                              <p className="font-medium">
                                {finding.title}{" "}
                                <span className="font-mono text-xs text-muted-foreground">{finding.rule}</span>
                              </p>
                              <p className="text-muted-foreground">{finding.detail}</p>
                              {finding.evidence ? (
                                <p className="mt-1 font-mono text-xs text-warning">match: {finding.evidence}</p>
                              ) : null}
                            </div>
                          ))
                        )}
                        <pre className="overflow-x-auto rounded border border-border bg-card p-3 font-mono text-xs text-muted-foreground">
                          {JSON.stringify(row.action, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </FlowGate>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 py-5">
        <Icon className={`size-5 ${tone}`} />
        <div>
          <p className="label-mono">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function describeAction(action: unknown): string {
  if (!action || typeof action !== "object") return "—";
  const record = action as Record<string, unknown>;
  return String(record["command"] ?? record["url"] ?? record["path"] ?? record["tool"] ?? "—");
}
