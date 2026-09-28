import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { evaluateAction } from "@/lib/guard/engine";
import { actionSchema } from "@/lib/guard/schemas";
import type { GuardAction, GuardPolicy } from "@/lib/guard/types";
import {
  checkRateLimit,
  getClientIp,
  userRateLimitKey,
  ipRateLimitKey,
} from "@/lib/rate-limit.server";

const isProduction = import.meta.env.VITE_SUPABASE_URL?.includes(".supabase.co") ?? false;

function getSecurityHeaders(): HeadersInit {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
    ...(isProduction
      ? {
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
        }
      : {}),
  };
}

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOriginsStr = import.meta.env.ALLOWED_ORIGINS ?? "";
  const allowedOrigins = allowedOriginsStr
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  let allowOrigin: string;

  if (isProduction) {
    // Production: fail closed if ALLOWED_ORIGINS is unset
    if (allowedOrigins.length === 0) {
      allowOrigin = "null";
    } else if (origin && allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = "null";
    }
  } else {
    // Development: allow all if unset
    if (allowedOrigins.length === 0) {
      allowOrigin = "*";
    } else if (origin && allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = "null";
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, x-guard-key",
    "Content-Type": "application/json",
    ...getSecurityHeaders(),
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(origin),
  });
}

function redactSecrets(text: string): string {
  return text
    .replace(/\b(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})\b/g, "[REDACTED_AWS_KEY]")
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, "[REDACTED_GOOGLE_KEY]")
    .replace(/\bsk-[A-Za-z0-9]{20,}\b/g, "[REDACTED_OPENAI_KEY]")
    .replace(/\bghp_[A-Za-z0-9]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]")
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED_SLACK_TOKEN]")
    .replace(/\bsb_secret_[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_SUPABASE_SECRET]")
    .replace(
      /-----BEGIN\s+(RSA|EC|OPENSSH|PGP|PRIVATE)[A-Z ]*KEY-----[\s\S]*?-----END[A-Z ]*KEY-----/g,
      "[REDACTED_PRIVATE_KEY]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
      "[REDACTED_JWT]",
    );
}

