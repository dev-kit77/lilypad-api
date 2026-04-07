function apiBase(): string {
  return (process.env.TEST_API_BASE ?? "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  );
}

/** e.g. `/user` -> `{TEST_API_BASE}/api/user` */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${apiBase()}/api${p}`;
}

export interface AuthSession {
  cookie: string;
  userId: string;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<AuthSession> {
  const res = await fetch(apiUrl("/auth/sign-up/email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-up failed (${res.status}): ${text}`);
  }

  const cookie = res.headers.get("set-cookie") ?? "";
  const body = (await res.json()) as { user: { id: string } };
  return { cookie, userId: body.user.id };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch(apiUrl("/auth/sign-in/email"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-in failed (${res.status}): ${text}`);
  }

  const cookie = res.headers.get("set-cookie") ?? "";
  const body = (await res.json()) as { user: { id: string } };
  return { cookie, userId: body.user.id };
}

/** Authenticated `fetch` to `/api/...` */
export function authedFetch(
  path: string,
  cookie: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Cookie", cookie);
  return fetch(apiUrl(path), { ...init, headers });
}

/** Deletes the signed-in user via DELETE /api/user (same DB path as the running API). */
export async function deleteCurrentUser(cookie: string): Promise<void> {
  const res = await authedFetch("/user", cookie, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    console.warn(`[test] DELETE /api/user failed: ${res.status}`);
  }
}

/**
 * Promotes a user to admin via POST /api/test/promote-admin (runs in the API process).
 * Requires TEST_ADMIN_PROMOTE_SECRET on both the server and the test runner (see test/setup.ts).
 */
export async function promoteUserToAdminForTest(userId: string): Promise<void> {
  const secret = process.env.TEST_ADMIN_PROMOTE_SECRET?.trim();
  if (!secret) {
    throw new Error("TEST_ADMIN_PROMOTE_SECRET is not set");
  }
  const res = await fetch(apiUrl("/test/promote-admin"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-test-secret": secret,
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `promote-admin failed (${res.status}): ${text}. ` +
        "Rebuild/restart the API so it includes POST /api/test/promote-admin and TEST_ADMIN_PROMOTE_SECRET (see Dockerfile / docker-compose).",
    );
  }
}
