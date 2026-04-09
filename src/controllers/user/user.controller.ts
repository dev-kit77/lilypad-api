import { Elysia } from "elysia";
import {
  userGetResponse,
  userUpdateBody,
  userUpdateResponse,
  userDeleteResponse,
  userPublicGetResponse,
  userReportBody,
  userReportResponse,
} from "../../models/controllers/user.models";
import { ERROR_CODES } from "../../models/controllers/error-codes.models";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import { log } from "../../../lib/log";

export const userController = new Elysia()
  .use(authPlugin)
  .get(
    "/user/gdpr-sar",
    async ({ user, set }) => {
      log.out(`GET request at /user/gdpr-sar`, "user-controller");

      log.out(`Querying all userdata for ${user.id}`, "user-controller");
      const [dbUser, userPosts, reportsFiled, reportsAgainst] =
        await Promise.all([
          prisma.user.findUnique({
            where: { id: user.id },
            include: {
              profile: true,
              settings: true,
            },
          }),
          prisma.post.findMany({
            where: { userID: user.id },
            orderBy: { time: "asc" },
            include: {
              _count: { select: { upvotes: true, postReplies: true } },
            },
          }),
          prisma.report.findMany({
            where: { userID: user.id },
            orderBy: { time: "asc" },
          }),
          prisma.report.findMany({
            where: { reportedUserID: user.id },
            orderBy: { time: "asc" },
          }),
        ]);

      if (!dbUser) {
        set.status = 404;
        log.err(404, `Invalid user: ${user.id}`, "user-controller");
        return { error: ERROR_CODES.INVALID_USER };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      set.headers["Content-Type"] = "application/json; charset=utf-8";
      set.headers["Content-Disposition"] =
        `attachment; filename="lilypad-gdpr-sar-${dbUser.id}-${timestamp}.json"`;

      log.success(`User data retrieved for ${user.id}`, "user-controller");

      return {
        generatedAt: new Date().toISOString(),
        requestType: "GDPR_ARTICLE_15_SAR",
        user: dbUser,
        posts: userPosts,
        reportsFiled,
        reportsAgainstUser: reportsAgainst.map(
          ({ userID: _userID, ...report }) => ({
            ...report,
            reporter: "ANONYMISED",
          }),
        ),
      };
    },
    {
      auth: true,
      detail: {
        description:
          "Export personal data for the authenticated user (GDPR SAR).",
        tags: ["User"],
      },
    },
  )
  .get(
    "/user",
    async ({ user, set }) => {
      log.out(`GET request at /user`, "user-controller");

      log.out(`User ${user.id} requested their profile`, "user-controller");
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: true, settings: true },
      });

      if (!dbUser) {
        set.status = 404;
        log.err(404, `User ${user.id} not found`, "user-controller");
        return { error: ERROR_CODES.INVALID_USER };
      }

      log.success(`User ${user.id} profile retrieved`, "user-controller");
      return {
        userId: dbUser.id,
        username: dbUser.name,
        status: dbUser.profile?.status ?? "",
        settings: {
          dark: dbUser.settings?.dark ?? false,
          anon: dbUser.settings?.anon ?? false,
        },
      };
    },
    {
      auth: true,
      response: userGetResponse,
      detail: {
        description: "Return the current user’s profile and settings.",
        tags: ["User"],
      },
    },
  )
  .put(
    "/user",
    async ({ user, body, set }) => {
      log.out(`PUT request at /user`, "user-controller");
      try {
        if (body.username) {
          log.out(
            `User ${user.id} updating username to ${body.username}`,
            "user-controller",
          );
          await prisma.user.update({
            where: { id: user.id },
            data: { name: body.username },
          });
          log.success(
            `User ${user.id} updated username to ${body.username}`,
            "user-controller",
          );
        }

        if (body.status) {
          log.out(
            `User ${user.id} updating status to ${body.status}`,
            "user-controller",
          );
          await prisma.userProfile.upsert({
            where: { userID: user.id },
            update: { status: body.status },
            create: { userID: user.id, name: "", bio: "", status: body.status },
          });
          log.success(
            `User ${user.id} updated status to ${body.status}`,
            "user-controller",
          );
        }

        if (body.settings) {
          log.out(
            `User ${user.id} updating settings to ${JSON.stringify(body.settings)}`,
            "user-controller",
          );
          await prisma.userSettings.upsert({
            where: { userID: user.id },
            update: body.settings,
            create: { userID: user.id, ...body.settings },
          });
          log.success(
            `User ${user.id} updated settings to ${JSON.stringify(body.settings)}`,
            "user-controller",
          );
        }

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Invalid field in PUT /user`, "user-controller");
        return { error: ERROR_CODES.INVALID_FIELD };
      }
    },
    {
      auth: true,
      body: userUpdateBody,
      response: userUpdateResponse,
      detail: {
        description: "Update the current user’s profile and settings.",
        tags: ["User"],
      },
    },
  )
  .delete(
    "/user",
    async ({ user, set }) => {
      log.out(`DELETE request at /user`, "user-controller");

      log.out(`Quereing User ${user.id}`, "user-controller");
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser) {
        set.status = 404;
        log.err(404, `User ${user.id} not found`, "user-controller");
        return { error: ERROR_CODES.INVALID_USER };
      }
      log.success(`User ${user.id} found`, "user-controller");

      const anonymisedName = `deleted-user-${user.id.slice(0, 8)}`;
      const anonymisedEmail = `deleted-${user.id}@deleted.local`;

      log.out(
        `Deleting User ${user.id} and anonymising references`,
        "user-controller",
      );
      await prisma.$transaction([
        prisma.session.deleteMany({
          where: { userId: user.id },
        }),
        prisma.account.deleteMany({
          where: { userId: user.id },
        }),
        prisma.userProfile.upsert({
          where: { userID: user.id },
          update: {
            name: "Deleted User",
            bio: "",
            status: "",
          },
          create: {
            userID: user.id,
            name: "Deleted User",
            bio: "",
            status: "",
          },
        }),
        prisma.userSettings.upsert({
          where: { userID: user.id },
          update: {
            anon: true,
          },
          create: {
            userID: user.id,
            anon: true,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            name: anonymisedName,
            email: anonymisedEmail,
            image: null,
          },
        }),
      ]);
      log.success(`User ${user.id} deleted`, "user-controller");

      return { status: "OK" };
    },
    {
      auth: true,
      response: userDeleteResponse,
      detail: {
        description:
          "Delete the current user account by anonymising identity while preserving authored content.",
        tags: ["User"],
      },
    },
  )
  .get(
    "/user/:userId",
    async ({ params, set }) => {
      log.out(`GET request at /user/${params.userId}`, "user-controller");

      log.out(`Querying profile for ${params.userId}`, "user-controller");
      const profile = await prisma.userProfile.findUnique({
        where: { userID: params.userId },
      });

      if (!profile) {
        set.status = 404;
        log.err(404, `Invalid user: ${params.userId}`, "user-controller");
        return { error: ERROR_CODES.INVALID_USER };
      }

      log.success(`Profile found for ${params.userId}`, "user-controller");

      return {
        name: profile.name,
        bio: profile.bio,
        status: profile.status,
      };
    },
    {
      auth: true,
      response: userPublicGetResponse,
      detail: {
        description: "Return the specified user’s profile information.",
        tags: ["User"],
      },
    },
  )
  .post(
    "/user/:userId/report",
    async ({ user, params, body, set }) => {
      log.out(`Executed POST /user/${params.userId}/report`, "user-controller");
      try {
        log.out(`Creating Report for ${params.userId}`, "user-controller");
        await prisma.report.create({
          data: {
            userID: user.id,
            reportedUserID: params.userId,
            reason: body.reason,
            content: body.content,
            action: body.action,
          },
        });
        log.success(`Report filed for ${params.userId}`, "user-controller");

        return { status: "OK" };
      } catch (e) {
        set.status = 400;
        log.err(400, `Invalid field: ${e}`, "user-controller");
        return { error: ERROR_CODES.INVALID_FIELD };
      }
    },
    {
      auth: true,
      body: userReportBody,
      response: userReportResponse,
      detail: {
        description:
          "File a report against the user specified in the path parameter {userId}.",
        tags: ["User"],
      },
    },
  );
