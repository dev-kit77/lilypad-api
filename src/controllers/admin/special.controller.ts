import { Elysia, t } from "elysia";
import { prisma } from "../../../lib/prisma";
import { getReportResponse } from "../../models/controllers/admin.models";
import { log } from "../../../lib/log";

export const specialController = (app: Elysia) =>
  app
    // add here other control policies when ready
    .get(
      "/special",
      async () => {
        log.out(`GET request at /special`, "special-controller");

        const reports = await prisma.report.findMany({
          where: { resolved: false },
          orderBy: { time: "asc" },
        });

        const toPostReport = (report: (typeof reports)[number]) => ({
          id: report.CUID,
          userID: report.userID,
          reason: report.reason,
          content: report.content,
          time: report.time,
          reportedPostID: report.reportedPostID,
        });

        const toUserReport = (report: (typeof reports)[number]) => ({
          id: report.CUID,
          userID: report.userID,
          reason: report.reason,
          content: report.content,
          time: report.time,
          reportedUserID: report.reportedUserID,
        });

        return {
          reports: reports.map((report) =>
            report.reportedPostID ? toPostReport(report) : toUserReport(report),
          ),
        };
      },
      {
        auth: "admin",
        response: getReportResponse,
        detail: {
          description: "Gets a list of reports.",
          tags: ["User"],
        },
      },
    )
    .get("/special/:reportId", ({ params }) => {
      log.out(
        `GET request at /special/${params.reportId}`,
        "special-controller",
      );
      return `Welcome to /special/${params.reportId}`;
    });
