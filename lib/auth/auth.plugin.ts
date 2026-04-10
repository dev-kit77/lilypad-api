import { Elysia } from "elysia";
import { auth } from "./auth";
import { log } from "../log";
import { prisma } from "../prisma";
import { ERROR_CODES } from "../../src/models/error.models";

export const authPlugin = new Elysia({ name: "better-auth" }).macro({
  auth(value: true | string) {
    return {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) {
          log.err(401, `Unauthorized: No session found`, "core");
          return status(401);
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            banned: true,
            banExpires: true,
          },
        });

        if (!dbUser) {
          log.err(401, `Unauthorised: Session user not found`, "core");
          return status(401);
        }

        const isBanned = dbUser.banned === true;
        const hasExpiry = dbUser.banExpires != null;
        const banStillActive =
          isBanned && (!hasExpiry || dbUser.banExpires!.getTime() > Date.now());

        if (banStillActive) {
          log.err(403, `Forbidden: User account is banned`, "core");
          return status(403, { error: ERROR_CODES.USER_BANNED });
        }

        if (typeof value === "string" && session.user.role !== value) {
          log.err(
            403,
            `Forbidden: User does not have the required role`,
            "core",
          );
          return status(403, { error: ERROR_CODES.FORBIDDEN_ROLE });
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    };
  },
});
