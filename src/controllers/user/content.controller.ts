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
      console.log(`Executed GET /content`);
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

      console.log(
        `GET /content user=${user.id}: ${rootPosts.length} post(s), ${replyPosts.length} comment(s) (replies)`,
      );

      return {
        posts: rootPosts.map(toItem),
        comments: replyPosts.map(toItem),
      };
    },
    {
      auth: true,
      response: contentResponse,
    },
  )
  /**
   * Create a new post at the supplied locality.
   * Reuses an existing nearby location if one is found within 1 meter.
   */
  .post(
    "/content/post",
    async ({ user, body, set }) => {
      console.log(`Executed POST /content/post`);
      try {
        const { lat, lon } = body.locality;

        // geog type is Unsupported in Prisma so all location reads/writes use raw SQL
        const existing = await prisma.$queryRaw<{ CUID: string }[]>`
                SELECT "CUID" FROM "location"
                WHERE ST_DWithin(geog, ST_MakePoint(${lon}, ${lat})::geography, 1)
                LIMIT 1
            `;

        let locationCUID: string;
        if (existing.length > 0 && existing[0]) {
          locationCUID = existing[0].CUID;
        } else {
          locationCUID = createId();
          await prisma.$executeRaw`
                    INSERT INTO "location" ("CUID", "geog")
                    VALUES (${locationCUID}, ST_MakePoint(${lon}, ${lat})::geography)
                `;
        }
        console.log(`creating post by user ${user.id} with content ${body.content}`)
        await prisma.post.create({
          data: {
            userID: user.id,
            content: body.content,
            locationID: locationCUID,
          },
        });

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        console.log(`${e}`);
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: postCreateBody,
      response: postCreateResponse,
    },
  )
  /**
   * Create a new post at the supplied locality.
   * Reuses an existing nearby location if one is found within 1 meter.
   */
  .post(
    "/content/post/:postId/reply",
    async ({ user, params, body, set }) => {
      console.log(`Executed POST /content/post/${params.postId}/reply`);
      try {
        const parent = await prisma.post.findUnique({
          where: { CUID: params.postId },
        });

        if (!parent) {
          set.status = 400;
          return { error: "INVALID_FIELD" };
        }

        await prisma.post.create({
          data: {
            userID: user.id,
            content: body.content,
            locationID: parent.locationID,
            replyingToID: parent.CUID,
          },
        });

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: postReplyBody,
      response: postReplyResponse,
    },
  )
  /**
   * Create a reply to an existing post.
   * Validates that the parent post exists before creating the reply.
   */
  .get(
    "/content/post/:postId/reply",
    async ({ params, set }) => {
      console.log(`Executed GET /content/post/${params.postId}/reply`);

      const parent = await prisma.post.findUnique({
        where: { CUID: params.postId },
      });

      if (!parent) {
        set.status = 404;
        return { error: "INVALID_ID" };
      }

      const replies = await prisma.post.findMany({
        where: { replyingToID: params.postId },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
        orderBy: { time: "asc" },
      });

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
    },
  );
