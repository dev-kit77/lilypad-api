import { Elysia, t } from "elysia";
import { log } from "../../../lib/log";

export const specialController = (app: Elysia) =>
  app
    // add here other control policies when ready
    .get("/special", () => {
      log.out(`GET request at /special`, "special-controller");
      return `Welcome to /special`;
    });
