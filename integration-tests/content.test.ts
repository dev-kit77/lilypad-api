import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  authedFetch,
  deleteCurrentUser,
  deletePost,
  deleteReport,
  fetchWithTimeout,
  promoteUserToAdminForTest,
  signUp,
  trackForCleanup,
  cleanupAll,
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
    trackForCleanup({ type: "user", id: session.userId, cookie: session.cookie });
  });

  afterAll(async () => {
    await cleanupAll();
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
      trackForCleanup({ type: "post", id: body.post.id, cookie: session.cookie });
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

    it("returns 400 when locality is missing", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Test content",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when latitude is out of range", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Test content",
          locality: { lat: 999, lon: -0.1278 },
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when longitude is out of range", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Test content",
          locality: { lat: 51.5074, lon: 999 },
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 when content is just whitespace", async () => {
      const res = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "   ",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/content/post/:postId/reply (authenticated)", () => {
    it("returns 400 when reply content is empty", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Parent post for reply test",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const replyRes = await authedFetch(
        `/content/post/${createBody.post.id}/reply`,
        session.cookie,
        {
          method: "POST",
          body: JSON.stringify({ content: "" }),
        },
      );
      expect(replyRes.status).toBe(400);
    });

    it("returns 400 when replying to non-existent post (validation error)", async () => {
      const res = await authedFetch(
        "/content/post/non-existent-id/reply",
        session.cookie,
        {
          method: "POST",
          body: JSON.stringify({ content: "reply text" }),
        },
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when reply content is whitespace only", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Parent post",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const replyRes = await authedFetch(
        `/content/post/${createBody.post.id}/reply`,
        session.cookie,
        {
          method: "POST",
          body: JSON.stringify({ content: "   " }),
        },
      );
      expect(replyRes.status).toBe(400);
    });

    it("returns 200 when replying with special characters", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Parent post",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const replyRes = await authedFetch(
        `/content/post/${createBody.post.id}/reply`,
        session.cookie,
        {
          method: "POST",
          body: JSON.stringify({ content: "Reply with special chars: 🎉🔥💯" }),
        },
      );
      expect(replyRes.status).toBe(200);
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

    it("returns 200 with replies array when post has replies", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Parent post for reply test",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const replyRes = await authedFetch(
        `/content/post/${createBody.post.id}/reply`,
        session.cookie,
        {
          method: "POST",
          body: JSON.stringify({ content: "First reply" }),
        },
      );
      expect(replyRes.status).toBe(200);

      const getRepliesRes = await authedFetch(
        `/content/post/${createBody.post.id}/reply`,
        session.cookie,
      );
      expect(getRepliesRes.status).toBe(200);

      const repliesBody = (await getRepliesRes.json()) as Record<
        string,
        unknown
      >;
      expect(repliesBody).toHaveProperty("replies");
      expect(Array.isArray(repliesBody.replies)).toBe(true);
      expect((repliesBody.replies as unknown[]).length).toBe(1);
    });

    it("returns 200 with empty replies array when post has no replies", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post with no replies",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      const getRepliesRes = await authedFetch(
        `/content/post/${postId}/reply`,
        session.cookie,
      );
      expect(getRepliesRes.status).toBe(200);

      const repliesBody = (await getRepliesRes.json()) as Record<
        string,
        unknown
      >;
      expect(repliesBody).toHaveProperty("replies");
      expect(Array.isArray(repliesBody.replies)).toBe(true);
      expect((repliesBody.replies as unknown[]).length).toBe(0);

      trackForCleanup({ type: "post", id: postId, cookie: session.cookie });
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
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const getRes = await authedFetch(
        `/content/post/${createBody.post.id}`,
        session.cookie,
      );
      expect(getRes.status).toBe(200);

      const getBody = (await getRes.json()) as Record<string, unknown>;
      expect(getBody).toHaveProperty("post");
      expect((getBody.post as Record<string, unknown>).id).toBe(createBody.post.id);
    });
  });

  describe("PUT /api/content/post/:postId (authenticated)", () => {
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
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const updateRes = await authedFetch(
        `/content/post/${createBody.post.id}`,
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

    it("returns 400 when update content is empty", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Original content",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const updateRes = await authedFetch(
        `/content/post/${createBody.post.id}`,
        session.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ content: "" }),
        },
      );
      expect(updateRes.status).toBe(400);
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
      const createBody = (await createRes.json()) as {
        post: { id: string; upvotes: number };
      };
      const postId = createBody.post.id;

      const upvoteRes = await authedFetch(
        `/content/post/${postId}/upvote`,
        session.cookie,
        {
          method: "PUT",
        },
      );
      expect(upvoteRes.status).toBe(200);
      const upvoteBody = (await upvoteRes.json()) as {
        post: { upvotes: number };
      };
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

      const toggleRes = await authedFetch(
        `/content/post/${postId}/upvote`,
        session.cookie,
        {
          method: "PUT",
        },
      );
      expect(toggleRes.status).toBe(200);
      const toggleBody = (await toggleRes.json()) as {
        post: { upvotes: number };
      };
      expect(toggleBody.post.upvotes).toBe(0);
    });

    it("returns 404 for non-existent post", async () => {
      const res = await authedFetch(
        "/content/post/non-existent-id/upvote",
        session.cookie,
        {
          method: "PUT",
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/content/post/:postId (report)", () => {
    it("returns 200 when reporting a post", async () => {
      const createdPost = await createTestPost(
        session.cookie,
        "Post to report",
      );
      trackForCleanup({ type: "post", id: createdPost.post.id, cookie: session.cookie });

      const reportRes = await createTestPostReport(
        session.cookie,
        createdPost.post.id,
        "spam",
        "This is a spam post.",
      );

      expect(reportRes.report).toHaveProperty("id");
      expect(reportRes.report).toHaveProperty("reason");
    });
  });

  describe("GET /api/feed-spatial (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${base()}/api/feed-spatial?lat=51.5&lon=-0.1`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/feed-spatial (authenticated)", () => {
    it("returns 200 with posts array", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=51.5074&lon=-0.1278",
        session.cookie,
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
      expect(Array.isArray(body.posts)).toBe(true);
    });

    it("returns 400 when latitude is missing", async () => {
      const res = await authedFetch(
        "/feed-spatial?lon=-0.1278",
        session.cookie,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when longitude is missing", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=51.5074",
        session.cookie,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when latitude is out of range", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=999&lon=-0.1278",
        session.cookie,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when longitude is out of range", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=51.5074&lon=999",
        session.cookie,
      );
      expect(res.status).toBe(400);
    });

    it("returns posts with distanceKm field", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post for spatial feed test",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const feedRes = await authedFetch(
        "/feed-spatial?lat=51.5074&lon=-0.1278",
        session.cookie,
      );
      expect(feedRes.status).toBe(200);

      const feedBody = (await feedRes.json()) as {
        posts: Array<Record<string, unknown>>;
      };
      const ourPost = feedBody.posts.find((p) => p.id === createBody.post.id);
      expect(ourPost).toBeDefined();
      expect(ourPost).toHaveProperty("distanceKm");
    });

    it("returns empty posts array when no posts nearby", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=0&lon=0",
        session.cookie,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        posts: Array<Record<string, unknown>>;
      };
      expect(body.posts).toEqual([]);
    });

    it("returns 400 when latitude is non-numeric", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=abc&lon=-0.1278",
        session.cookie,
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when longitude is non-numeric", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=51.5074&lon=xyz",
        session.cookie,
      );
      expect(res.status).toBe(400);
    });

    it("handles negative coordinates (Southern/Western hemisphere)", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=-33.8688&lon=151.2093",
        session.cookie,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
    });

    it("handles boundary coordinates (edge of valid range)", async () => {
      const res = await authedFetch(
        "/feed-spatial?lat=90&lon=180",
        session.cookie,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("posts");
    });

    it("returns posts sorted by distance (closest first)", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post for sorting test",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      trackForCleanup({ type: "post", id: createBody.post.id, cookie: session.cookie });

      const feedRes = await authedFetch(
        "/feed-spatial?lat=51.5074&lon=-0.1278",
        session.cookie,
      );
      expect(feedRes.status).toBe(200);

      const feedBody = (await feedRes.json()) as {
        posts: Array<{ distanceKm: number }>;
      };
      for (let i = 1; i < feedBody.posts.length; i++) {
        expect(feedBody.posts[i]!.distanceKm).toBeGreaterThanOrEqual(
          feedBody.posts[i - 1]!.distanceKm,
        );
      }
    });
  });

  describe("Cross-user authorization", () => {
    let otherUserSession: AuthSession;
    let createdPostId: string;

    beforeAll(async () => {
      otherUserSession = await createTestUser("other-user");
      trackForCleanup({ type: "user", id: otherUserSession.userId, cookie: otherUserSession.cookie });

      const createdPost = await createTestPost(session.cookie, "User A's post");
      createdPostId = createdPost.post.id;
      trackForCleanup({ type: "post", id: createdPostId, cookie: session.cookie });
    });

    it("returns 403 when user B tries to update user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${createdPostId}`,
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
        `/content/post/${createdPostId}`,
        otherUserSession.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(403);
    });

    it("user B can still read user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${createdPostId}`,
        otherUserSession.cookie,
      );
      expect(res.status).toBe(200);
    });

    it("user B can report user A's post", async () => {
      const res = await authedFetch(
        `/content/post/${createdPostId}`,
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
        `/content/post/${createdPostId}/reply`,
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
        `/content/post/${createdPostId}/upvote`,
        otherUserSession.cookie,
        { method: "PUT" },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { post: { upvotes: number } };
      expect(body.post.upvotes).toBe(1);
    });
  });

  describe("Hidden posts", () => {
    let adminSession: AuthSession;

    beforeAll(async () => {
      adminSession = await createTestAdmin();
      trackForCleanup({ type: "user", id: adminSession.userId, cookie: adminSession.cookie });
    });

    it("hidden post is not returned in GET /api/content", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Post to hide",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );

      const listRes = await authedFetch("/content", session.cookie);
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as {
        posts: Array<{ id: string }>;
      };
      expect(listBody.posts.map((p) => p.id)).not.toContain(postId);
    });

    it("hidden post returns 403 at GET /api/content/post/:postId for non-owner", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "Another post to hide",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );

      const res = await authedFetch(`/content/post/${postId}`, session.cookie);
      expect(res.status).toBe(403);
    });

    it("hidden post returns 403 for owner", async () => {
      const createRes = await authedFetch("/content/post", session.cookie, {
        method: "POST",
        body: JSON.stringify({
          content: "My hidden post",
          locality: { lat: 51.5074, lon: -0.1278 },
        }),
      });
      expect(createRes.status).toBe(200);
      const createBody = (await createRes.json()) as { post: { id: string } };
      const postId = createBody.post.id;

      await authedFetch(
        `/content/post/${postId}/special`,
        adminSession.cookie,
        { method: "PUT" },
      );

      const res = await authedFetch(`/content/post/${postId}`, session.cookie);
      expect(res.status).toBe(403);
    });
  });
});
