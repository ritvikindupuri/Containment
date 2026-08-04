import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { History as HistoryIcon, RotateCcw, Trash2, GitBranch, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/guard/app-shell";
import { Button } from "@/components/ui/button";
import { useRepoSession, type RepoSession } from "@/lib/repo-session";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Session history — Containment" },
      {
        name: "description",
        content: "Reload a previous Containment session with its repository, policy and progress, or delete everything.",
      },
      { property: "og:title", content: "Session history — Containment" },
      { property: "og:description", content: "Reload or delete saved agent containment sessions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function progressLabel(entry: RepoSession) {
  if (entry.live_run_done) return "Live run finished";
  if (entry.examples_run > 0) return `${entry.examples_run} suggested action${entry.examples_run === 1 ? "" : "s"} run`;
  if (entry.policy_approved) return "Policy approved";
  return "Repository ingested";
}

function HistoryPage() {
  const navigate = useNavigate();
  const { session, history, loaded, clear, restore, remove, wipe } = useRepoSession();
  const [confirmWipe, setConfirmWipe] = useState(false);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="label-mono">History</span>
          <h1 className="mt-2 text-3xl font-semibold">Your sessions</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Each session is one repository plus everything configured for it — the suggested policy, the actions you ran
            and how far through the four steps you got. Reload one to pick up exactly where you left off, or clear
            everything and start fresh.
          </p>
        </div>
        <div className="flex gap-2">
          {session ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clear();
                toast.success("Current session closed — it is still saved in history.");
              }}
            >
              <RotateCcw className="size-4" />
              Close current session
            </Button>
          ) : null}
          <Button
            variant={confirmWipe ? "destructive" : "outline"}
            size="sm"
            onClick={() => {
              if (!confirmWipe) {
                setConfirmWipe(true);
                return;
              }
              wipe();
              setConfirmWipe(false);
              toast.success("Everything cleared. Start again from step 1.");
              navigate({ to: "/console" });
            }}
          >
            <Trash2 className="size-4" />
            {confirmWipe ? "Yes, delete everything" : "Clear all sessions"}
          </Button>
        </div>
      </div>

      {confirmWipe ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          This deletes every saved session and resets the guided flow back to step 1. Your audit trail and policy
          versions in the backend are kept.
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : history.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <HistoryIcon className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No sessions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingest a repository in step 1 and it will be saved here automatically.
            </p>
            <Button className="mt-4" size="sm" onClick={() => navigate({ to: "/console" })}>
              Open setup
            </Button>
          </div>
        ) : (
          history.map((entry) => {
            const current = session?.id === entry.id;
            return (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <GitBranch className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.plan.repo.owner}/{entry.plan.repo.repo}
                    {current ? (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] text-primary">
                        current
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {progressLabel(entry)} · {entry.plan.steps.length} planned actions ·{" "}
                    {entry.plan.examples.length} suggested tests
                    {entry.policy_version ? ` · policy version ${entry.policy_version}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                    started {new Date(entry.ingested_at).toLocaleString()} · last used{" "}
                    {new Date(entry.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={current ? "outline" : "default"}
                    onClick={() => {
                      restore(entry.id);
                      toast.success(`Loaded ${entry.plan.repo.owner}/${entry.plan.repo.repo}`);
                      navigate({ to: "/console" });
                    }}
                  >
                    <RotateCcw className="size-4" />
                    {current ? "Reopen" : "Load session"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      remove(entry.id);
                      toast.success("Session deleted.");
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
