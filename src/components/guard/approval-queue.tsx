import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldQuestion } from "lucide-react";
import { listApprovals, type ApprovalRow } from "@/lib/guard.functions";
import { ApprovalCard } from "@/components/guard/approval-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Everything the policy stopped short of blocking, waiting on a human. */
export function ApprovalQueue() {
  const fetchApprovals = useServerFn(listApprovals);
  const { data, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => fetchApprovals() as Promise<ApprovalRow[]>,
    refetchInterval: 15_000,
  });

  const rows = data ?? [];
  const pending = rows.filter((row) => row.approval_state === "pending");
  const resolved = rows.filter((row) => row.approval_state !== "pending").slice(0, 5);

  return (
    <Card className={pending.length ? "border-warning/50" : "border-border"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldQuestion className="size-4 text-warning" />
          Approval queue
          {pending.length ? (
            <span className="rounded-full bg-warning/20 px-2 font-mono text-xs text-warning">{pending.length}</span>
          ) : null}
        </CardTitle>
        <CardDescription>
          Actions your policy would not decide alone. Run the AI reviewer on one, then release it or hold it — your call
          is written onto the audit entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading the queue…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing needs approval. Actions land here when they are risky enough to pause but not to block outright.
          </p>
        ) : (
          <>
            {pending.map((row) => (
              <ApprovalCard key={row.id} row={row} />
            ))}
            {resolved.length ? (
              <div className="space-y-2 pt-2">
                <p className="label-mono">Recently resolved</p>
                {resolved.map((row) => (
                  <ApprovalCard key={row.id} row={row} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
