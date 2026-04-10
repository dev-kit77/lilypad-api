import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  signUp,
  authedFetch,
  deleteCurrentUser,
  deleteReport,
  promoteUserToAdminForTest,
  type AuthSession,
} from "./helpers/http";

const TEST_PASSWORD = "password1234";

describe("User endpoints", () => {
  let session: AuthSession;

  beforeAll(async () => {
    session = await signUp(
      `user-test-${Date.now()}@test.com`,
      TEST_PASSWORD,
      `testuser${Date.now()}`,
    );
  });

  afterAll(async () => {
    if (session?.cookie) {
      await deleteCurrentUser(session.cookie);
    }
  });

  describe("GET /api/user (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${process.env.TEST_API_BASE}/api/user`);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/user (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${process.env.TEST_API_BASE}/api/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "newname" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/user (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${process.env.TEST_API_BASE}/api/user`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/user/:userId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${process.env.TEST_API_BASE}/api/user/some-id`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/user/:userId/report (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(
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

  describe("GET /api/user/gdpr-sar (authenticated)", () => {
    let reporterSession: AuthSession | null = null;
    let adminSession: AuthSession | null = null;
    let reportId: string | null = null;

    afterAll(async () => {
      if (reportId && adminSession?.cookie) {
        await deleteReport(adminSession.cookie, reportId);
      }
      if (reporterSession?.cookie) {
        await deleteCurrentUser(reporterSession.cookie);
      }
      if (adminSession?.cookie) {
        await deleteCurrentUser(adminSession.cookie);
      }
    });

    it("returns 200 with downloadable JSON and anonymised reporters", async () => {
      reporterSession = await signUp(
        `reporter-${Date.now()}@test.com`,
        TEST_PASSWORD,
        `reporter${Date.now()}`,
      );
      const adminEmail = `admin-gdpr-${Date.now()}@test.com`;
      adminSession = await signUp(
        adminEmail,
        TEST_PASSWORD,
        `admingdpr${Date.now()}`,
      );
      await promoteUserToAdminForTest(adminSession.userId);

      await authedFetch(
        `/user/${session.userId}/report`,
        reporterSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "spam",
            content: "SAR anonymisation test",
          }),
        },
      );

      const reportsRes = await authedFetch("/special", adminSession.cookie);
      const reportsBody = (await reportsRes.json()) as {
        reports: Array<{ id: string }>;
      };
      if (reportsBody.reports.length > 0) {
        reportId = reportsBody.reports[0]!.id;
      }

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
  });

  describe("DELETE /api/user (authenticated)", () => {
    it("allows signing up again with the same email and username", async () => {
      const seed = Date.now();
      const deletedEmail = `delete-author-${seed}@test.com`;
      const deletedName = `deleteauthor${seed}`;
      const author = await signUp(deletedEmail, TEST_PASSWORD, deletedName);

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
            email: deletedEmail,
            password: TEST_PASSWORD,
          }),
        },
      );
      expect(signInRes.ok).toBeFalse();

      const recreated = await signUp(deletedEmail, TEST_PASSWORD, deletedName);
      expect(recreated.userId).toBeDefined();
      await deleteCurrentUser(recreated.cookie);
    });
  });
});
