import { Elysia } from "elysia";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import { prisma } from "../../../lib/prisma";
import {
  userBanBody,
  userBanResponse,
} from "../../models/controllers/admin.models";
import { contentResponse } from "../../models/controllers/content.models";
import { ERROR_CODES } from "../../models/controllers/error-codes.models";
import { log } from "../../../lib/log";

export const adminController = new Elysia()
  // This controller only lets in requests from users
  // with role == 'admin'
  .use(authPlugin)
  .get(
    "/content/user/:userId",
    async ({ params, set }) => {
      log.out(
        `GET request at /content/user/${params.userId}`,
        "admin-controller",
      );

      log.out(`Querying for user ${params.userId}`, "admin-controller");
      const targetUser = await prisma.user.findUnique({
        where: { id: params.userId },
      });

      if (!targetUser) {
        set.status = 404;
        log.err(404, `Invalid user ID: ${params.userId}`, "admin-controller");
        return { error: ERROR_CODES.INVALID_USER };
      }

      log.success(`Found user ${params.userId}`, "admin-controller");

      log.out(`Querying posts for user ${params.userId}`, "admin-controller");
      const rows = await prisma.post.findMany({
        where: { userID: params.userId },
        include: {
          user: { include: { settings: true } },
          _count: { select: { upvotes: true, postReplies: true } },
        },
        orderBy: { time: "desc" },
      });

      log.success(
        `Found ${rows.length} posts for user ${params.userId}`,
        "admin-controller",
      );

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

      return {
        posts: rootPosts.map(toItem),
        comments: replyPosts.map(toItem),
      };
    },
    {
      auth: "admin",
      response: contentResponse,
      detail: {
        description:
          "Return the list of posts and comments associated with the specified user. This is an admin-only endpoint.",
        tags: ["Content"],
      },
    },
  )
  .put(
    "/user/:userId",
    async ({ params, body, set }) => {
      console.log(`PUT requested at /user/${params.userId}`);
      const NUMBER_MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
      try {
        log.out(`Querying for user ${params.userId}`, "admin-controller");
        const targetUser = await prisma.user.findUnique({
          where: { id: params.userId },
        });

        if (!targetUser) {
          set.status = 404;
          log.err(404, `User not found: ${params.userId}`, "admin-controller");
          return { error: ERROR_CODES.INVALID_USER };
        }

        log.success(`User ${params.userId} found`, "admin-controller");

        let banExpires: Date | null = null;
        if (body.active && body.lengthOfBanInDays) {
          banExpires = new Date(
            Date.now() + body.lengthOfBanInDays * NUMBER_MILLISECONDS_IN_A_DAY,
          );
        }

        log.out(`Updating user ${params.userId}`, "admin-controller");

        await prisma.user.update({
          where: { id: params.userId },
          data: {
            banned: body.active,
            banExpires,
          },
        });

        log.success(`User ${params.userId} updated`, "admin-controller");

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Invalid field: ${e}`, "admin-controller");
        return { error: ERROR_CODES.INVALID_FIELD };
      }
    },
    {
      auth: "admin",
      body: userBanBody,
      response: userBanResponse,
      detail: {
        description:
          "Ban/Unban the specified user. This is an admin-only endpoint.",
        tags: ["User"],
      },
    },
  );
