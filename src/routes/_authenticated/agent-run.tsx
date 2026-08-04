import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/guard/app-shell";
import { GettingStarted } from "@/components/guard/getting-started";
import { AgentRun } from "@/components/guard/agent-run";

export const Route = createFileRoute("/_authenticated/agent-run")({
  head: () => ({
    meta: [
      { title: "Live agent run — Containment" },
      {
        name: "description",
        content:
          "Ingest a public GitHub repo, let an AI agent plan its real actions, and watch Containment allow, gate or block each one live.",
      },
      { property: "og:title", content: "Live agent run — Containment" },
      {
        property: "og:description",
        content: "Watch an AI agent act on a real repository while Containment rules on every action.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentRunPage,
});

function AgentRunPage() {
  return (
    <AppShell>
      <GettingStarted />
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Live agent run</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A real agent, a real repository, real verdicts — every action it wants to take is checked here first.
        </p>
      </header>
      <AgentRun />
    </AppShell>
  );
}
