import { Elysia, type Context } from "elysia";
import { userController } from "./controllers/user/user.controller";
import { contentController as feedController } from "./controllers/user/feed.controller";
import { contentController } from "./controllers/user/content.controller";
import swagger from "@elysiajs/swagger";
import { adminController } from "./controllers/admin/admin.controller";
import { testController } from "./controllers/test/test.controller";
import { pingController } from "./controllers/user/ping.controller";
import { auth } from "../lib/auth/auth";
import { cors } from "@elysiajs/cors";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MAX_REQUESTS,
} from "./service/rate-limit.service";
import { log } from "../lib/log";

const AUTH_ROUTE = "/auth/*";

const betterAuthView = (context: Context) => {
  const BETTER_AUTH_ACCEPT_METHODS = ["POST", "GET"];

  if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    return auth.handler(context.request);
  } else {
    context.set.status = 405;
  }
};

export const app = new Elysia()
  .use(cors())
  .use(swagger())
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      log.err(
        400,
        `Validation failed: ${error.all.map((e) => e.message).join(", ")}`,
        "app",
      );
      return {
        message: "Validation failed",
        fields: error.all.map((e) => ({
          field: e.path.replace("/", ""),
          message: e.message,
        })),
      };
    }
  })
  .onBeforeHandle(async ({ request, set }) => {
    // Rate limiting
    const ip = getClientIp(request);

    if (ip === "unknown") {
      log.warn(`Request from an unknown IP!`, "core");
    } else {
      log.out(`Request from ${ip}`, "core");
      log.out(`Checking rate limit for ${ip}`, "core");
    }
    const result = await checkRateLimit(ip);
    const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

    set.headers["X-RateLimit-Limit"] = String(RATE_LIMIT_MAX_REQUESTS);
    set.headers["X-RateLimit-Remaining"] = String(result.remaining);
    set.headers["X-RateLimit-Reset"] = String(
      Math.floor(result.resetAt / 1000),
    );

    if (result.limited) {
      set.headers["Retry-After"] = String(Math.max(1, retryAfterSeconds));
      set.status = 429;
      log.err(429, `Rate limit exceeded for ${ip}`, "core");
      return { error: "RATE_LIMIT_EXCEEDED" };
    }
  })
  .group("/api", (app) =>
    app
      .all(AUTH_ROUTE, betterAuthView)
      .use(pingController)
      .use(userController)
      .use(feedController)
      .use(contentController)
      .use(adminController)
      .use(testController),
  );