export const Route = createFileRoute("/api/public/v1/guard")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        return new Response(null, {
          status: 204,
          headers: getCorsHeaders(origin),
        });
      },
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const clientIp = getClientIp(request);

        const header =
          request.headers.get("x-guard-key") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const presented = header.trim();
        if (!presented) {
          return json(
            {
              error: "missing_key",
              message: "Send your key in the x-guard-key header.",
            },
            401,
            origin,
          );
        }

        let parsed: GuardAction;
        try {
          parsed = actionSchema.parse(await request.json()) as GuardAction;
        } catch (error) {
          return json(
            {
              error: "invalid_action",
              message: error instanceof Error ? error.message : "Invalid action payload.",
            },
            400,
            origin,
          );
        }

        const { hashApiKey } = await import("@/lib/guard/keys.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const key_hash = await hashApiKey(presented);

        const keyRow = await supabaseAdmin
          .from("api_keys")
          .select("id, user_id, policy_id, revoked_at")
          .eq("key_hash", key_hash)
          .maybeSingle();

        if (keyRow.error) {
          console.error("API key lookup error:", redactSecrets(JSON.stringify(keyRow.error)));
          return json(
            {
              error: "internal_error",
              message: "An error occurred processing your request.",
            },
            500,
            origin,
          );
        }
        if (!keyRow.data || keyRow.data.revoked_at) {
          return json({ error: "invalid_key", message: "Key is unknown or revoked." }, 401, origin);
        }

        // Rate limiting: per-user and per-IP
        const userLimit = await checkRateLimit(
          supabaseAdmin,
          userRateLimitKey(keyRow.data.user_id, "guard"),
          { windowMs: 60000, maxRequests: 100 }, // 100 req/min per user
        );

        if (!userLimit.allowed) {
          return json(
            {
              error: "rate_limit_exceeded",
              message: "Too many requests. Please try again later.",
              retry_after: userLimit.retryAfter,
            },
            429,
            origin,
          );
        }

        const ipLimit = await checkRateLimit(
          supabaseAdmin,
          ipRateLimitKey(clientIp, "guard"),
          { windowMs: 60000, maxRequests: 200 }, // 200 req/min per IP
        );

        if (!ipLimit.allowed) {
          return json(
            {
              error: "rate_limit_exceeded",
              message: "Too many requests from this IP. Please try again later.",
              retry_after: ipLimit.retryAfter,
            },
            429,
            origin,
          );
        }

        const policyQuery = supabaseAdmin
          .from("policies")
          .select("*")
          .eq("user_id", keyRow.data.user_id);
        const policyRow = keyRow.data.policy_id
          ? await policyQuery.eq("id", keyRow.data.policy_id).maybeSingle()
          : await policyQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

        if (policyRow.error) {
          console.error("Policy lookup error:", redactSecrets(JSON.stringify(policyRow.error)));
          return json(
            {
              error: "internal_error",
              message: "An error occurred processing your request.",
            },
            500,
            origin,
          );
        }
        if (!policyRow.data) {
          return json(
            {
              error: "no_policy",
              message: "No policy is configured for this key.",
            },
            409,
            origin,
          );
        }
        const row = policyRow.data;

        // Authorization check: verify the policy belongs to the key's user
        if (row.user_id !== keyRow.data.user_id) {
          console.error("Authorization violation: policy user mismatch");
          return json({ error: "forbidden", message: "Access denied." }, 403, origin);
        }

        const policy: GuardPolicy = {
          mode: row.mode,
          block_shell: row.block_shell,
          block_filesystem: row.block_filesystem,
          block_network: row.block_network,
          block_injection: row.block_injection,
          allowed_hosts: row.allowed_hosts,
          allowed_write_paths: row.allowed_write_paths,
          approval_required_tools: row.approval_required_tools,
          deny_threshold: row.deny_threshold,
          approval_threshold: row.approval_threshold,
        };

        let result;
        try {
          result = evaluateAction(parsed, policy);
        } catch (error) {
          // Fail closed: if evaluation throws, deny the action
          console.error(
            "Policy evaluation error:",
            error instanceof Error ? error.message : "Unknown error",
          );

          const insertResult = await supabaseAdmin.from("decisions").insert({
            user_id: keyRow.data.user_id,
            policy_id: row.id,
            policy_version: row.version,
            api_key_id: keyRow.data.id,
            agent_id: parsed.agent_id ?? null,
            source: "api",
            action_type: parsed.type,
            verdict: "deny",
            risk_score: 100,
            enforced: true,
            reasons: [
              {
                rule: "EVAL_ERROR",
                title: "Evaluation error",
                detail: "Policy evaluation failed",
                score: 100,
              },
            ],
            action: JSON.parse(JSON.stringify(parsed)),
            approval_state: "not_required",
          });

          if (insertResult.error) {
            console.error(
              "Failed to log evaluation error:",
              redactSecrets(JSON.stringify(insertResult.error)),
            );
          }

          return json(
            {
              verdict: "deny",
              intended_verdict: "deny",
              enforced: true,
              risk_score: 100,
              action_type: parsed.type,
              summary: "Action denied due to evaluation error.",
              findings: [
                {
                  rule: "EVAL_ERROR",
                  vector: "shell",
                  title: "Evaluation error",
                  detail: "Policy engine encountered an error",
                  score: 100,
                  hard: true,
                },
              ],
              policy_version: row.version,
            },
            200,
            origin,
          );
        }

        const insertResult = await supabaseAdmin.from("decisions").insert({
          user_id: keyRow.data.user_id,
          policy_id: row.id,
          policy_version: row.version,
          api_key_id: keyRow.data.id,
          agent_id: parsed.agent_id ?? null,
          source: "api",
          action_type: result.action_type,
          verdict: result.intended_verdict,
          risk_score: result.risk_score,
          enforced: result.enforced,
          reasons: JSON.parse(JSON.stringify(result.findings)),
          action: JSON.parse(JSON.stringify(parsed)),
          approval_state: result.verdict === "needs_approval" ? "pending" : "not_required",
        });

        if (insertResult.error) {
          console.error(
            "Failed to log decision:",
            redactSecrets(JSON.stringify(insertResult.error)),
          );
        }

        await supabaseAdmin
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", keyRow.data.id);

        return json(
          {
            verdict: result.verdict,
            intended_verdict: result.intended_verdict,
            enforced: result.enforced,
            risk_score: result.risk_score,
            action_type: result.action_type,
            summary: result.summary,
            findings: result.findings,
            policy_version: row.version,
          },
          200,
          origin,
        );
      },
    },
  },
});
