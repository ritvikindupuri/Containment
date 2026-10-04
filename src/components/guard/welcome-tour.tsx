import { useHasSession } from "@/lib/use-auth-session";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding, getOnboarding } from "@/lib/session.functions";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ContainmentShield } from "@/components/brand/containment-shield";

const DISMISSED_KEY = "containment_welcome_dismissed";

const SLIDES = [
  {
    title: "Action-Level Containment",
    body: "Containment sits between your autonomous agent and execution environment, intercepting every command, file write, and network packet in real time.",
    points: [
      "Agent requests verdict over a single HTTP endpoint",
      "Instant deterministic decision: Allow, Hold, or Deny",
      "Dangerous sandbox escapes are blocked before they run",
    ],
  },
  {
    title: "1. Repo Setup & Policy Drafting",
    body: "Point Containment at any repository. We automatically inspect its structure, draft an action-level security policy, and prepare test scenarios.",
    points: [
      "One-click policy approval or custom rule tuning",
      "Run sample actions to preview live firewall verdicts",
      "Ephemeral pod workspace configured automatically",
    ],
  },
  {
    title: "2. Live Agent Run & Telemetry",
    body: "Watch an agent execute build commands and test actions inside its sandbox jail, with real-time stdout/stderr and intercept decisions.",
    points: [
      "Visual sandbox seal: Active vs Quarantined",
      "Automatic block for reverse shells & metadata exfiltration",
      "Exportable, signed cryptographic audit reports",
    ],
  },
  {
    title: "3. Audit, Approvals & K8s Sandbox",
    body: "Review approval queues with AI risk analysis. Complete your run to unlock live in-pod Kubernetes container inspections and telemetry.",
    points: [
      "AI second opinions on high-risk borderline actions",
      "Immutable decision history with policy version stamps",
      "K8s Sandbox unlocks after completing your first agent run",
    ],
  },
];

/**
 * First-run walkthrough. Explains the product and stages.
 * Dismissible, persistent, and never hijacks navigation or blocks live runs.
 */
export function WelcomeTour() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const fetchOnboarding = useServerFn(getOnboarding);
  const markOnboarded = useServerFn(completeOnboarding);
  const hasSession = useHasSession();
  const onboarding = useQuery({
    queryKey: ["onboarding"],
    queryFn: () => fetchOnboarding(),
    staleTime: Infinity,
    enabled: hasSession === true,
  });

  useEffect(() => {
    // Only auto-open if on /console, never dismissed before, and user profile not yet marked
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "true") return;
    } catch {}

    if (pathname === "/console" && onboarding.data && !onboarding.data.onboarded_at) {
      setOpen(true);
    }
  }, [onboarding.data, pathname]);

  if (!open) return null;
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {}
    void markOnboarded();
    setOpen(false);
  }

  function finish() {
    dismiss();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Skip walkthrough"
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <ContainmentShield size={20} variant="logo" />
          <span className="label-mono">
            Welcome — {index + 1} of {SLIDES.length}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{slide.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{slide.body}</p>
        <ul className="mt-4 space-y-2">
          {slide.points.map((point) => (
            <li key={point} className="flex gap-2 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex gap-1.5">
            {SLIDES.map((item, i) => (
              <span
                key={item.title}
                className={cn("h-1.5 w-6 rounded-full", i <= index ? "bg-primary" : "bg-border")}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
              Skip
            </Button>
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={() => (last ? finish() : setIndex(index + 1))}>
              {last ? "Done" : "Next"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
