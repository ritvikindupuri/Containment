// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
// Includes resilient fallback to local database when Supabase is offline.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
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

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env["SUPABASE_URL"];
  const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  const isDeadHost =
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    SUPABASE_URL.includes("iobmcnjzlechdqqzvdbo") ||
    SUPABASE_URL.includes("containment-local");

  if (isDeadHost) {
    return localDb as any;
  }

  const raw = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SERVICE_ROLE_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return new Proxy(raw, {
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

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
