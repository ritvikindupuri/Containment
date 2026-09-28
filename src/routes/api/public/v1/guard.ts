import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { evaluateAction } from "@/lib/guard/engine";
import { actionSchema } from "@/lib/guard/schemas";
import type { GuardAction, GuardPolicy } from "@/lib/guard/types";

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = (import.meta.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const allowOrigin =
    allowedOrigins.length > 0 && origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins.length === 0
        ? "*"
        : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, x-guard-key",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

function json(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: getCorsHeaders(origin) });
}

export const Route = createFileRoute("/api/public/v1/guard")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
      },
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        const header =
          request.headers.get("x-guard-key") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const presented = header.trim();
        if (!presented) {
          return json(
            { error: "missing_key", message: "Send your key in the x-guard-key header." },
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

        if (keyRow.error) return json({ error: "lookup_failed" }, 500, origin);
        if (!keyRow.data || keyRow.data.revoked_at) {
          return json({ error: "invalid_key", message: "Key is unknown or revoked." }, 401, origin);
        }

        const policyQuery = supabaseAdmin
          .from("policies")
          .select("*")
          .eq("user_id", keyRow.data.user_id);
        const policyRow = keyRow.data.policy_id
          ? await policyQuery.eq("id", keyRow.data.policy_id).maybeSingle()
          : await policyQuery.order("created_at", { ascending: true }).limit(1).maybeSingle();

        if (policyRow.error || !policyRow.data) {
          return json(
            { error: "no_policy", message: "No policy is configured for this key." },
            409,
            origin,
          );
        }
        const row = policyRow.data;

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
          await supabaseAdmin.from("decisions").insert({
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

        await supabaseAdmin.from("decisions").insert({
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
