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
  ingested_at: string;
};

const KEY = "containment.repo-session.v1";
const EVENT = "containment:repo-session";

function read(): RepoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RepoSession;
    return parsed?.plan?.repo ? parsed : null;
  } catch {
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

  useEffect(() => {
    setSession(read());
    const sync = () => setSession(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const start = useCallback((plan: AgentRunPlan) => {
    write({
      plan,
      policy_approved: false,
      policy_version: null,
      examples_run: 0,
      ingested_at: new Date().toISOString(),
    });
  }, []);

  const update = useCallback((patch: Partial<Omit<RepoSession, "plan">>) => {
    const current = read();
    if (!current) return;
    write({ ...current, ...patch });
  }, []);

  const clear = useCallback(() => write(null), []);

  return { session, start, update, clear };
}
