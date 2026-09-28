import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitConfig = {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfter: number };

/**
 * Rate limiter using Supabase as the backing store.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / config.windowMs) * config.windowMs);

  try {
    // Try to increment existing counter
    const { data: existing, error: selectError } = await supabase
      .from("rate_limits")
      .select("counter, window_start")
      .eq("key", key)
      .eq("window_start", windowStart.toISOString())
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      // Error but not "not found" - fail open for availability
      console.error("Rate limit check error:", selectError);
      return { allowed: true };
    }

    if (existing) {
      // Record exists, check if we're over limit
      if (existing.counter >= config.maxRequests) {
        const windowEnd = new Date(windowStart.getTime() + config.windowMs);
        const retryAfter = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000);
        return { allowed: false, retryAfter };
      }

      // Increment counter
      await supabase
        .from("rate_limits")
        .update({ counter: existing.counter + 1 })
        .eq("key", key)
        .eq("window_start", windowStart.toISOString());

      return { allowed: true };
    } else {
      // First request in this window
      await supabase.from("rate_limits").insert({
        key,
        window_start: windowStart.toISOString(),
        counter: 1,
      });

      return { allowed: true };
    }
  } catch (error) {
    // On any error, fail open for availability
    console.error("Rate limit error:", error);
    return { allowed: true };
  }
}

/**
 * Cleanup old rate limit records (older than 2 hours)
 * Call this periodically or opportunistically
 */
export async function cleanupRateLimits(supabase: SupabaseClient): Promise<void> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await supabase.from("rate_limits").delete().lt("window_start", twoHoursAgo.toISOString());
}

/**
 * Get client IP from request, handling proxies
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwarded =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip");

  if (forwarded) {
    // x-forwarded-for can be comma-separated, take first
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

/**
 * Create rate limit key for per-user limiting
 */
export function userRateLimitKey(userId: string, endpoint: string): string {
  return `user:${userId}:${endpoint}`;
}

/**
 * Create rate limit key for per-IP limiting
 */
export function ipRateLimitKey(ip: string, endpoint: string): string {
  return `ip:${ip}:${endpoint}`;
}
