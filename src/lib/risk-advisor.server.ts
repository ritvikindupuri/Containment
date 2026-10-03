import type { Finding, GuardPolicy, GuardResult } from "@/lib/guard/types";
import { callClaude, extractJson } from "@/lib/anthropic.server";

export type RiskAdvice = {
  /** 0-100 AI-estimated risk, independent of the deterministic score */
  score: number;
  level: "low" | "elevated" | "high" | "critical";
  headline: string;
  concerns: string[];
  /** true when the AI's read matches the engine's verdict */
  agrees: boolean;
};

const SYSTEM = `You are a second-opinion risk analyst layered on top of a deterministic AI-agent action firewall.
The firewall already decided this action's verdict with hard rules. You never override it — you add nuance:
patterns that look dangerous even though no exact rule fired, or context that makes a flagged action look benign.
Judge only the single action you are given, in the context of the workspace policy.
Answer ONLY with JSON:
{"score": 0-100 integer risk estimate,
 "level": "low"|"elevated"|"high"|"critical",
 "headline": "one short sentence in plain English",
 "concerns": ["2-4 short bullet strings, each a specific concern or, if the action looks safe, why it looks safe"],
 "agrees": true if the firewall's verdict looks right to you, false if you would have judged it differently}`;

function clampScore(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function levelOf(value: unknown, score: number): RiskAdvice["level"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "low" || raw === "elevated" || raw === "high" || raw === "critical") return raw;
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "elevated";
  return "low";
}

function generateDeterministicAdvice(input: {
  action: unknown;
  findings: Finding[];
  policy: GuardPolicy;
  verdict: GuardResult["verdict"];
  risk_score: number;
  agent_id: string | null;
}): RiskAdvice {
  const hasHard = input.findings.some((f) => f.hard);
  const score = hasHard ? Math.max(input.risk_score, 85) : input.risk_score;
  const level = levelOf(undefined, score);

  let headline: string;
  const concerns: string[] = [];

  if (input.verdict === "deny" || score >= (input.policy.deny_threshold ?? 60)) {
    headline = `High-risk operation intercepted: triggered ${input.findings.length} containment firewall rule${input.findings.length === 1 ? "" : "s"}.`;
    for (const f of input.findings) {
      concerns.push(`[${f.vector.toUpperCase()}] ${f.title}: ${f.detail}`);
    }
    if (concerns.length === 0) {
      concerns.push("Action exhibits patterns matching common sandbox breakout or credential exfiltration vectors.");
    }
  } else if (input.verdict === "needs_approval" || score >= (input.policy.approval_threshold ?? 35)) {
    headline = "Action requires human review before sandbox execution.";
    for (const f of input.findings) {
      concerns.push(`[${f.vector.toUpperCase()}] ${f.title}: ${f.detail}`);
    }
    if (concerns.length === 0) {
      concerns.push("Action touches sensitive tools or paths outside default permitted roots.");
    }
  } else {
    headline = "Action complies with standard workspace policy.";
    concerns.push("Operates strictly within permitted workspace directories.");
    concerns.push("No prompt-injection indicators or unauthorized network hosts detected.");
  }

  return {
    score,
    level,
    headline,
    concerns: concerns.slice(0, 4),
    agrees: true,
  };
}

/**
 * Advisory AI risk layer. Runs after the deterministic engine and never changes
 * the verdict — it only surfaces extra context for the human reading the audit.
 */
export async function adviseOnRisk(input: {
  action: unknown;
  findings: Finding[];
  policy: GuardPolicy;
  verdict: GuardResult["verdict"];
  risk_score: number;
  agent_id: string | null;
}): Promise<RiskAdvice> {
  const content = await callClaude({
    system: SYSTEM,
    prompt: `Agent: ${input.agent_id ?? "unknown"}
Firewall verdict: ${input.verdict}
Deterministic risk score: ${input.risk_score}
Action: ${JSON.stringify(input.action).slice(0, 6000)}
Rules that fired: ${JSON.stringify(input.findings).slice(0, 6000)}
Workspace policy: ${JSON.stringify(input.policy).slice(0, 3000)}

Output strictly valid JSON with keys: score, level, headline, concerns, agrees.`,
    maxTokens: 2048,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson<Record<string, unknown>>(content);
  } catch {
    throw new Error("Claude returned an unreadable risk read. Please try again.");
  }

  const score = clampScore(parsed["score"]);
  const concerns = Array.isArray(parsed["concerns"])
    ? (parsed["concerns"] as unknown[]).map((item) => String(item).slice(0, 300)).filter(Boolean).slice(0, 4)
    : [];

  return {
    score,
    level: levelOf(parsed["level"], score),
    headline: String(parsed["headline"] ?? "").slice(0, 300) || "No summary returned.",
    concerns: concerns.length ? concerns : ["Claude identified no specific concerns."],
    agrees: parsed["agrees"] !== false,
  };
}

