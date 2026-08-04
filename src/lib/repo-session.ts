import { useCallback, useEffect, useState } from "react";
import type { AgentRunPlan } from "@/lib/agent-run.functions";

/**
 * The repo the user ingested, plus how far they have progressed through the
 * guided flow. Kept in localStorage so the console and the live-run page share
 * one sequential session.
 */
export type RepoSession = {
  id: string;
  plan: AgentRunPlan;
  policy_approved: boolean;
  policy_version: number | null;
  examples_run: number;
  live_run_done?: boolean;
  ingested_at: string;
  updated_at: string;
};

const KEY = "containment.repo-session.v1";
const HISTORY_KEY = "containment.repo-history.v1";
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

/** Every session the user has ever started, newest first. */
export function readHistory(): RepoSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(isUsable).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  } catch {
    window.localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

function writeHistory(sessions: RepoSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, 25)));
}

function write(session: RepoSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(KEY, JSON.stringify(session));
    // Keep the history copy of this session in step with its progress.
    writeHistory([session, ...readHistory().filter((entry) => entry.id !== session.id)]);
  } else {
    window.localStorage.removeItem(KEY);
  }
  window.dispatchEvent(new Event(EVENT));
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function useRepoSession() {
  const [session, setSession] = useState<RepoSession | null>(null);
  const [history, setHistory] = useState<RepoSession[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(read());
      setHistory(readHistory());
    };
    sync();
    setLoaded(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const start = useCallback((plan: AgentRunPlan) => {
    const draft = {
      id: `s_${Date.now().toString(36)}`,
      plan,
      policy_approved: false,
      policy_version: null,
      examples_run: 0,
      live_run_done: false,
      ingested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!isUsable(draft)) {
      throw new Error("That plan came back incomplete — try ingesting the repository again.");
    }
    write(draft);
  }, []);

  const update = useCallback((patch: Partial<Omit<RepoSession, "plan" | "id">>) => {
    const current = read();
    if (!current) return;
    write({ ...current, ...patch, updated_at: new Date().toISOString() });
  }, []);

  /** Put the current session away without losing it — it stays in history. */
  const clear = useCallback(() => write(null), []);

  /** Reload an archived session, with every setting and step it had. */
  const restore = useCallback((id: string) => {
    const entry = readHistory().find((item) => item.id === id);
    if (!entry) return;
    write(entry);
  }, []);

  const remove = useCallback((id: string) => {
    writeHistory(readHistory().filter((entry) => entry.id !== id));
    if (read()?.id === id && typeof window !== "undefined") window.localStorage.removeItem(KEY);
    notify();
  }, []);

  /** Full wipe: current session and every archived one. */
  const wipe = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(HISTORY_KEY);
    notify();
  }, []);

  return { session, history, loaded, start, update, clear, restore, remove, wipe };
}
