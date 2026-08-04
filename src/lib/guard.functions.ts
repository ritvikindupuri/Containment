import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateAction } from "@/lib/guard/engine";
import { DEFAULT_POLICY, type GuardAction, type GuardPolicy } from "@/lib/guard/types";
import { actionSchema, policyUpdateSchema } from "@/lib/guard/schemas";

type PolicyRow = {
  id: string;
  name: string;
  version: number;
  mode: "enforce" | "monitor";
  block_shell: boolean;
  block_filesystem: boolean;
  block_network: boolean;
  block_injection: boolean;
  allowed_hosts: string[];
  allowed_write_paths: string[];
  approval_required_tools: string[];
  deny_threshold: number;
  approval_threshold: number;
};

export type PolicySnapshot = {
  name: string;
  mode: "enforce" | "monitor";
  block_shell: boolean;
  block_filesystem: boolean;
  block_network: boolean;
  block_injection: boolean;
  allowed_hosts: string[];
  allowed_write_paths: string[];
  approval_required_tools: string[];
  deny_threshold: number;
  approval_threshold: number;
};

export type PolicyVersionRow = {
  id: string;
  version: number;
  note: string | null;
  created_at: string;
  snapshot: PolicySnapshot;
};

function toPolicy(row: PolicyRow): GuardPolicy {
  return {
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
}

function snapshotOf(row: PolicyRow) {
  return { name: row.name, ...toPolicy(row) };
}

type AuthedSupabase = { from: (table: string) => any };

async function recordVersion(
  supabase: AuthedSupabase,
  userId: string,
  row: PolicyRow,
  note: string,
): Promise<void> {
  await supabase.from("policy_versions").insert({
    policy_id: row.id,
    user_id: userId,
    version: row.version,
    note,
    snapshot: snapshotOf(row),
  });
}

async function ensurePolicy(supabase: AuthedSupabase, userId: string): Promise<PolicyRow> {
  const existing = await supabase
    .from("policies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data as PolicyRow;

  const created = await supabase
    .from("policies")
    .insert({
      user_id: userId,
      name: "Default agent policy",
      is_default: true,
      allowed_hosts: DEFAULT_POLICY.allowed_hosts,
      allowed_write_paths: DEFAULT_POLICY.allowed_write_paths,
      approval_required_tools: DEFAULT_POLICY.approval_required_tools,
    })
    .select("*")
    .single();
  if (created.error) throw new Error(created.error.message);
  const row = created.data as PolicyRow;
  await recordVersion(supabase, userId, row, "Initial policy created");
  return row;
}

export const getPolicy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PolicyRow> => ensurePolicy(context.supabase as AuthedSupabase, context.userId));

export const listPolicyVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PolicyVersionRow[]> => {
    const result = await context.supabase
      .from("policy_versions")
      .select("id, version, note, created_at, snapshot")
      .eq("user_id", context.userId)
      .order("version", { ascending: false })
      .limit(50);
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []) as PolicyVersionRow[];
  });

export const updatePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => policyUpdateSchema.parse(input))
  .handler(async ({ data, context }): Promise<PolicyRow> => {
    const { id, note, name, ...patch } = data;
    const current = await context.supabase
      .from("policies")
      .select("version")
      .eq("id", id)
      .eq("user_id", context.userId)
      .single();
    if (current.error) throw new Error(current.error.message);

    const nextVersion = Number(current.data.version ?? 1) + 1;
    const result = await context.supabase
      .from("policies")
      .update({ ...patch, ...(name ? { name } : {}), version: nextVersion })

      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (result.error) throw new Error(result.error.message);

    const row = result.data as PolicyRow;
    await recordVersion(
      context.supabase as AuthedSupabase,
      context.userId,
      row,
      (note ?? "").trim() || "Policy updated",
    );
    return row;
  });

export const listKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const result = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const createKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => ({ name: String(input.name ?? "").trim().slice(0, 60) || "Agent key" }))
  .handler(async ({ data, context }) => {
    const { generateApiKey, hashApiKey } = await import("@/lib/guard/keys.server");
    const policy = await ensurePolicy(context.supabase as AuthedSupabase, context.userId);

    const { key, prefix } = generateApiKey();
    const key_hash = await hashApiKey(key);

    const inserted = await context.supabase
      .from("api_keys")
      .insert({
        user_id: context.userId,
        name: data.name,
        key_prefix: prefix,
        key_hash,
        policy_id: policy.id,
      })
      .select("id, name, key_prefix, created_at")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);

    // The plaintext key is returned once and never stored.
    return { ...inserted.data, key };
  });

export const revokeKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const result = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });

export const listDecisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const result = await context.supabase
      .from("decisions")
      .select(
        "id, agent_id, source, action_type, verdict, risk_score, enforced, reasons, action, policy_version, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const evaluateFromConsole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => actionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = await ensurePolicy(supabase as AuthedSupabase, userId);
    const policy = toPolicy(row);
    const result = evaluateAction(data as GuardAction, policy);

    const logged = await supabase.from("decisions").insert({
      user_id: userId,
      policy_id: row.id,
      policy_version: row.version,
      agent_id: data.agent_id ?? "console",
      source: "console",
      action_type: result.action_type,
      verdict: result.intended_verdict,
      risk_score: result.risk_score,
      enforced: result.enforced,
      reasons: JSON.parse(JSON.stringify(result.findings)),
      action: JSON.parse(JSON.stringify(data)),
    });
    if (logged.error) throw new Error(logged.error.message);

    return {
      ...result,
      policy_version: row.version,
      policy_name: row.name,
      thresholds: { deny: row.deny_threshold, approval: row.approval_threshold },
    };
  });
