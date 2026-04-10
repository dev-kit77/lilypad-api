import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  authedFetch,
  deleteCurrentUser,
  deletePost,
  deleteReport,
  fetchWithTimeout,
  type AuthSession,
} from "./helpers/http";
import {
  createTestUser,
  createTestPost,
  createTestAdmin,
  createTestPostReport,
} from "./helpers/factory";

const base = () => process.env.TEST_API_BASE!;

describe("Content endpoints", () => {
  let session: AuthSession;

  beforeAll(async () => {
    session = await createTestUser("content-test");
  });

  afterAll(async () => {
    if (session?.cookie) {
      await deleteCurrentUser(session.cookie);
    }
  });

  describe("GET /api/content (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(`${base()}/api/content`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/content/post (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(`${base()}/api/content/post`, {
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
      const res = await fetchWithTimeout(
        `${base()}/api/content/post/some-id/reply`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/content/post/:postId/reply (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${base()}/api/content/post/some-id/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: "reply text" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/content/post/:postId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(`${base()}/api/content/post/some-id`);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/content/post/:postId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(`${base()}/api/content/post/some-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/content/post/:postId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(`${base()}/api/content/post/some-id`, {
        method: "DELETE",
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
    let createdPostIds: string[] = [];

    afterAll(async () => {
      for (const postId of createdPostIds) {
        await deletePost(session.cookie, postId);
      }
    });

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
      createdPostIds.push(body.post.id);
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
    let createdPostId: string | null = null;

    afterAll(async () => {
      if (createdPostId) {
        await deletePost(session.cookie, createdPostId);
      }
    });

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
      createdPostId = createBody.post.id;

      const getRes = await authedFetch(
        `/content/post/${createdPostId}`,
        session.cookie,
      );
      expect(getRes.status).toBe(200);

      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(getBody).toHaveProperty("post");
      expect((getBody.post as Record<string, unknown>).id).toBe(createdPostId);
    });
  });

  describe("PUT /api/content/post/:postId (authenticated)", () => {
    let createdPostId: string | null = null;

    afterAll(async () => {
      if (createdPostId) {
        await deletePost(session.cookie, createdPostId);
      }
    });

    it("returns 200 when updating own post", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Original content",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      createdPostId = createBody.post.id;

      const updateRes = await authedFetch(
        `/content/post/${createdPostId}`,
        session.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ content: "Updated content" }),
        },
      );
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

      const deleteRes = await authedFetch(
        `/content/post/${postId}`,
        session.cookie,
        {
          method: "DELETE",
        },
      );
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

  describe("POST /api/content/post/:postId (report)", () => {
    let postId: string | null = null;
    let createdReport: { id: string } | null = null;
    let adminSession: AuthSession | null = null;

    afterAll(async () => {
      adminSession = await createTestAdmin();

      if (postId) {
        await deletePost(session.cookie, postId);
      }
      if (createdReport && adminSession?.cookie) {
        await deleteReport(adminSession.cookie, createdReport.id);
      }
    });

    it("returns 200 when reporting a post", async () => {
      const createdPost = await createTestPost(
        session.cookie,
        "Post to report",
      );
      postId = createdPost.post.id;

      const reportRes = await createTestPostReport(
        session.cookie,
        postId,
        "spam",
        "This is a spam post.",
      );

      createdReport = reportRes.report;

      expect(reportRes.report).toHaveProperty("id");
      expect(reportRes.report).toHaveProperty("reason");
    });
  });

  describe("Cross-user authorization", () => {
    let otherUserSession: AuthSession;
    let userAPostId: string | null = null;
    let adminSession: AuthSession | null = null;
    let reportId: string | null = null;

    beforeAll(async () => {
      otherUserSession = await createTestUser("other-user");

      const createdPost = await createTestPost(session.cookie, "User A's post");
      userAPostId = createdPost.post.id;
    });

    afterAll(async () => {
      if (userAPostId) {
        await deletePost(session.cookie, userAPostId);
      }
      if (reportId && adminSession?.cookie) {
        await deleteReport(adminSession.cookie, reportId);
      }
      if (otherUserSession?.cookie) {
        await deleteCurrentUser(otherUserSession.cookie);
      }
      if (adminSession?.cookie) {
        await deleteCurrentUser(adminSession.cookie);
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

      adminSession = await createTestAdmin();

      const reportsRes = await authedFetch("/special", adminSession.cookie);
      const reportsBody = (await reportsRes.json()) as {
        reports: Array<{ id: string }>;
      };
      if (reportsBody.reports.length > 0) {
        reportId = reportsBody.reports[0]!.id;
      }
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
  });
});
