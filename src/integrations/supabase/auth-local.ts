// Resilient local auth session helper for Containment
// Provides reliable JWT creation, local storage persistence, and session management

export type LocalUser = {
  id: string;
  aud: string;
  role: string;
  email?: string | undefined;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  created_at: string;
};

export type LocalSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: LocalUser;
};

const LOCAL_STORAGE_KEY = "containment_local_auth_session";

function base64UrlEncode(str: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(str).toString("base64url");
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  if (typeof atob !== "undefined") {
    return atob(base64);
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export function createLocalJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = base64UrlEncode("containment-local-secret-key");
  return `${header}.${body}.${sig}`;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    const part = parts[1];
    if (!part) return null;
    return JSON.parse(base64UrlDecode(part));
  } catch {
    return null;
  }
}

export function createLocalSession(email: string, metadata?: Record<string, unknown>): LocalSession {
  const cleanEmail = (email || "user@containment.dev").trim().toLowerCase();
  const hash = Array.from(cleanEmail).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0);
  const userId = "usr_" + Math.abs(hash).toString(36) + "_local";
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 30; // 30 days validity

  const user: LocalUser = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: cleanEmail,
    app_metadata: { provider: (metadata?.["provider"] as string) ?? "email" },
    user_metadata: {
      name: (metadata?.["name"] as string) ?? cleanEmail.split("@")[0],
      ...(metadata ?? {}),
    },
    created_at: new Date().toISOString(),
  };

  const payload = {
    sub: userId,
    email: cleanEmail,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  };

  const session: LocalSession = {
    access_token: createLocalJwt(payload),
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 30,
    expires_at: exp,
    refresh_token: "ref_" + Math.random().toString(36).slice(2),
    user,
  };

  return session;
}

export function getStoredLocalSession(): LocalSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as LocalSession;
    if (session?.access_token && session?.user?.id) {
      return session;
    }
  } catch {
    // Ignore JSON errors
  }
  return null;
}

export function saveLocalSession(session: LocalSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredLocalSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
