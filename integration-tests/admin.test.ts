import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  signUp,
  signIn,
  authedFetch,
  deleteCurrentUser,
  promoteUserToAdminForTest,
  type AuthSession,
} from "./helpers/http";

const ADMIN_EMAIL = `admin-test-${Date.now()}@test.com`;
const ADMIN_PASSWORD = "password1234";
const ADMIN_NAME = `adminuser${Date.now()}`;

const TARGET_EMAIL = `target-test-${Date.now()}@test.com`;
const TARGET_PASSWORD = "password1234";
const TARGET_NAME = `targetuser${Date.now()}`;

let adminSession: AuthSession;
let targetSession: AuthSession;

const base = () => process.env.TEST_API_BASE!;

describe("Admin endpoints", () => {
  beforeAll(async () => {
    targetSession = await signUp(TARGET_EMAIL, TARGET_PASSWORD, TARGET_NAME);

    adminSession = await signUp(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME);
    await promoteUserToAdminForTest(adminSession.userId);
    adminSession = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    if (targetSession?.cookie) {
      await deleteCurrentUser(targetSession.cookie);
    }
    if (adminSession?.cookie) {
      await deleteCurrentUser(adminSession.cookie);
    }
  });

  describe("GET /api/content/user/:userId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/user/some-id`);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/user/:userId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/user/some-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/content/user/:userId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/content/user/${adminSession.userId}`,
        targetSession.cookie,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/user/:userId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/user/${targetSession.userId}`,
        targetSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ active: true }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/content/user/:userId (admin)", () => {
    it("returns 200 with posts array for a valid user", async () => {
      const res = await authedFetch(
        `/content/user/${targetSession.userId}`,
        adminSession.cookie,
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
      expect(Array.isArray(body.posts)).toBe(true);
    });

    it("returns 400 for a non-existent userId", async () => {
      const res = await authedFetch(
        "/content/user/non-existent-id",
        adminSession.cookie,
      );
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/user/:userId (admin) — ban", () => {
    it("returns 200 when banning a user with a time-limited ban", async () => {
      const res = await authedFetch(
        `/user/${targetSession.userId}`,
        adminSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ active: true, lengthOfBanInDays: 7 }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("OK");
    });

    it("returns 200 when unbanning a user", async () => {
      const res = await authedFetch(
        `/user/${targetSession.userId}`,
        adminSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ active: false }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("OK");
    });

    it("returns 404 for a non-existent userId", async () => {
      const res = await authedFetch(
        "/user/non-existent-id",
        adminSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ active: true }),
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
