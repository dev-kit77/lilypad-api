import { Elysia } from "elysia";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import {
  contentResponse,
  postCreateBody,
  postCreateResponse,
  postReportBody,
  postReportResponse,
  postUpdateBody,
  postUpdateResponse,
  postDeleteResponse,
  postReplyBody,
  postReplyResponse,
  postRepliesResponse,
  postResponse,
} from "../../models/controllers/content.models";
import { log } from "../../../lib/log";

/**
 * User content controller.
 *
 * Handles authenticated content operations for the current user.
 */
export const contentController = new Elysia()
  .use(authPlugin)
  .get(
    "/content",
    async ({ user }) => {
      log.out(`GET request at /content`, "content-controller");

      log.out(`Querying posts for user ${user.id}`, "content-controller");
      const rows = await prisma.post.findMany({
        where: { userID: user.id },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
        orderBy: { time: "desc" },
      });

      const toItem = (post: (typeof rows)[number]) => ({
        id: post.CUID,
        content: post.content,
        ...(post.user.settings?.anon ? { userID: post.userID } : {}),
        author: post.user.settings?.anon ? "Anonymous" : post.user.name,
        time: post.time,
        ...(post.updated ? { updated: post.updated } : {}),
        upvotes: post._count.upvotes,
        ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
        replyCount: post._count.postReplies,
      });

      const rootPosts = rows.filter((p) => p.replyingToID == null);
      const replyPosts = rows.filter((p) => p.replyingToID != null);

      log.success(
        `Found ${rootPosts.length} posts & ${replyPosts.length} comments for user ${user.id}`,
        "content-controller",
      );

      return {
        posts: rootPosts.map(toItem),
        comments: replyPosts.map(toItem),
      };
    },
    {
      auth: true,
      response: contentResponse,
      detail: {
        description:
          "Returns the list of posts and comments associated with the current user.",
        tags: ["Content"],
      },
    },
  )
  /**
   * Create a new post at the supplied locality.
   * Reuses an existing nearby location if one is found within 1 meter.
   */
  .post(
    "/content/post",
    async ({ user, body, set }) => {
      log.out(`POST request at /content/post`, "content-controller");
      try {
        const { lat, lon } = body.locality;

        // geog type is Unsupported in Prisma so all location reads/writes use raw SQL
        log.out(
          `Querying geolocation: lat=${lat}, lon=${lon}`,
          "content-controller",
        );
        const existing = await prisma.$queryRaw<{ CUID: string }[]>`
                SELECT "CUID" FROM "location"
                WHERE ST_DWithin(geog, ST_MakePoint(${lon}, ${lat})::geography, 1)
                LIMIT 1
            `;

        let locationCUID: string;
        if (existing.length > 0 && existing[0]) {
          log.success(
            `Found existing location: CUID=${existing[0].CUID}`,
            "content-controller",
          );
          locationCUID = existing[0].CUID;
        } else {
          locationCUID = createId();
          log.out(
            `No existing location found, creating new CUID=${locationCUID}`,
            "content-controller",
          );
          await prisma.$executeRaw`
                    INSERT INTO "location" ("CUID", "geog")
                    VALUES (${locationCUID}, ST_MakePoint(${lon}, ${lat})::geography)
                `;
          log.success(
            `Created new location: CUID=${locationCUID}`,
            "content-controller",
          );
        }

        log.out(`Creating post...`, "content-controller");
        await prisma.post.create({
          data: {
            userID: user.id,
            content: body.content,
            locationID: locationCUID,
          },
        });
        log.success(`Created post!`, "content-controller");
        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Failed to create post: ${e}`, "content-controller");
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: postCreateBody,
      response: postCreateResponse,
      detail: {
        description: "Create a new post.",
        tags: ["Content"],
      },
    },
  )
  .get(
    "/content/post/:postId",
    async ({ params, set }) => {
      log.out(
        `POST request at /content/post/${params.postId}`,
        "content-controller",
      );

      try {
        const post = await prisma.post.findUnique({
          where: { CUID: params.postId },
          include: {
            user: { include: { settings: true } },
            _count: { select: { upvotes: true, postReplies: true } },
          },
        });

        if (!post) {
          set.status = 404;
          log.err(
            404,
            `Post not found: ${params.postId}`,
            "content-controller",
          );
          return { error: "NOT_FOUND" };
        }

        return {
          post: {
            id: post.CUID,
            content: post.content,
            ...(post.user.settings?.anon ? { userID: post.userID } : {}),
            author: post.user.settings?.anon ? "Anonymous" : post.user.name,
            time: post.time,
            ...(post.updated ? { updated: post.updated } : {}),
            upvotes: post._count.upvotes,
            replyCount: post._count.postReplies,
          },
        };
      } catch (e) {
        set.status = 400;
        log.err(400, `Failed to get post: ${e}`, "content-controller");
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      response: postResponse,
      detail: {
        description: "Get a post by its CUID.",
        tags: ["Content"],
      },
    },
  )
  .post(
    "/content/post/:postId",
    async ({ user, params, body, set }) => {
      log.out(
        `POST request at /content/post/${params.postId}`,
        "content-controller",
      );

      try {
        log.out(`Creating Report for ${params.postId}`, "user-controller");
        await prisma.report.create({
          data: {
            userID: user.id,
            reportedPostID: params.postId,
            reason: body.reason,
            content: body.content,
          },
        });
        log.success(`Report filed for ${params.postId}`, "user-controller");

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Invalid field: ${e}`, "user-controller");
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: postReportBody,
      response: postReportResponse,
      detail: {
        description:
          "File a report about the post specified in the path parameter {postId}.",
        tags: ["User"],
      },
    },
  )
  /**
   * Create a new post at the supplied locality.
   * Reuses an existing nearby location if one is found within 1 meter.
   */
  .post(
    "/content/post/:postId/reply",
    async ({ user, params, body, set }) => {
      log.out(
        `POST request at /content/post/${params.postId}/reply`,
        "content-controller",
      );
      try {
        log.out(
          `Finding parent post: CUID=${params.postId}`,
          "content-controller",
        );
        const parent = await prisma.post.findUnique({
          where: { CUID: params.postId },
        });

        if (!parent) {
          log.err(
            400,
            `Parent post not found: CUID=${params.postId}`,
            "content-controller",
          );
          set.status = 400;
          return { error: "INVALID_FIELD" };
        }
        log.success(
          `Parent post found: CUID=${params.postId}`,
          "content-controller",
        );

        log.out(`Creating reply post...`, "content-controller");
        await prisma.post.create({
          data: {
            userID: user.id,
            content: body.content,
            locationID: parent.locationID,
            replyingToID: parent.CUID,
          },
        });

        log.success(`Reply post created!`, "content-controller");
        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Failed to create reply post: ${e}`, "content-controller");
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: postReplyBody,
      response: postReplyResponse,
      detail: {
        description: "Create a new reply to a post object.",
        tags: ["Content"],
      },
    },
  )
  /**
   * Update the content of a post.
   */
  .put(
    "/content/post/:postId",
    async ({ user, params, body, set }) => {
      log.out(
        `PUT request at /content/post/${params.postId}`,
        "content-controller",
      );

      try {
        log.out(
          `Updating post ${params.postId} content to ${body.content}`,
          "content-controller",
        );

        log.out(
          `Checking user ${user.id} access for post ${params.postId}`,
          "content-controller",
        );

        const existing = await prisma.post.findUnique({
          where: { CUID: params.postId },
        });
        if (!existing) {
          set.status = 404;
          log.err(
            404,
            `Post not found: ${params.postId}`,
            "content-controller",
          );
          return { error: "NOT_FOUND" };
        }
        if (existing.userID !== user.id) {
          set.status = 403;
          log.err(
            403,
            `User ${user.id} does not have privilege to delete post ${params.postId}`,
            "content-controller",
          );
          return { error: "FORBIDDEN" };
        }

        log.success(
          `User ${user.id} has permission to delete post ${params.postId}`,
          "content-controller",
        );

        log.out(
          `Updating post ${params.postId} content to ${body.content}`,
          "content-controller",
        );

        const result = await prisma.post.update({
          where: { CUID: params.postId },
          data: { content: body.content, updated: new Date() },
        });

        if (!result) {
          set.status = 403;
          log.err(
            403,
            `User does not have privelge to modify`,
            "user-controller",
          );
          return { error: "FORBIDDEN" };
        }
        log.success(
          `Post ${params.postId} content updated to ${body.content}`,
          "content-controller",
        );

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Invalid field: ${e}`, "user-controller");
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: postUpdateBody,
      response: postUpdateResponse,
      detail: {
        description: "Update a previously made Post.",
        tags: ["Content"],
      },
    },
  )
  .delete(
    "/content/post/:postId",
    async ({ user, params, set }) => {
      log.out(
        `DELETE request at /content/post/${params.postId}`,
        "content-controller",
      );

      log.out(
        `Checking user ${user.id} access for post ${params.postId}`,
        "content-controller",
      );

      const existing = await prisma.post.findUnique({
        where: { CUID: params.postId },
      });
      if (!existing) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: "NOT_FOUND" };
      }
      if (existing.userID !== user.id) {
        set.status = 403;
        log.err(
          403,
          `User ${user.id} does not have privilege to delete post ${params.postId}`,
          "content-controller",
        );
        return { error: "FORBIDDEN" };
      }

      log.success(
        `User ${user.id} has permission to delete post ${params.postId}`,
        "content-controller",
      );

      log.out(`Deleting post ${params.postId}`, "content-controller");

      try {
        await prisma.post.delete({
          where: { CUID: params.postId, userID: user.id },
        });
      } catch (e) {
        set.status = 400;
        log.err(400, `Invalid field: ${e}`, "content-controller");
        return { error: "INVALID_FIELD" };
      }

      log.success(`Deleted post ${params.postId}`, "content-controller");
      return { status: "OK" };
    },
    {
      auth: true,
      response: postDeleteResponse,
      detail: {
        description: "Delete a Post.",
        tags: ["Content"],
      },
    },
  )
  /**
   * Create a reply to an existing post.
   * Validates that the parent post exists before creating the reply.
   */
  .get(
    "/content/post/:postId/reply",
    async ({ params, set }) => {
      log.out(
        `GET request at /content/post/${params.postId}/reply`,
        "content-controller",
      );

      log.out(
        `Fetching replies for post ${params.postId}`,
        "content-controller",
      );
      const parent = await prisma.post.findUnique({
        where: { CUID: params.postId },
      });

      if (!parent) {
        set.status = 404;
        log.err(404, `Invalid post ID: ${params.postId}`, "content-controller");
        return { error: "INVALID_ID" };
      }
      log.success(`Found post ${params.postId}`, "content-controller");

      const replies = await prisma.post.findMany({
        where: { replyingToID: params.postId },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
        orderBy: { time: "asc" },
      });
      log.success(
        `Fetched ${replies.length} replies for post ${params.postId}`,
        "content-controller",
      );

      return replies.map((post) => ({
        id: post.CUID,
        content: post.content,
        ...(post.user.settings?.anon ? { userID: post.userID } : {}),
        author: post.user.settings?.anon ? "Anonymous" : post.user.name,
        time: post.time,
        ...(post.updated ? { updated: post.updated } : {}),
        upvotes: post._count.upvotes,
        replyCount: post._count.postReplies,
      }));
    },
    {
      auth: true,
      response: postRepliesResponse,
      detail: {
        description: "Return all replies to a post object.",
        tags: ["Content"],
      },
    },
  );
