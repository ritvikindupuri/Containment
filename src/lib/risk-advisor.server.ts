import type { Finding, GuardPolicy, GuardResult } from "@/lib/guard/types";

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
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.6-sol",
      reasoning_effort: "none",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Agent: ${input.agent_id ?? "unknown"}
Firewall verdict: ${input.verdict}
Deterministic risk score: ${input.risk_score}
Action: ${JSON.stringify(input.action).slice(0, 6000)}
Rules that fired: ${JSON.stringify(input.findings).slice(0, 6000)}
Workspace policy: ${JSON.stringify(input.policy).slice(0, 3000)}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit reached — try the risk read again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`Risk read failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const json = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("The risk layer returned an unreadable answer. Try again.");
  }

  const score = clampScore(parsed["score"]);
  const concerns = Array.isArray(parsed["concerns"])
    ? (parsed["concerns"] as unknown[]).map((item) => String(item).slice(0, 300)).filter(Boolean).slice(0, 4)
    : [];

  return {
    score,
    level: levelOf(parsed["level"], score),
    headline: String(parsed["headline"] ?? "").slice(0, 300) || "No summary returned.",
    concerns: concerns.length ? concerns : ["The risk layer returned no specific concerns."],
    agrees: parsed["agrees"] !== false,
  };
}
