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

  describe("GET /api/content/user/:userId/special (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/user/some-id/special`);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/user/:userId/special (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/user/some-id/special`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/content/user/:userId/special (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/content/user/${adminSession.userId}/special`,
        targetSession.cookie,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/user/:userId/special (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/user/${targetSession.userId}/special`,
        targetSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ active: true }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/content/user/:userId/special (admin)", () => {
    it("returns 200 with posts array for a valid user", async () => {
      const res = await authedFetch(
        `/content/user/${targetSession.userId}/special`,
        adminSession.cookie,
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
      expect(Array.isArray(body.posts)).toBe(true);
    });

    it("returns 404 for a non-existent userId", async () => {
      const res = await authedFetch(
        "/content/user/non-existent-id/special",
        adminSession.cookie,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/user/:userId/special (admin) — ban", () => {
    it("returns 200 when banning a user with a time-limited ban", async () => {
      const res = await authedFetch(
        `/user/${targetSession.userId}/special`,
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
        `/user/${targetSession.userId}/special`,
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
        "/user/non-existent-id/special",
        adminSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ active: true }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/content/post/:postId/special (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id/special`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: true }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/content/post/:postId/special (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const createRes = await authedFetch(
        "/content/post",
        targetSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            content: "Test post to hide",
            locality: { lat: 51.5074, lon: -0.1278 },
          }),
        },
      );
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const res = await authedFetch(
        `/content/post/${postId}/special`,
        targetSession.cookie,
        { method: "PUT" },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/content/post/:postId/special (admin)", () => {
    it("returns 200 with hidden: true when hiding a post", async () => {
      const createRes = await authedFetch(
        "/content/post",
        targetSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            content: "Test post to hide",
            locality: { lat: 51.5074, lon: -0.1278 },
          }),
        },
      );
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const res = await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.hidden).toBe(true);
    });

    it("returns 200 with hidden: false when unhiding a post", async () => {
      const createRes = await authedFetch(
        "/content/post",
        targetSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            content: "Test post to unhide",
            locality: { lat: 51.5074, lon: -0.1278 },
          }),
        },
      );
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );

      const res = await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.hidden).toBe(false);
    });

    it("returns 404 for a non-existent postId", async () => {
      const res = await authedFetch(
        "/content/post/non-existent-id/special",
        adminSession.cookie,
        { method: "PUT" },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/content/post/:postId/special (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id/special`);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/content/post/:postId/special (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const createRes = await authedFetch(
        "/content/post",
        targetSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            content: "Test post to get",
            locality: { lat: 51.5074, lon: -0.1278 },
          }),
        },
      );
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const res = await authedFetch(
        `/content/post/${postId}/special`,
        targetSession.cookie,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/content/post/:postId/special (admin bypass)", () => {
    it("returns 200 with hidden post data for admin", async () => {
      const createRes = await authedFetch(
        "/content/post",
        targetSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            content: "Hidden post content",
            locality: { lat: 51.5074, lon: -0.1278 },
          }),
        },
      );
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );

      const res = await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        post: { id: string; content: string };
      };
      expect(body.post.id).toBe(postId);
      expect(body.post.content).toBe("Hidden post content");
    });

    it("returns 404 for non-existent postId", async () => {
      const res = await authedFetch(
        "/content/post/non-existent-id/special",
        adminSession.cookie,
      );
      expect(res.status).toBe(404);
    });
  });
});
