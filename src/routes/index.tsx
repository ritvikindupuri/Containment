import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TerminalSquare,
  FolderLock,
  Network,
  Bug,
  ArrowRight,
  GitBranch,
  ScrollText,
  PlugZap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveDiagram } from "@/components/landing/live-diagram";
import logoAsset from "@/assets/containment-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Containment — stop AI agent sandbox escapes" },
      {
        name: "description",
        content:
          "Containment is an action firewall for AI agents: every command, file path, request and tool call is checked against policy before it runs.",
      },
      { property: "og:title", content: "Containment — stop AI agent sandbox escapes" },
      {
        property: "og:description",
        content: "Policy-enforced allow / hold / deny decisions for every action your AI agents propose.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const VECTORS = [
  { icon: TerminalSquare, title: "Command execution", body: "Reverse shells, curl-to-bash, container escapes." },
  { icon: FolderLock, title: "Filesystem breakout", body: "Traversal, SSH keys, .env, writes outside the jail." },
  { icon: Network, title: "Network exfiltration", body: "Cloud metadata, loopback, encoded hosts, secrets in payloads." },
  { icon: Bug, title: "Prompt injection", body: "Overrides in ingested text that drive state-changing tools." },
];

const STEPS = [
  { icon: GitBranch, title: "Point it at a repo", body: "Containment reads the code and drafts the policy." },
  { icon: Shield, title: "Watch a live run", body: "A real agent run, every action judged as it happens." },
  { icon: ScrollText, title: "Review the trail", body: "Every verdict, rule and policy version, exportable as PDF." },
  { icon: PlugZap, title: "Connect production", body: "One HTTP call in front of your real agent's tools." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5">
          <div className="flex items-center gap-2">
            <img
              src={logoAsset.url}
              alt="Containment"
              width={28}
              height={40}
              className="size-7 object-contain"
            />
            <span className="font-semibold tracking-tight">Containment</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Contain my agent</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid-backdrop relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -right-24 top-10 size-[420px] animate-aura rounded-full bg-primary/12 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="animate-rise">
            <span className="label-mono">Agent containment layer</span>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.03] md:text-6xl">
              Your agent asks first.
              <span className="block text-primary">The escape never runs.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              One call before every command, file, request and tool call — answered with allow, hold or deny.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">
                  Contain my agent <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#flow">See how it works</a>
              </Button>
            </div>
          </div>

          <div className="flex justify-center" style={{ perspective: "1200px" }}>
            <img
              src={logoAsset.url}
              alt="Containment shield mark"
              width={57}
              height={81}
              className="w-52 sm:w-64 lg:w-72"
              style={{
                transform: "rotateX(55deg) rotateZ(-45deg)",
                transformStyle: "preserve-3d",
              }}
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/30">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <span className="label-mono">Live engine · not a mockup</span>
          <h2 className="mt-3 text-3xl font-semibold">Pick an action. Watch it get judged.</h2>
          <div className="mt-8">
            <LiveDiagram />
          </div>
        </div>
      </section>

      <section id="flow" className="mx-auto max-w-6xl px-5 py-20">
        <span className="label-mono">Four steps</span>
        <h2 className="mt-3 text-3xl font-semibold">From repo to production guardrails</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="group relative rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:glow-ring"
            >
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/12 text-primary transition-transform duration-300 group-hover:scale-110">
                <step.icon className="size-4.5" />
              </div>
              <span className="label-mono mt-3 block">Step {index + 1}</span>
              <p className="mt-1 font-medium">{step.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <span className="label-mono">Covered escape vectors</span>
          <h2 className="mt-3 text-3xl font-semibold">Four ways an agent leaves its box</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VECTORS.map((vector) => (
              <div
                key={vector.title}
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              >
                <vector.icon className="size-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                <p className="mt-3 font-medium">{vector.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{vector.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h2 className="text-3xl font-semibold md:text-4xl">Contain your first agent in minutes.</h2>
        <p className="mt-4 text-muted-foreground">
          Start with a repo. Leave with a policy, an audit trail and a live guard.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/auth">
            Contain my agent <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <img
              src={logoAsset.url}
              alt="Containment"
              width={20}
              height={28}
              className="size-5 object-contain"
            />
            Containment
          </div>
          <p>Action-level containment for autonomous agents.</p>
        </div>
      </footer>
    </div>
  );
}
