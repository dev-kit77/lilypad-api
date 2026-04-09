import { Elysia } from "elysia";
import { log } from "../../../lib/log";

/** GET / - ping for uptime / connectivity checks */
export const pingController = new Elysia().get("/", async () => {
  log.out(`GET request at /`, "ping-controller");
  log.out(`Lilypad API uptime: ${await log.uptime()}`, "ping-controller");
  return { ok: true };
});
