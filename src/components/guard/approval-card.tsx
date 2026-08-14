import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Check, Loader2, ShieldQuestion, X } from "lucide-react";
import { reviewApproval, resolveApproval, type ApprovalRow } from "@/lib/guard.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RiskMeter } from "@/components/guard/verdict-badge";
import { cn } from "@/lib/utils";
import type { Finding } from "@/lib/guard/types";
import { AiSecondOpinion } from "@/components/guard/ai-second-opinion";

function actionLine(action: unknown): string {
  if (!action || typeof action !== "object") return "—";
  const record = action as Record<string, unknown>;
  return String(record["command"] ?? record["url"] ?? record["path"] ?? record["tool"] ?? "—");
}

/**
 * One action the policy handed to a human. The user can run the AI reviewer on
 * it, then release it or hold it — that decision is stored on the audit row.
 */
export function ApprovalCard({
  row,
  onResolved,
}: {
  row: ApprovalRow;
  onResolved?: (next: ApprovalRow) => void;
}) {
  const queryClient = useQueryClient();
  const runReview = useServerFn(reviewApproval);
  const resolve = useServerFn(resolveApproval);
  const [note, setNote] = useState("");
  const [current, setCurrent] = useState(row);

  const reviewMutation = useMutation({
    mutationFn: () => runReview({ data: { id: current.id } }),
    onSuccess: (next) => setCurrent(next as ApprovalRow),
    onError: (error) => toast.error(error instanceof Error ? error.message : "The reviewer could not run"),
  });

  const resolveMutation = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      resolve({ data: { id: current.id, decision, note } }),
    onSuccess: (next) => {
      const value = next as ApprovalRow;
      setCurrent(value);
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["decisions"] });
      toast.success(value.approval_state === "approved" ? "Released — the agent may act." : "Held — the agent is blocked.");
      onResolved?.(value);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not record that decision"),
  });

  const findings = Array.isArray(current.reasons) ? (current.reasons as Finding[]) : [];
  const pending = current.approval_state === "pending";
  const approved = current.approval_state === "approved";
  const [changing, setChanging] = useState(false);
  const decideOpen = pending || changing;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        pending ? "border-warning/50 bg-warning/5" : approved ? "border-success/40" : "border-destructive/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="size-4 text-warning" />
            <p className="text-sm font-medium">
              {pending ? "Waiting for you" : approved ? "You released this" : "You held this"}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {current.action_type}
            </span>
          </div>
          <pre className="mt-2 max-w-xl overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border bg-surface/60 p-2 font-mono text-[11px]">
            {actionLine(current.action)}
          </pre>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            agent {current.agent_id ?? "unknown"} · policy v{current.policy_version ?? 1} ·{" "}
            {new Date(current.created_at).toLocaleString()}
          </p>
        </div>
        <RiskMeter score={current.risk_score} />
      </div>

      {findings.length ? (
        <ul className="mt-3 space-y-1">
          {findings.map((finding, index) => (
            <li key={`${finding.rule}-${index}`} className="text-xs text-muted-foreground">
              <span className="text-foreground">{finding.title}</span> · {finding.detail}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 rounded-md border border-border bg-surface/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Bot className="size-4 text-primary" /> AI reviewer
          </p>
          <Button size="sm" variant="outline" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
            {reviewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
            {current.reviewed_at ? "Review again" : "Ask the reviewer"}
          </Button>
        </div>
        {current.reviewed_at ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              Recommends{" "}
              <span className={current.review_recommendation === "approve" ? "text-success" : "text-destructive"}>
                {current.review_recommendation === "approve" ? "release" : "hold"}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">{current.review_reasoning}</p>
            {current.review_conditions ? (
              <p className="text-xs text-muted-foreground">Safe only if: {current.review_conditions}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the reviewer and it reads this action, the rules that fired and your policy, then recommends release or
            hold in plain English. You still make the call.
          </p>
        )}
      </div>

      <div className="mt-3">
        <AiSecondOpinion decisionId={current.id} />
      </div>

      {decideOpen ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Why? (optional, stored on the audit entry)"
            maxLength={300}
            className="max-w-sm"
          />
          <Button size="sm" onClick={() => resolveMutation.mutate("approved")} disabled={resolveMutation.isPending}>
            <Check className="size-4" /> {pending ? "Release this action" : "Change to released"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolveMutation.mutate("rejected")}
            disabled={resolveMutation.isPending}
          >
            <X className="size-4" /> {pending ? "Hold it" : "Change to held"}
          </Button>
          {changing ? (
            <Button size="sm" variant="ghost" onClick={() => setChanging(false)}>
              Keep current decision
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {approved ? "Released" : "Held"} {current.resolved_at ? new Date(current.resolved_at).toLocaleString() : ""}
            {current.resolution_note ? ` — “${current.resolution_note}”` : ""}
          </p>
          <Button size="sm" variant="outline" onClick={() => setChanging(true)}>
            <RotateCcw className="size-4" /> Change my decision
          </Button>
        </div>
      )}
    </div>
  );
}
