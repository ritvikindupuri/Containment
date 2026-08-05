import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding, getOnboarding } from "@/lib/session.functions";
import { ArrowLeft, ArrowRight, ShieldHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    title: "What Containment is",
    body: "AI agents get tricked into escaping their sandbox: running a reverse shell, reading an SSH key, posting your environment variables to a stranger's server. Containment sits in front of your agent and checks every single action it wants to take, before it happens.",
    points: [
      "Your agent asks us first, over one HTTP call.",
      "We answer in one word: allow, needs_approval or deny.",
      "Your agent only acts on allow — so an escape never executes.",
    ],
  },
  {
    title: "Step 1 — Setup, from a repository",
    body: "You do not configure anything by hand. Paste a public GitHub repo and we read its real files, then write both the security policy for that project and the exact actions worth testing against it. This guided setup happens inside Containment first.",
    points: [
      "You approve the suggested policy in one click (or edit it later).",
      "You run a suggested test action and see the verdict immediately.",
      "Only your production agent needs an agent key; the setup run does not.",
    ],
  },
  {
    title: "Step 2 — Live run, see it actually work",
    body: "An AI agent works through its whole plan for that repo — ordinary build steps mixed with realistic escape attempts — and every action goes through your policy one at a time.",
    points: [
      "A sandbox seal shows SEALED, or ESCAPE GOT THROUGH if something unsafe ran.",
      "Risky actions are blocked; borderline ones pause and wait for you.",
      "You can download a dated, print-ready PDF report of the run.",
    ],
  },
  {
    title: "Step 3 — Audit and approvals",
    body: "Everything is logged permanently. Actions that need a human wait in an approval queue where an AI reviewer explains the risk and recommends releasing or holding them. The policy itself is written and versioned by the agent, so there is no rulebook to maintain by hand.",
    points: [
      "Every decision records the policy version that ruled it.",
      "Each policy save creates a new version with your change note.",
      "Steps stay locked until the step before is finished, so you cannot get lost.",
    ],
  },
];

/**
 * First-run walkthrough. Explains the product and all three stages before the
 * user touches anything. Cannot be dismissed — only completed.
 */
export function WelcomeTour() {
  const navigate = useNavigate();
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


  // The walkthrough is tied to the ACCOUNT, so a returning user who already
  // finished setup never sees it again — on any browser or device.
  useEffect(() => {
    if (onboarding.data && !onboarding.data.onboarded_at) setOpen(true);
  }, [onboarding.data]);

  if (!open) return null;
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  function finish() {
    void markOnboarded();
    setOpen(false);
    navigate({ to: "/console" });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <ShieldHalf className="size-5 text-primary" />
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
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setIndex(index - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={() => (last ? finish() : setIndex(index + 1))}>
              {last ? "Start step 1: Setup" : "Next"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
