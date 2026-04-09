import { Elysia } from "elysia";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import {
  contentResponse,
  postCreateBody,
  postCreateResponse,
  postReplyBody,
  postReplyResponse,
  postRepliesResponse,
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
        author: post.user.settings?.anon ? "Anonymous" : post.user.name,
        time: post.time.toISOString(),
        upvotes: post._count.upvotes,
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
        author: post.user.settings?.anon ? "Anonymous" : post.user.name,
        time: post.time.toISOString(),
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
