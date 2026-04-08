import { Elysia } from "elysia";
import {
  userGetResponse,
  userUpdateBody,
  userUpdateResponse,
  userDeleteResponse,
} from "../../models/controllers/user.models";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import { log } from "../../../lib/log";

export const userController = new Elysia()
  .use(authPlugin)
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
        return { error: "INVALID_USER" };
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
        return { error: "INVALID_FIELD" };
      }
    },
    {
      auth: true,
      body: userUpdateBody,
      response: userUpdateResponse,
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
        return { error: "INVALID_USER" };
      }
      log.success(`User ${user.id} found`, "user-controller");

      log.out(`Deleting User ${user.id}`, "user-controller");
      await prisma.user.delete({
        where: { id: user.id },
      });
      log.success(`User ${user.id} deleted`, "user-controller");

      return { status: "OK" };
    },
    {
      auth: true,
      response: userDeleteResponse,
    },
  );
