import { Elysia, t } from "elysia";
import { prisma } from "../../../lib/prisma";

/**
 * POST /api/test/promote-admin — active only when TEST_ADMIN_PROMOTE_SECRET is set on the server.
 * Lets integration tests promote a user without host-side DB access (see docker-compose).
 */
export const testController = new Elysia().post(
  "/test/promote-admin",
  async ({ body, request, set }) => {
    const secret = process.env.TEST_ADMIN_PROMOTE_SECRET?.trim();
    if (!secret) {
      set.status = 404;
      return;
    }
    if (request.headers.get("x-test-secret") !== secret) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    await prisma.user.update({
      where: { id: body.userId },
      data: { role: "admin" },
    });
    return { ok: true };
  },
  {
    body: t.Object({ userId: t.String() }),
  },
);
