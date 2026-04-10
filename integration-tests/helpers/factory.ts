import { signUp, signIn, fetchWithTimeout, apiBase, trackForCleanup } from "./http";
import { promoteUserToAdminForTest } from "./http";
import type { AuthSession } from "./http";

export const TEST_PASSWORD = "Th1s1sS1LLY!";

export async function createTestUser(
  prefix: string = "testusr",
): Promise<AuthSession> {
  const timestamp = Date.now();
  return signUp(
    `${prefix}-${timestamp}@test.com`,
    TEST_PASSWORD,
    `${prefix}${timestamp}`,
  );
}

export async function createTrackedTestUser(
  prefix: string = "testusr",
): Promise<AuthSession> {
  const session = await createTestUser(prefix);
  trackForCleanup({ type: "user", id: session.userId, cookie: session.cookie });
  return session;
}

export async function createTestAdmin(
  prefix: string = "testadmin",
): Promise<AuthSession> {
  const timestamp = Date.now();
  const session = await signUp(
    `${prefix}-${timestamp}@test.com`,
    TEST_PASSWORD,
    `${prefix}${timestamp}`,
  );
  await promoteUserToAdminForTest(session.userId);
  return session;
}

export async function createTrackedTestAdmin(
  prefix: string = "testadmin",
): Promise<AuthSession> {
  const session = await createTestAdmin(prefix);
  trackForCleanup({ type: "user", id: session.userId, cookie: session.cookie });
  return session;
}

export async function signInTestUser(email: string): Promise<AuthSession> {
  return signIn(email, TEST_PASSWORD);
}

export async function createTestPost(cookie: string, content = "Test content") {
  const res = await fetchWithTimeout(
    `${apiBase()}/api/content/post`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        content,
        locality: {
          lat: Math.floor(Math.random() * 180 - 90),
          lon: Math.floor(Math.random() * 360 - 180),
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`createTestPost failed: ${res.status}`);
  }
  return (await res.json()) as { post: { id: string; content: string } };
}

export async function createTrackedTestPost(cookie: string, content = "Test content") {
  const result = await createTestPost(cookie, content);
  trackForCleanup({ type: "post", id: result.post.id, cookie });
  return result;
}

export async function createTestPostReport(
  cookie: string,
  postId: string,
  reason = "Test reason",
  content = "Test content",
) {
  const res = await fetchWithTimeout(
    `${apiBase()}/api/content/post/${postId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        reason,
        content,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`createTestPostReport failed: ${res.status}`);
  }
  return (await res.json()) as { report: { id: string; reason: string } };
}

export async function createTestUserReport(
  cookie: string,
  userId: string,
  reason = "Test reason",
  content = "Test content",
) {
  const res = await fetchWithTimeout(
    `${apiBase()}/api/user/${userId}/report`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        reason,
        content,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`createTestUserReport failed: ${res.status}`);
  }
  return (await res.json()) as {
    report: {
      id: string;
      userID: string;
      reason: string;
      content: string;
      time: string;
      resolved: boolean;
      action?: string;
      reportedPostID?: string;
      reportedUserID?: string;
    };
  };
}
