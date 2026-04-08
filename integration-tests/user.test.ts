import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  signUp,
  authedFetch,
  deleteCurrentUser,
  type AuthSession,
} from "./helpers/http";

const TEST_EMAIL = `user-test-${Date.now()}@test.com`;
const TEST_PASSWORD = "password1234";
const TEST_NAME = `testuser${Date.now()}`;

let session: AuthSession;

describe("User endpoints", () => {
  beforeAll(async () => {
    session = await signUp(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
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
    it("returns 200 with downloadable JSON and anonymised reporters", async () => {
      const reporter = await signUp(
        `reporter-${Date.now()}@test.com`,
        TEST_PASSWORD,
        `reporter${Date.now()}`,
      );
      try {
        await authedFetch(`/user/${session.userId}/report`, reporter.cookie, {
          method: "POST",
          body: JSON.stringify({
            reason: "spam",
            content: "SAR anonymisation test",
          }),
        });

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
      } finally {
        await deleteCurrentUser(reporter.cookie);
      }
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
});
