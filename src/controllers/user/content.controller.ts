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
  postUpvoteResponse,
} from "../../models/content.models";
import { ERROR_CODES } from "../../models/error.models";
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
        where: { userID: user.id, hidden: false },
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

      const { lat, lon } = body.locality;

      if (body.content.trim().length === 0 || !body.locality || !lat || !lon) {
        set.status = 400;
        log.err(400, `Invalid field: ${body.content}`, "content-controller");
        return { error: ERROR_CODES.INVALID_FIELD };
      }

      // geog type is Unsupported in Prisma so all location reads/writes use raw SQL
      log.out(
        `Querying geolocation: lat=${lat}, lon=${lon}`,
        "content-controller",
      );

      let existing: { CUID: string }[];

      try {
        existing = await prisma.$queryRaw<{ CUID: string }[]>`
                  SELECT "CUID" FROM "location"
                  WHERE ST_DWithin(geog, ST_MakePoint(${lon}, ${lat})::geography, 1)
                  LIMIT 1`;
      } catch (e) {
        log.err(500, `Error querying geolocation: ${e}`, "content-controller");
        set.status = 500;
        return { error: ERROR_CODES.INTERNAL_SERVER };
      }

      let locationCUID: string;

      if (existing.length > 0) {
        const existingLocation = existing[0]!;
        log.success(
          `Found existing location: CUID=${existingLocation.CUID}`,
          "content-controller",
        );

        locationCUID = existingLocation.CUID;
      } else {
        locationCUID = createId();
        log.out(
          `No existing location found, creating new CUID=${locationCUID}`,
          "content-controller",
        );

        let newLocation: { CUID: string }[] | null = null;

        try {
          await prisma.$executeRaw`INSERT INTO "location" ("CUID", "geog") VALUES (${locationCUID}, ST_MakePoint(${lon}, ${lat})::geography) ON CONFLICT DO NOTHING`;
          newLocation = await prisma.$queryRaw<
            { CUID: string }[]
          >`SELECT "CUID" FROM "location" WHERE ST_DWithin(geog, ST_MakePoint(${lon}, ${lat})::geography, 1) LIMIT 1`;
        } catch (e) {
          log.err(
            500,
            `Failed to create new location: ${e}`,
            "content-controller",
          );
          set.status = 500;
          return { error: ERROR_CODES.INTERNAL_SERVER };
        }

        if (!newLocation || newLocation.length === 0) {
          set.status = 500;
          log.err(
            500,
            `Location creation failed: newLocation is null or empty`,
            "content-controller",
          );
          return { error: ERROR_CODES.INTERNAL_SERVER };
        }

        locationCUID = newLocation[0]!.CUID;

        log.success(
          `Created new location: CUID=${locationCUID}`,
          "content-controller",
        );
      }

      log.out(`Creating post...`, "content-controller");
      const created = await prisma.post.create({
        data: {
          userID: user.id,
          content: body.content,
          locationID: locationCUID,
        },
      });

      if (!created) {
        set.status = 500;
        log.err(500, `Failed to create post`, "content-controller");
        return { error: ERROR_CODES.INTERNAL_SERVER };
      }

      log.success(`Created post!`, "content-controller");

      log.out(`Fetching post...`, "content-controller");

      const post = await prisma.post.findUnique({
        where: { CUID: created.CUID },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
      });

      if (!post) {
        set.status = 404;
        log.err(404, `Post not found: ${created.CUID}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.success(`Fetched post!`, "content-controller");

      return {
        post: {
          id: post.CUID,
          content: post.content,
          ...(post.user.settings?.anon ? { userID: post.userID } : {}),
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time,
          ...(post.updated ? { updated: post.updated } : {}),
          upvotes: post._count.upvotes,
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
          replyCount: post._count.postReplies,
        },
      };
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
        `GET request at /content/post/${params.postId}`,
        "content-controller",
      );

      const post = await prisma.post.findUnique({
        where: { CUID: params.postId },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
      });

      if (!post) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      } else if (post.hidden) {
        set.status = 403;
        log.err(
          403,
          `You do not have permission to view this post: ${params.postId}`,
          "content-controller",
        );
        return { error: ERROR_CODES.INVALID_USER };
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
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
          replyCount: post._count.postReplies,
        },
      };
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

      if (body.content.trim().length === 0 || body.reason.trim().length === 0) {
        set.status = 400;
        return { error: ERROR_CODES.INVALID_FIELD };
      }

      log.out(`Creating Report for ${params.postId}`, "user-controller");
      const report = await prisma.report.create({
        data: {
          userID: user.id,
          reportedPostID: params.postId,
          reason: body.reason,
          content: body.content,
        },
      });

      if (!report) {
        set.status = 500;
        log.err(
          500,
          `Failed to create report for ${params.postId}`,
          "user-controller",
        );
        return { error: ERROR_CODES.INTERNAL_SERVER };
      }

      log.success(`Report filed for ${params.postId}`, "user-controller");

      return {
        report: {
          id: report.CUID,
          userID: report.userID,
          reason: report.reason,
          content: report.content,
          time: report.time,
          resolved: report.resolved,
          ...(report.action ? { action: report.action } : {}),
          ...(report.reportedPostID
            ? { reportedPostID: report.reportedPostID }
            : {}),
          ...(report.reportedUserID
            ? { reportedUserID: report.reportedUserID }
            : {}),
        },
      };
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

      if (body.content.trim().length === 0) {
        set.status = 400;
        return { error: ERROR_CODES.INVALID_FIELD };
      }

      log.out(
        `Finding parent post: CUID=${params.postId}`,
        "content-controller",
      );

      const parent = await prisma.post.findUnique({
        where: { CUID: params.postId, hidden: false },
      });

      if (!parent) {
        log.err(
          404,
          `Parent post not found: CUID=${params.postId}`,
          "content-controller",
        );
        set.status = 404;
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.success(
        `Parent post found: CUID=${params.postId}`,
        "content-controller",
      );

      log.out(`Creating reply post...`, "content-controller");

      const created = await prisma.post.create({
        data: {
          userID: user.id,
          content: body.content,
          locationID: parent.locationID,
          replyingToID: parent.CUID,
        },
      });

      if (!created) {
        set.status = 500;
        log.err(
          500,
          `Failed to create reply post for ${params.postId}`,
          "content-controller",
        );
        return { error: ERROR_CODES.INTERNAL_SERVER };
      }

      log.success(`Reply post created!`, "content-controller");

      log.out(`Fetching post...`, "content-controller");

      const post = await prisma.post.findUnique({
        where: { CUID: created.CUID, hidden: false },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
      });

      if (!post) {
        set.status = 404;
        log.err(404, `Post not found: ${created.CUID}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.success(`Fetched post!`, "content-controller");

      return {
        post: {
          id: post.CUID,
          content: post.content,
          ...(post.user.settings?.anon ? { userID: post.userID } : {}),
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time,
          ...(post.updated ? { updated: post.updated } : {}),
          upvotes: post._count.upvotes,
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
          replyCount: post._count.postReplies,
        },
      };
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

      if (body.content.trim().length === 0) {
        set.status = 400;
        return { error: ERROR_CODES.INVALID_FIELD };
      }

      log.out(
        `Checking user ${user.id} access for post ${params.postId}`,
        "content-controller",
      );

      const existing = await prisma.post.findUnique({
        where: { CUID: params.postId, hidden: false },
      });

      if (!existing) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      } else if (existing.userID !== user.id) {
        set.status = 403;
        log.err(
          403,
          `User ${user.id} does not have privilege to edit post ${params.postId}`,
          "content-controller",
        );
        return { error: ERROR_CODES.INVALID_USER };
      }

      log.success(
        `User ${user.id} has permission to edit post ${params.postId}`,
        "content-controller",
      );

      log.out(
        `Updating post ${params.postId} content to ${body.content}`,
        "content-controller",
      );

      const result = await prisma.post.update({
        where: { CUID: params.postId, hidden: false },
        data: { content: body.content, updated: new Date() },
      });

      if (!result) {
        set.status = 500;
        log.err(
          500,
          `could not update post ${params.postId}`,
          "user-controller",
        );
        return { error: ERROR_CODES.INTERNAL_SERVER };
      }

      log.success(
        `Post ${params.postId} content updated to ${body.content}`,
        "content-controller",
      );

      log.out(`Fetching post...`, "content-controller");

      const post = await prisma.post.findUnique({
        where: { CUID: params.postId },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
      });

      if (!post) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.success(`Fetched post!`, "content-controller");

      return {
        post: {
          id: post.CUID,
          content: post.content,
          ...(post.user.settings?.anon ? { userID: post.userID } : {}),
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time,
          ...(post.updated ? { updated: post.updated } : {}),
          upvotes: post._count.upvotes,
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
          replyCount: post._count.postReplies,
        },
      };
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
  /**
   * Upvote a post.
   */
  .put(
    "/content/post/:postId/upvote",
    async ({ user, params, set }) => {
      log.out(
        `PUT request at /content/post/${params.postId}`,
        "content-controller",
      );

      log.out(`Getting post ${params.postId}`, "content-controller");

      const existing = await prisma.post.findUnique({
        where: { CUID: params.postId, hidden: false },
        include: { upvotes: { where: { id: user.id }, take: 1 } },
      });

      if (!existing) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.out(
        `Upvoting post ${params.postId} from ${user.id}`,
        "content-controller",
      );

      const hasUpvoted = existing.upvotes.length > 0;

      const updated = await prisma.post.update({
        where: { CUID: params.postId },
        data: {
          upvotes: {
            [hasUpvoted ? "disconnect" : "connect"]: { id: user.id },
          },
        },
      });

      log.success(
        `Post ${params.postId} upvote toggled by ${user.id}`,
        "content-controller",
      );

      log.out(`Fetching updated post...`, "content-controller");

      const post = await prisma.post.findUnique({
        where: { CUID: params.postId },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
      });

      if (!post) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.success(`Fetched updated post!`, "content-controller");

      return {
        post: {
          id: post.CUID,
          content: post.content,
          ...(post.user.settings?.anon ? { userID: post.userID } : {}),
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time,
          ...(post.updated ? { updated: post.updated } : {}),
          upvotes: post._count.upvotes,
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
          replyCount: post._count.postReplies,
        },
      };
    },
    {
      auth: true,
      response: postUpvoteResponse,
      detail: {
        description: "Upvote a post.",
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
        where: { CUID: params.postId, hidden: false },
      });

      if (!existing) {
        set.status = 404;
        log.err(404, `Post not found: ${params.postId}`, "content-controller");
        return { error: ERROR_CODES.INVALID_ID };
      }
      if (existing.userID !== user.id) {
        set.status = 403;
        log.err(
          403,
          `User ${user.id} does not have privilege to delete post ${params.postId}`,
          "content-controller",
        );
        return { error: ERROR_CODES.INVALID_USER };
      }

      log.success(
        `User ${user.id} has permission to delete post ${params.postId}`,
        "content-controller",
      );

      log.out(`Deleting post ${params.postId}`, "content-controller");

      let del = await prisma.post.delete({
        where: { CUID: params.postId, userID: user.id },
      });

      if (!del) {
        set.status = 500;
        log.err(500, `Invalid field: ${del}`, "content-controller");
        return { error: ERROR_CODES.INVALID_FIELD };
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
        return { error: ERROR_CODES.INVALID_ID };
      }

      log.success(`Found post ${params.postId}`, "content-controller");

      const replies = await prisma.post.findMany({
        where: { replyingToID: params.postId, hidden: false },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
        orderBy: { time: "desc" },
      });

      log.success(
        `Fetched ${replies.length} replies for post ${params.postId}`,
        "content-controller",
      );

      return {
        replies: replies.map((post) => ({
          id: post.CUID,
          content: post.content,
          ...(post.user.settings?.anon ? { userID: post.userID } : {}),
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time,
          ...(post.updated ? { updated: post.updated } : {}),
          upvotes: post._count.upvotes,
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
          replyCount: post._count.postReplies,
        })),
      };
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
