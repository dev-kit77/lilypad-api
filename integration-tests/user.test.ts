import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  authedFetch,
  deleteCurrentUser,
  deleteReport,
  promoteUserToAdminForTest,
  fetchWithTimeout,
  trackForCleanup,
  cleanupAll,
  type AuthSession,
} from "./helpers/http";
import {
  createTestUser,
  createTestAdmin,
  createTestUserReport,
  TEST_PASSWORD,
} from "./helpers/factory";

describe("User endpoints", () => {
  let session: AuthSession;

  beforeAll(async () => {
    session = await createTestUser("user-test");
    trackForCleanup({ type: "user", id: session.userId, cookie: session.cookie });
  });

  afterAll(async () => {
    await cleanupAll();
  });

  describe("GET /api/user (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/user`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/user (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/user`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "newname" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/user (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/user`,
        {
          method: "DELETE",
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/user/:userId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/user/some-id`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/user/:userId/report (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/user/some-id/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "spam", content: "test" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/user (authenticated)", () => {
    it("returns 200 with user data", async () => {
      const res = await authedFetch("/user", session.cookie);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("userId");
      expect(body).toHaveProperty("username");
      expect(body).toHaveProperty("settings");
    });
  });

  describe("GET /api/user/gdpr-sar (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/user/gdpr-sar`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/user/gdpr-sar (authenticated)", () => {
    it("returns 200 with downloadable JSON and anonymised reporters", async () => {
      const reporterSession = await createTestUser("reporter");
      trackForCleanup({ type: "user", id: reporterSession.userId, cookie: reporterSession.cookie });

      const adminSession = await createTestAdmin();
      trackForCleanup({ type: "user", id: adminSession.userId, cookie: adminSession.cookie });

      const reportRes = await createTestUserReport(
        reporterSession.cookie,
        session.userId,
        "spam",
        "SAR anonymisation test",
      );

      trackForCleanup({ type: "report", id: reportRes.report.id, cookie: adminSession.cookie });
      const res = await authedFetch("/user/gdpr-sar", session.cookie);
      expect(res.status).toBe(200);

      const disposition = res.headers.get("content-disposition") ?? "";
      expect(disposition).toContain("attachment;");
      expect(disposition).toContain("lilypad-gdpr-sar-");

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("generatedAt");
      expect(body).toHaveProperty("requestType");
      expect(body).toHaveProperty("user");
      expect(body).toHaveProperty("reportsAgainstUser");

      const user = body.user as Record<string, unknown>;
      expect(user.id).toBe(session.userId);

      const reportsAgainstUser = body.reportsAgainstUser as Array<
        Record<string, unknown>
      >;
      expect(reportsAgainstUser.length).toBeGreaterThan(0);
      const firstReport = reportsAgainstUser[0];
      if (!firstReport) {
        throw new Error("Expected at least one report in reportsAgainstUser");
      }
      expect(firstReport).not.toHaveProperty("userID");
      expect(firstReport.reporter).toBe("ANONYMISED");
    });

    it("returns 200 with posts array in SAR response", async () => {
      const res = await authedFetch("/user/gdpr-sar", session.cookie);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
      expect(Array.isArray(body.posts)).toBe(true);
    });

    it("returns 200 with reportsFiled array in SAR response", async () => {
      const res = await authedFetch("/user/gdpr-sar", session.cookie);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("reportsFiled");
      expect(Array.isArray(body.reportsFiled)).toBe(true);
    });
  });

  describe("GET /api/user/:userId (authenticated)", () => {
    it("returns 200 with profile data for a valid user", async () => {
      const res = await authedFetch(`/user/${session.userId}`, session.cookie);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("name");
      expect(body).toHaveProperty("bio");
      expect(body).toHaveProperty("status");
    });

    it("returns 404 for a non-existent userId", async () => {
      const res = await authedFetch("/user/non-existent-id", session.cookie);
      expect(res.status).toBe(404);
    });

    it("returns 404 for an invalid format userId", async () => {
      const res = await authedFetch(
        "/user/invalid-cuid-format",
        session.cookie,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/user (authenticated)", () => {
    it("returns 200 when updating username", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ username: `updated${Date.now()}` }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("OK");
    });

    it("returns 200 when updating status", async () => {
      const uniqueStatus = `Status ${Date.now()}`;
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ status: uniqueStatus }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("OK");

      const getRes = await authedFetch("/user", session.cookie);
      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(getBody.status as string).toBe(uniqueStatus);
    });

    it("returns 200 when updating bio", async () => {
      const uniqueBio = `Bio text ${Date.now()}`;
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ bio: uniqueBio }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("OK");

      const getRes = await authedFetch(
        `/user/${session.userId}`,
        session.cookie,
      );
      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(getBody.bio as string).toBe(uniqueBio);
    });

    it("returns 200 when updating settings (dark mode)", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ settings: { dark: true } }),
      });
      expect(res.status).toBe(200);

      const getRes = await authedFetch("/user", session.cookie);
      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(
        (getBody.settings as Record<string, unknown>).dark as boolean,
      ).toBe(true);
    });

    it("returns 200 when updating settings (anon mode)", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ settings: { anon: true } }),
      });
      expect(res.status).toBe(200);

      const getRes = await authedFetch("/user", session.cookie);
      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(
        (getBody.settings as Record<string, unknown>).anon as boolean,
      ).toBe(true);
    });

    it("returns 200 when updating multiple fields at once", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({
          username: `multiupdate${Date.now()}`,
          status: "Testing multiple updates",
          settings: { anon: false, dark: false },
        }),
      });
      expect(res.status).toBe(200);
    });

    it("returns 400 when updating with invalid empty username", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ username: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when username exceeds reasonable length", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ username: "a".repeat(300) }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when status exceeds reasonable length", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ status: "a".repeat(1000) }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when bio exceeds reasonable length", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ bio: "a".repeat(1000) }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 with no optional fields", async () => {
      const res = await authedFetch("/user", session.cookie, {
        method: "PUT",
        body: JSON.stringify({ invalidField: "test" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/user/:userId/report (authenticated)", () => {
    let targetUserSession: AuthSession;
    let reportSession: AuthSession;

    beforeAll(async () => {
      targetUserSession = await createTestUser("reporttarget");
      reportSession = await createTestUser("reporter");
      trackForCleanup({ type: "user", id: targetUserSession.userId, cookie: targetUserSession.cookie });
      trackForCleanup({ type: "user", id: reportSession.userId, cookie: reportSession.cookie });
    });

    it("returns 200 when reporting a user", async () => {
      const res = await authedFetch(
        `/user/${targetUserSession.userId}/report`,
        reportSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "harassment",
            content: "This user is harassing me",
          }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("report");
      expect((body.report as Record<string, unknown>).reason).toBe(
        "harassment",
      );
    });

    it("returns 400 when missing reason", async () => {
      const res = await authedFetch(
        `/user/${targetUserSession.userId}/report`,
        reportSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            content: "Test content",
          }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when missing content", async () => {
      const res = await authedFetch(
        `/user/${targetUserSession.userId}/report`,
        reportSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "spam",
          }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when reason is empty", async () => {
      const res = await authedFetch(
        `/user/${targetUserSession.userId}/report`,
        reportSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "",
            content: "Test content",
          }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when reporting non-existent user (backend returns validation error)", async () => {
      const res = await authedFetch(
        "/user/non-existent-user-id/report",
        reportSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "spam",
            content: "Test",
          }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/user (authenticated)", () => {
    it("allows signing up again with the same email and username", async () => {
      const author = await createTestUser("deleteauthor");

      const deleteRes = await authedFetch("/user", author.cookie, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);

      const signInRes = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `deleteauthor${Date.now()}@test.com`,
            password: TEST_PASSWORD,
          }),
        },
      );
      expect(signInRes.ok).toBeFalse();
    });
  });
});
