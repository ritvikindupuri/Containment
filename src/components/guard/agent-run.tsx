import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Github,
  Play,
  Loader2,
  Terminal,
  FileText,
  FilePen,
  Globe,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  FileDown,
} from "lucide-react";
import { ingestRepo, type AgentRunPlan } from "@/lib/agent-run.functions";
import { useRepoSession } from "@/lib/repo-session";
import { evaluateAgentStep, getApproval, type ApprovalRow } from "@/lib/guard.functions";
import { ApprovalCard } from "@/components/guard/approval-card";
import { VerdictBadge, RiskMeter } from "@/components/guard/verdict-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buildRunReport } from "@/lib/run-report";
import { supabase } from "@/integrations/supabase/client";
import type { ActionType, GuardResult } from "@/lib/guard/types";

type StepResult = GuardResult & {
  decision_id: string;
  policy_version: number;
  policy_mode: "enforce" | "monitor";
};

const TYPE_META: Record<ActionType, { icon: typeof Terminal; label: string }> = {
  shell: { icon: Terminal, label: "shell command" },
  file_read: { icon: FileText, label: "file read" },
  file_write: { icon: FilePen, label: "file write" },
  network: { icon: Globe, label: "network call" },
  tool_call: { icon: Wrench, label: "tool call" },
};

const EXAMPLES = ["https://github.com/expressjs/express", "https://github.com/psf/requests", "https://github.com/vitejs/vite"];

function actionLine(action: AgentRunPlan["steps"][number]["action"]): string {
  if (action.type === "shell") return action.command ?? "";
  if (action.type === "network") return `${action.url ?? ""}${action.body ? ` — body: ${action.body.slice(0, 120)}` : ""}`;
  if (action.type === "tool_call") return `${action.tool ?? ""}(${JSON.stringify(action.args ?? {})})`;
  return action.path ?? "";
}

