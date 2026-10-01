import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldHalf,
  LayoutDashboard,
  KeyRound,

  LogOut,
  PlayCircle,
  Lock,
  History,
  Boxes,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFlowProgress, type StageKey } from "@/lib/flow";
import { WelcomeTour } from "@/components/guard/welcome-tour";
import { ContainmentShield } from "@/components/brand/containment-shield";

const ICONS: Record<StageKey, typeof KeyRound> = {
  setup: KeyRound,
  live_run: PlayCircle,
  audit: LayoutDashboard,
};

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { stages, pendingApprovals } = useFlowProgress();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <WelcomeTour />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
          <Link to="/" className="flex items-center gap-2">
            <ContainmentShield size={20} variant="logo" />
            <span className="font-semibold tracking-tight">Containment</span>
          </Link>
          <nav className="flex items-center gap-1">
            {stages.map((stage) => {
              const Icon = ICONS[stage.key];
              const active = pathname.startsWith(stage.to);
              const badge =
                stage.key === "audit" && pendingApprovals > 0 ? (
                  <span className="ml-1 rounded-full bg-warning/20 px-1.5 font-mono text-[10px] text-warning">
                    {pendingApprovals}
                  </span>
                ) : null;

              if (!stage.unlocked) {
                return (
                  <button
                    key={stage.key}
                    type="button"
                    title={stage.lockedHint}
                    onClick={() => toast.info(stage.lockedHint)}
                    className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground/50"
                  >
                    <Lock className="size-3.5" />
                    <span className="font-mono text-[11px]">{stage.step}</span>
                    <span className="hidden sm:inline">{stage.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={stage.key}
                  to={stage.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="font-mono text-[11px]">{stage.step}</span>
                  <span className="hidden sm:inline">{stage.label}</span>
                  {badge}
                </Link>
              );
            })}
            <Link
              to="/history"
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith("/history")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <History className="size-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
            <Link
              to="/sandbox"
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith("/sandbox")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Boxes className="size-4 text-primary" />
              <span className="hidden sm:inline">K8s Sandbox</span>
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Workspace
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
