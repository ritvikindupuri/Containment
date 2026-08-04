import { useCallback, useEffect, useState } from "react";
import type { AgentRunPlan } from "@/lib/agent-run.functions";

/**
 * The repo the user ingested, plus how far they have progressed through the
 * guided flow. Kept in localStorage so the console and the live-run page share
 * one sequential session.
 */
export type RepoSession = {
  plan: AgentRunPlan;
  policy_approved: boolean;
  policy_version: number | null;
  examples_run: number;
  live_run_done?: boolean;
  ingested_at: string;
};

const KEY = "containment.repo-session.v1";
const EVENT = "containment:repo-session";

/**
 * A session is only usable when the stored plan still matches the shape the UI
 * renders. Anything older or truncated is discarded rather than crashing the
 * page with "plan.steps.map is not a function".
 */
function isUsable(value: unknown): value is RepoSession {
  if (!value || typeof value !== "object") return false;
  const session = value as RepoSession;
  const plan = session.plan as AgentRunPlan | undefined;
  if (!plan || typeof plan !== "object") return false;
  if (!plan.repo || typeof plan.repo !== "object" || !plan.repo.owner || !plan.repo.repo) return false;
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) return false;
  if (!Array.isArray(plan.examples)) return false;
  if (!plan.policy || typeof plan.policy !== "object") return false;
  if (!Array.isArray(plan.policy.allowed_hosts)) return false;
  return true;
}

function read(): RepoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isUsable(parsed)) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(KEY);
    return null;
  }
}

function write(session: RepoSession | null) {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useRepoSession() {
  const [session, setSession] = useState<RepoSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(read());
    setLoaded(true);
    const sync = () => setSession(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const start = useCallback((plan: AgentRunPlan) => {
    if (!isUsable({ plan } as unknown)) {
      throw new Error("That plan came back incomplete — try ingesting the repository again.");
    }
    write({
      plan,
      policy_approved: false,
      policy_version: null,
      examples_run: 0,
      live_run_done: false,
      ingested_at: new Date().toISOString(),
    });
  }, []);

  const update = useCallback((patch: Partial<Omit<RepoSession, "plan">>) => {
    const current = read();
    if (!current) return;
    write({ ...current, ...patch });
  }, []);

  const clear = useCallback(() => write(null), []);

  return { session, loaded, start, update, clear };
}