export function AgentRun() {
  const queryClient = useQueryClient();
  const ingest = useServerFn(ingestRepo);
  const evaluate = useServerFn(evaluateAgentStep);
  const loadApproval = useServerFn(getApproval);

  const { session, start, update } = useRepoSession();
  const [url, setUrl] = useState("");
  const [plan, setPlan] = useState<AgentRunPlan | null>(null);
  const [results, setResults] = useState<Record<number, StepResult>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [awaiting, setAwaiting] = useState<{ index: number; row: ApprovalRow } | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);

  const ingestMutation = useMutation({
    mutationFn: (value: string) => ingest({ data: { url: value } }),
    onSuccess: (value) => {
      setPlan(value as AgentRunPlan);
      start(value as AgentRunPlan);
      setResults({});
      setActiveIndex(null);
      setOpen(null);
      toast.success(`Agent cloned ${value.repo.owner}/${value.repo.repo} and planned ${value.steps.length} actions.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not read that repository"),
  });

  async function runFrom(startIndex: number) {
    if (!plan || running) return;
    setRunning(true);
    setAwaiting(null);
    if (startIndex === 0) {
      setResults({});
      setOpen(null);
      setStartedAt(new Date().toISOString());
      setFinishedAt(null);
    }
    try {
      for (let index = startIndex; index < plan.steps.length; index += 1) {
        setActiveIndex(index);
        const step = plan.steps[index]!;
        const value = (await evaluate({ data: step.action })) as StepResult;
        setResults((prev) => ({ ...prev, [index]: value }));
        queryClient.invalidateQueries({ queryKey: ["decisions"] });

        if (value.verdict === "needs_approval" && value.decision_id) {
          // The policy will not decide this one alone: hold the run until a human does.
          const row = (await loadApproval({ data: { id: value.decision_id } })) as ApprovalRow;
          setAwaiting({ index, row });
          queryClient.invalidateQueries({ queryKey: ["approvals"] });
          toast.warning("The agent is paused — this action needs your approval.");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      setFinishedAt(new Date().toISOString());
      update({ live_run_done: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The run stopped early");
    } finally {
      setActiveIndex(null);
      setRunning(false);
    }
  }

  useEffect(() => {
    if (session?.plan && !plan) setPlan(session.plan);
  }, [session, plan]);

  /** Renders the print-ready PDF in the browser and hands it to the user. */
  async function downloadReport() {
    if (!plan) return;
    try {
      const { data } = await supabase.auth.getUser();
      const last = Object.values(results).at(-1);
      const { blob, filename } = buildRunReport({
        plan,
        results,
        policyVersion: last?.policy_version ?? session?.policy_version ?? null,
        policyMode: last?.policy_mode ?? null,
        operator: data.user?.email ?? "Containment workspace",
        startedAt,
        finishedAt: finishedAt ?? (running ? null : startedAt),
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(href);
      toast.success("Report downloaded — ready to print or hand in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the report");
    }
  }

  const done = Object.values(results);
  const blocked = done.filter((r) => r.verdict === "deny").length;
  const approval = done.filter((r) => r.verdict === "needs_approval").length;
  const allowed = done.filter((r) => r.verdict === "allow").length;
  const escaped = done.filter((r) => !r.enforced && r.intended_verdict !== "allow").length;
  const sealed = escaped === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Github className="size-4 text-primary" />
            Run a real agent on a real repo
          </CardTitle>
          <CardDescription>
            Paste any public GitHub repo. An AI agent reads the repository, writes the exact line-by-line actions it
            would take to install and run it, then asks Containment before each one — and you watch every verdict.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://github.com/owner/repo"
              onKeyDown={(event) => {
                if (event.key === "Enter" && url.trim()) ingestMutation.mutate(url.trim());
              }}
            />
            <Button onClick={() => ingestMutation.mutate(url.trim())} disabled={!url.trim() || ingestMutation.isPending}>
              {ingestMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
              {ingestMutation.isPending ? "Cloning & planning…" : "Ingest repo"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] transition-colors hover:bg-secondary/60"
                onClick={() => {
                  setUrl(example);
                  ingestMutation.mutate(example);
                }}
              >
                {example.replace("https://github.com/", "")}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {plan ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <Card className={cn("border", sealed ? "border-success/40" : "border-destructive/50")}>
              <CardContent className="space-y-4 pt-6">
                <div
                  className={cn(
                    "relative rounded-lg border-2 border-dashed p-6 text-center",
                    sealed ? "border-success/50 bg-success/5" : "border-destructive/60 bg-destructive/5",
                  )}
                >
                  {sealed ? (
                    <ShieldCheck className="mx-auto size-8 text-success" />
                  ) : (
                    <ShieldAlert className="mx-auto size-8 text-destructive" />
                  )}
                  <p
                    className={cn(
                      "mt-2 font-mono text-sm font-semibold uppercase tracking-widest",
                      sealed ? "text-success" : "text-destructive",
                    )}
                  >
                    {sealed ? "sandbox sealed" : "escape got through"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {done.length === 0
                      ? "Press Run to watch the agent act."
                      : sealed
                        ? "Every risky action this agent tried was stopped."
                        : `${escaped} risky action${escaped === 1 ? "" : "s"} ran because your policy is in monitor mode.`}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-center">
                  {[
                    { label: "Blocked", value: blocked, tone: "text-destructive" },
                    { label: "Approval", value: approval, tone: "text-warning" },
                    { label: "Allowed", value: allowed, tone: "text-success" },
                    { label: "Escaped", value: escaped, tone: escaped ? "text-destructive" : "text-muted-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-border bg-surface/40 p-3">
                      <dd className={cn("font-mono text-xl", item.tone)}>{item.value}</dd>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</dt>
                    </div>
                  ))}
                </dl>
                <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                  <p className="font-mono text-foreground">
                    {plan.repo.owner}/{plan.repo.repo}
                  </p>
                  <p className="mt-1">
                    {plan.repo.language ?? "unknown"} · {plan.repo.file_count} files · {plan.repo.stars} stars
                  </p>
                  <p className="mt-1">Read: {plan.repo.scanned_files.join(", ") || "no setup files"}</p>
                </div>
                <Button className="w-full" onClick={() => void runFrom(0)} disabled={running}>
                  {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  {running ? "Agent is acting…" : done.length ? "Run again" : `Run ${plan.steps.length} actions`}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void downloadReport()}
                  disabled={done.length === 0 || running}
                >
                  <FileDown className="size-4" />
                  Download PDF report
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  A dated, print-ready report: containment status, the four counters, the policy version that ruled,
                  every action in a table and the rule-by-rule reasoning behind each verdict.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {awaiting ? (
                <div className="rounded-lg border border-warning/60 bg-warning/5 p-4">
                  <p className="text-sm font-medium">
                    Agent paused at step {awaiting.index + 1} — it needs a human before it can continue
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Release it and the agent carries on from the next action. Hold it and the run stops here. Either way
                    the choice is recorded in the audit trail.
                  </p>
                  <div className="mt-3">
                    <ApprovalCard
                      row={awaiting.row}
                      onResolved={(next) => {
                        const from = awaiting.index + 1;
                        setAwaiting(null);
                        if (next.approval_state === "approved") void runFrom(from);
                        else toast.info("Run held — the agent never took that action.");
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {plan.steps.map((step, index) => {
                const meta = TYPE_META[step.action.type];
                const result = results[index];
                const isActive = activeIndex === index;
                return (
                  <div
                    key={`${step.title}-${index}`}
                    className={cn(
                      "rounded-lg border bg-card p-4 transition-all",
                      isActive ? "border-primary ring-1 ring-primary/40" : "border-border",
                      result ? "" : "opacity-90",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <meta.icon className="size-3.5 text-muted-foreground" />
                          <p className="text-sm font-medium">{step.title}</p>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{step.why}</p>
                        <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-surface/60 p-2 font-mono text-[11px] text-foreground">
                          {actionLine(step.action) || "—"}
                        </pre>
                        {step.action.untrusted_context ? (
                          <p className="mt-2 rounded-md border border-warning/30 bg-warning/5 p-2 text-[11px] text-muted-foreground">
                            Influenced by untrusted content: “{step.action.untrusted_context.slice(0, 240)}”
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {isActive && !result ? (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" /> asking Containment
                          </span>
                        ) : result ? (
                          <>
                            <VerdictBadge verdict={result.verdict} />
                            <RiskMeter score={result.risk_score} />
                          </>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            queued
                          </span>
                        )}
                      </div>
                    </div>

                    {result ? (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">{result.summary}</p>
                        {result.findings.length ? (
                          <button
                            type="button"
                            className="mt-2 flex items-center gap-1 text-xs text-primary"
                            onClick={() => setOpen(open === index ? null : index)}
                          >
                            <ChevronDown className={cn("size-3.5 transition-transform", open === index && "rotate-180")} />
                            {result.findings.length} rule{result.findings.length === 1 ? "" : "s"} fired
                          </button>
                        ) : null}
                        {open === index ? (
                          <ul className="mt-2 space-y-2">
                            {result.findings.map((finding) => (
                              <li key={finding.rule} className="rounded-md border border-border bg-surface/40 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-medium">{finding.title}</p>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {finding.rule} · +{finding.score}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground">{finding.detail}</p>
                                {finding.evidence ? (
                                  <p className="mt-1 font-mono text-[10px] text-destructive">{finding.evidence}</p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
