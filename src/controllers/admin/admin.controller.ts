import { Elysia } from "elysia";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import { log } from "../../../lib/log";

export const adminController = new Elysia().use(authPlugin).get(
  "/admin",
  () => {
    log.out(`Executed GET /admin`, "admin");
    return "<p>Welcome to /admin</p>";
  },
  {
    auth: "admin",
  },
);
