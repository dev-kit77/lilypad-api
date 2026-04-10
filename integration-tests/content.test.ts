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

  describe("GET /api/content/post/:postId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id`);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/content/post/:postId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/content/post/:postId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id`, {
        method: "DELETE",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/content/post/:postId/upvote (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(`${base()}/api/content/post/some-id/upvote`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
    it("returns 200 with post object when creating a post", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Test post content",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { post: { id: string } };
      expect(body.post).toHaveProperty("id");
      expect(body.post).toHaveProperty("content");
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

  describe("GET /api/content/post/:postId (authenticated)", () => {
    it("returns 404 for a non-existent post", async () => {
      const res = await authedFetch(
        "/content/post/non-existent-id",
        session.cookie,
      );
      expect(res.status).toBe(404);
    });

    it("returns 200 with post data after creating a post", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Test post for get by ID",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const getRes = await authedFetch(`/content/post/${postId}`, session.cookie);
      expect(getRes.status).toBe(200);

      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(getBody).toHaveProperty("post");
      expect((getBody.post as Record<string, unknown>).id).toBe(postId);
    });
  });

  describe("PUT /api/content/post/:postId (authenticated)", () => {
    it("returns 200 with post object when updating own post", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Original content",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const updateRes = await authedFetch(`/content/post/${postId}`, session.cookie, {
        method: "PUT",
        body: JSON.stringify({ content: "Updated content" }),
      });
      expect(updateRes.status).toBe(200);
      const updateBody = (await updateRes.json()) as { post: { id: string } };
      expect(updateBody.post).toHaveProperty("id");
      expect(updateBody.post).toHaveProperty("content");
    });

    it("returns 404 for invalid post ID", async () => {
      const res = await authedFetch(
        "/content/post/invalid-id",
        session.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ content: "Updated content" }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/content/post/:postId (authenticated)", () => {
    it("returns 200 when deleting own post", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post to delete",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const deleteRes = await authedFetch(`/content/post/${postId}`, session.cookie, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);
    });

    it("returns 404 for invalid post ID", async () => {
      const res = await authedFetch(
        "/content/post/invalid-id",
        session.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/content/post/:postId/upvote (authenticated)", () => {
    it("returns 200 and adds upvote to own post", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post to upvote",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string; upvotes: number } };
      const postId = createBody.post.id;

      const upvoteRes = await authedFetch(`/content/post/${postId}/upvote`, session.cookie, {
        method: "PUT",
      });
      expect(upvoteRes.status).toBe(200);
      const upvoteBody = (await upvoteRes.json()) as { post: { upvotes: number } };
      expect(upvoteBody.post.upvotes).toBe(1);
    });

    it("returns 200 and toggles upvote off when already upvoted", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post to toggle upvote",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      await authedFetch(`/content/post/${postId}/upvote`, session.cookie, {
        method: "PUT",
      });

      const toggleRes = await authedFetch(`/content/post/${postId}/upvote`, session.cookie, {
        method: "PUT",
      });
      expect(toggleRes.status).toBe(200);
      const toggleBody = (await toggleRes.json()) as { post: { upvotes: number } };
      expect(toggleBody.post.upvotes).toBe(0);
    });

    it("returns 404 for non-existent post", async () => {
      const res = await authedFetch("/content/post/non-existent-id/upvote", session.cookie, {
        method: "PUT",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/content/post/:postId (report)", () => {
    it("returns 200 with report object when reporting a post", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post to report",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const reportRes = await authedFetch(`/content/post/${postId}`, session.cookie, {
        method: "POST",
        body: JSON.stringify({
          reason: "spam",
          content: "This is spam",
        }),
      });
      expect(reportRes.status).toBe(200);
      const reportBody = (await reportRes.json()) as {
        report: { id: string; reason: string };
      };
      expect(reportBody.report).toHaveProperty("id");
      expect(reportBody.report).toHaveProperty("reason");
    });
  });

  describe("Cross-user authorization", () => {
    let otherUserSession: AuthSession;
    let otherUserEmail: string;
    let otherUserPassword: string;
    let otherUserName: string;
    let userAPostId: string;

    beforeAll(async () => {
      otherUserEmail = `other-${Date.now()}@test.com`;
      otherUserPassword = "password1234";
      otherUserName = `otheruser${Date.now()}`;
      otherUserSession = await signUp(
        otherUserEmail,
        otherUserPassword,
        otherUserName,
      );

      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "User A's post",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      userAPostId = createBody.post.id;
    });

    afterAll(async () => {
      if (otherUserSession?.cookie) {
        await deleteCurrentUser(otherUserSession.cookie);
      }
    });

    it("returns 403 when user B tries to update user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${userAPostId}`,
        otherUserSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ content: "Hacked content" }),
        },
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when user B tries to delete user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${userAPostId}`,
        otherUserSession.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(403);
    });

    it("user B can still read user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${userAPostId}`,
        otherUserSession.cookie,
      );
      expect(res.status).toBe(200);
    });

    it("user B can report user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${userAPostId}`,
        otherUserSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({
            reason: "inappropriate",
            content: "Report reason",
          }),
        },
      );
      expect(res.status).toBe(200);
    });

    it("user B can reply to user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${userAPostId}/reply`,
        otherUserSession.cookie,
        {
          method: "POST",
          body: JSON.stringify({ content: "User B's reply" }),
        },
      );
      expect(res.status).toBe(200);
    });

    it("user B can upvote user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${userAPostId}/upvote`,
        otherUserSession.cookie,
        { method: "PUT" },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { post: { upvotes: number } };
      expect(body.post.upvotes).toBe(1);
    });
  });
});
