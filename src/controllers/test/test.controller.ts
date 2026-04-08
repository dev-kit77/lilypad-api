import { Elysia, t } from "elysia";
import { prisma } from "../../../lib/prisma";
import { log } from "../../../lib/log";

/**
 * POST /api/test/promote-admin — active only when TEST_ADMIN_PROMOTE_SECRET is set on the server.
 * Lets integration tests promote a user without host-side DB access (see docker-compose).
 */
export const testController = new Elysia().post(
  "/test/promote-admin",
  async ({ body, request, set }) => {
    log.out(`POST request at /test/promote-admin`, "test-controller");

    log.out(`Getting secret`, "test-controller");
    const secret = process.env.TEST_ADMIN_PROMOTE_SECRET?.trim();
    if (!secret) {
      set.status = 404;
      log.err(404, `Secret not set`, "test");
      return;
    }
    if (request.headers.get("x-test-secret") !== secret) {
      set.status = 401;
      log.err(401, `Secret mismatch`, "test");
      return { error: "Unauthorized" };
    }

    log.out(`Promoting user ${body.userId} to admin`, "test-controller");
    await prisma.user.update({
      where: { id: body.userId },
      data: { role: "admin" },
    });
    log.out(`User promoted to admin`, "test-controller");
    return { ok: true };
  },
  {
    body: t.Object({ userId: t.String() }),
  },
);
