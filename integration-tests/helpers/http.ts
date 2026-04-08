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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let lastError = "";

  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        return res;
      }

      const text = await res.text();
      lastError = `${res.status}: ${text}`;

      // Retry transient auth/backend failures seen in CI startup windows.
      if (res.status >= 500 || res.status === 429) {
        await sleep(Math.min(250 * attempt, 2000));
        continue;
      }

      throw new Error(`${label} failed (${res.status}): ${text}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lastError = msg;
      if (attempt === 8) break;
      await sleep(Math.min(250 * attempt, 2000));
    }
  }

  throw new Error(`${label} failed after retries: ${lastError}`);
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<AuthSession> {
  const res = await fetchWithRetry(
    apiUrl("/auth/sign-up/email"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    },
    "Sign-up",
  );

  const cookie = res.headers.get("set-cookie") ?? "";
  const body = (await res.json()) as { user: { id: string } };
  return { cookie, userId: body.user.id };
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetchWithRetry(
    apiUrl("/auth/sign-in/email"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
    "Sign-in",
  );

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
