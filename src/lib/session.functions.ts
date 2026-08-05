import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sessionInput = z.object({
  local_id: z.string().min(1),
  plan: z.unknown(),
  policy_approved: z.boolean().default(false),
  policy_version: z.number().nullable().default(null),
  examples_run: z.number().default(0),
  live_run_done: z.boolean().default(false),
  ingested_at: z.string(),
});

const idInput = z.object({ local_id: z.string().min(1) });

export type FlowSessionRow = {
  local_id: string;
  plan: unknown;
  policy_approved: boolean;
  policy_version: number | null;
  examples_run: number;
  live_run_done: boolean;
  is_current: boolean;
  ingested_at: string;
  updated_at: string;
};

/** Every saved session for the signed-in account, newest first. */
export const listFlowSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flow_sessions")
      .select(
        "local_id, plan, policy_approved, policy_version, examples_run, live_run_done, is_current, ingested_at, updated_at",
      )
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FlowSessionRow[];
  });

/** Upsert a session and make it the current one for this account. */
export const saveFlowSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => sessionInput.parse(data))
  .handler(async ({ context, data }) => {
    const { error: clearError } = await context.supabase
      .from("flow_sessions")
      .update({ is_current: false })
      .eq("user_id", context.userId)
      .eq("is_current", true);
    if (clearError) throw new Error(clearError.message);

    const { error } = await context.supabase.from("flow_sessions").upsert(
      {
        user_id: context.userId,
        local_id: data.local_id,
        plan: data.plan as never,
        policy_approved: data.policy_approved,
        policy_version: data.policy_version,
        examples_run: data.examples_run,
        live_run_done: data.live_run_done,
        is_current: true,
        ingested_at: data.ingested_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,local_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Put the current session away without deleting it. */
export const closeFlowSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("flow_sessions")
      .update({ is_current: false })
      .eq("user_id", context.userId)
      .eq("is_current", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Reload an archived session with everything it had configured. */
export const restoreFlowSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("flow_sessions")
      .update({ is_current: false })
      .eq("user_id", context.userId)
      .eq("is_current", true);
    const { error } = await context.supabase
      .from("flow_sessions")
      .update({ is_current: true, updated_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("local_id", data.local_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFlowSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idInput.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("flow_sessions")
      .delete()
      .eq("user_id", context.userId)
      .eq("local_id", data.local_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const wipeFlowSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("flow_sessions")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Has this account already seen the first-run walkthrough? */
export const getOnboarding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { onboarded_at: (data?.onboarded_at as string | null) ?? null };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
