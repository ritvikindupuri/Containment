export const DEFAULT_MODEL = "claude-sonnet-5-5";
export const FALLBACK_MODEL = "claude-sonnet-5";

export async function callClaude({
  system,
  prompt,
  maxTokens = 4096,
}: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("Anthropic API key is not configured. Please add ANTHROPIC_API_KEY to your .env file.");
  }

  const model = process.env["ANTHROPIC_MODEL"] || DEFAULT_MODEL;

  async function request(targetModel: string) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: "user", content: prompt }],
      }),
    });
  }

  let res = await request(model);

  // If 3.7 is not yet enabled on the key's account tier, automatically fallback to 3.5 Sonnet
  if (res.status === 404 && model === DEFAULT_MODEL) {
    res = await request(FALLBACK_MODEL);
  }

  if (!res.ok) {
    const errorText = await res.text();
    let detail = errorText;
    try {
      const errJson = JSON.parse(errorText) as { error?: { message?: string } };
      detail = errJson.error?.message || errorText;
    } catch {
      // ignore
    }
    throw new Error(`Claude AI error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  return text;
}

export function extractJson<T = unknown>(raw: string): T {
  let cleaned = raw.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }
  return JSON.parse(cleaned) as T;
}
