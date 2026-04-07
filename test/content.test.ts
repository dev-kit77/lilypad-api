import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  signUp,
  authedFetch,
  deleteCurrentUser,
  type AuthSession,
} from "./helpers/http";

const TEST_EMAIL = `content-test-${Date.now()}@test.com`;
const TEST_PASSWORD = "password1234";
const TEST_NAME = `contentuser${Date.now()}`;

const base = () => process.env.TEST_API_BASE!;

let session: AuthSession;

describe("Content endpoints", () => {
  beforeAll(async () => {
    session = await signUp(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  });

  afterAll(async () => {
    if (session?.cookie) {
      await deleteCurrentUser(session.cookie);
    }
  });

  describe("GET /api/content (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/content/post (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "hello",
          locality: { lat: 51.5, lon: -0.1 },
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/content/post/:postId/reply (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id/reply`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/content/post/:postId/reply (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "reply text" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/content (authenticated)", () => {
    it("returns 200 with posts and comments arrays", async () => {
      const res = await authedFetch("/content", session.cookie);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
      expect(body).toHaveProperty("comments");
      expect(Array.isArray(body.posts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
    });
  });

  describe("POST /api/content/post (authenticated)", () => {
    it("returns 200 when creating a post", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Test post content",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.status).toBe("OK");
    });

    it("returns 400 when content is empty", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/content/post/:postId/reply (authenticated)", () => {
    it("returns 404 for a non-existent post", async () => {
      const res = await authedFetch(
        "/content/post/non-existent-id/reply",
        session.cookie,
      );
      expect(res.status).toBe(404);
    });
  });
});
