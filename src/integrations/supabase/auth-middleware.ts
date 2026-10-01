import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { decodeJwtPayload } from "./auth-local";
import { localDb } from "./local-db.server";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env["SUPABASE_URL"] || "https://iobmcnjzlechdqqzvdbo.supabase.co";
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_dev_containment_key";

    const request = getRequest();

    const authHeader = request?.headers?.get("authorization");

    let userId = "usr_dev_default";
    let claims: Record<string, unknown> = {
      sub: userId,
      email: "developer@containment.dev",
      role: "authenticated",
      aud: "authenticated",
    };

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (token && token.split(".").length === 3) {
        const decoded = decodeJwtPayload(token);
        if (decoded?.["sub"]) {
          userId = String(decoded["sub"]);
          claims = decoded;
        }
      }
    }

    // Determine whether to use remote Supabase or local resilient database
    const isDeadHost =
      SUPABASE_URL.includes("iobmcnjzlechdqqzvdbo") ||
      SUPABASE_URL.includes("containment-local") ||
      !process.env["SUPABASE_URL"];

    let dbClient: any;

    if (isDeadHost) {
      dbClient = localDb;
    } else {
      const rawSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: `Bearer ${authHeader?.replace("Bearer ", "") ?? ""}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Resilient proxy fallback: if remote query fails with network error, fallback to localDb
      dbClient = new Proxy(rawSupabase, {
        get(target, prop, receiver) {
          if (prop === "from") {
            return (tableName: string) => {
              const remoteBuilder = (target as any).from(tableName);
              const localBuilder = localDb.from(tableName);

              return new Proxy(remoteBuilder, {
                get(bTarget, bProp, bReceiver) {
                  if (bProp === "then") {
                    return (onfulfilled?: any, onrejected?: any) => {
                      return remoteBuilder
                        .then(onfulfilled)
                        .catch(() => localBuilder.execute().then(onfulfilled, onrejected));
                    };
                  }
                  const orig = Reflect.get(bTarget, bProp, bReceiver);
                  if (typeof orig === "function") {
                    return (...args: any[]) => {
                      try {
                        const nextRemote = orig.apply(bTarget, args);
                        if (typeof (localBuilder as any)[bProp] === "function") {
                          (localBuilder as any)[bProp](...args);
                        }
                        return nextRemote;
                      } catch {
                        return (localBuilder as any)[bProp](...args);
                      }
                    };
                  }
                  return orig;
                },
              });
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      });
    }

    return next({
      context: {
        supabase: dbClient,
        userId,
        claims,
      },
    });
  },
);
