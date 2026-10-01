import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveDiagram } from "@/components/landing/live-diagram";
import { ContainmentShield } from "@/components/brand/containment-shield";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Containment — Deterministic Security for Autonomous AI" },
      {
        name: "description",
        content:
          "Containment is an action firewall and isolated container sandbox that intercepts every command, file path, request and tool call before execution.",
      },
      { property: "og:title", content: "Containment — Deterministic Security for Autonomous AI" },
      {
        property: "og:description",
        content: "Policy-enforced allow, hold, and deny decisions for every action your autonomous agents propose.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20 selection:text-white">
      {/* Sleek Minimalist Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-black/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <ContainmentShield size={22} variant="logo" />
            <span className="font-medium text-sm tracking-tight text-white">Containment</span>
          </Link>

          <div className="ml-auto flex items-center">
            <Button
              asChild
              size="sm"
              className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium text-xs px-4 h-8 transition-all"
            >
              <Link to="/console">
                Open App <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section: OpenAI Aesthetic — Clean, Spacious, Confident */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Soft atmospheric ambient glow */}
        <div className="pointer-events-none absolute inset-0 -top-40 flex items-center justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <h1 className="text-4xl font-normal tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.06]">
              Deterministic safety for autonomous AI.
            </h1>

            <p className="max-w-lg text-base text-zinc-400 sm:text-lg font-normal leading-relaxed">
              An action firewall and hardened container sandbox that intercepts every command, file access, and network packet before execution.
            </p>

            <div className="pt-2">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium px-7 h-11 text-sm transition-all shadow-lg hover:shadow-white/10"
              >
                <Link to="/console">
                  Open Application <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero Visual: Escaping Agent Brand Mark */}
          <div className="flex justify-center lg:justify-end overflow-visible">
            <div className="w-64 sm:w-72 lg:w-80 transition-transform duration-500 hover:scale-105 overflow-visible">
              <ContainmentShield variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Action Firewall Section */}
      <section className="border-t border-white/[0.08] bg-zinc-950/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center space-y-3 mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-primary">Interactive Demo</p>
            <h2 className="text-2xl font-normal tracking-tight sm:text-4xl text-white">
              Watch dangerous actions get intercepted in real time.
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto">
              Simulate agent actions to see how Containment classifies safe developer commands versus sandbox breakout attempts.
            </p>
          </div>

          <LiveDiagram />
        </div>
      </section>

      {/* Minimalist SDK Integration Preview */}
      <section className="border-t border-white/[0.08] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-primary">Integration</p>
          <h2 className="mt-3 text-2xl font-normal tracking-tight sm:text-4xl text-white">
            One call before your agent runs any tool
          </h2>
          <p className="mt-3 text-sm text-zinc-400 max-w-md mx-auto">
            Drop Containment in front of LangChain, AutoGen, CrewAI, or raw LLM function calling to block malicious escapes.
          </p>

          <div className="mt-8 text-left rounded-2xl border border-white/[0.08] bg-zinc-950 p-6 font-mono text-xs shadow-2xl overflow-x-auto">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/[0.06] text-zinc-500">
              <span className="size-2 rounded-full bg-zinc-700"></span>
              <span className="size-2 rounded-full bg-zinc-700"></span>
              <span className="size-2 rounded-full bg-zinc-700"></span>
              <span className="ml-2 text-[11px] text-zinc-400">agent-guard-integration.ts</span>
            </div>
            <pre className="text-zinc-300 leading-relaxed">
              <code>
                <span className="text-purple-400">import</span> &#123; guard &#125; <span className="text-purple-400">from</span> <span className="text-emerald-300">"@containment/sdk"</span>;{"\n\n"}
                <span className="text-zinc-500">// Intercept proposed tool calls before pod execution</span>{"\n"}
                <span className="text-purple-400">const</span> verdict = <span className="text-purple-400">await</span> guard.intercept(agentToolCall);{"\n\n"}
                <span className="text-purple-400">if</span> (verdict.decision === <span className="text-emerald-300">"ALLOW"</span>) &#123;{"\n"}
                {"  "}<span className="text-purple-400">await</span> executeInSandbox(agentToolCall);{"\n"}
                &#125; <span className="text-purple-400">else</span> &#123;{"\n"}
                {"  "}console.warn(<span className="text-amber-300">`Action intercepted: $&#123;verdict.reason&#125;`</span>);{"\n"}
                &#125;
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Bottom Minimalist Call to Action */}
      <section className="border-t border-white/[0.08] bg-zinc-950/60 py-24 text-center">
        <div className="mx-auto max-w-xl px-6 space-y-4">
          <h2 className="text-3xl font-normal text-white sm:text-4xl tracking-tight">
            Run autonomous agents with confidence.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Start guarding actions and testing escape prevention in under two minutes.
          </p>
          <div className="pt-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-white text-black hover:bg-zinc-200 font-medium px-8 h-11 text-sm transition-all shadow-lg"
            >
              <Link to="/console">
                Open Application <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-white/[0.08] bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5 text-zinc-400 font-medium">
            <ContainmentShield size={16} variant="logo" />
            <span>Containment</span>
          </div>
          <p className="font-mono text-[11px]">Action-level containment for autonomous agents</p>
        </div>
      </footer>
    </div>
  );
}
