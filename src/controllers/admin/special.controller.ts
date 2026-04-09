import { Elysia, t } from "elysia";
import { prisma } from "../../../lib/prisma";
import {
  getReportsResponse,
  reportResponse,
} from "../../models/controllers/admin.models";
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
        response: getReportsResponse,
        detail: {
          description: "Gets a list of reports.",
          tags: ["User"],
        },
      },
    )
    .get(
      "/special/:reportId",
      async ({ params, set }) => {
        log.out(
          `GET request at /special/${params.reportId}`,
          "special-controller",
        );
        try {
          const report = await prisma.report.findUnique({
            where: { CUID: params.reportId },
          });

          if (!report) {
            set.status = 404;
            log.err(
              404,
              `Report not found: ${params.reportId}`,
              "content-controller",
            );
            return { error: "NOT_FOUND" };
          }

          const toPostReport = () => ({
            id: report.CUID,
            userID: report.userID,
            reason: report.reason,
            content: report.content,
            time: report.time,
            resolved: report.resolved,
            action: report.action,
            reportedPostID: report.reportedPostID,
          });

          const toUserReport = () => ({
            id: report.CUID,
            userID: report.userID,
            reason: report.reason,
            content: report.content,
            time: report.time,
            resolved: report.resolved,
            action: report.action,
            reportedUserID: report.reportedUserID,
          });

          return {
            report: report.reportedPostID ? toPostReport() : toUserReport(),
          };
        } catch (e) {
          set.status = 400;
          log.err(400, `Failed to get report: ${e}`, "content-controller");
          return { error: "INVALID_FIELD" };
        }
      },
      {
        auth: "admin",
        response: reportResponse,
        detail: {
          description: "Get a report by its CUID.",
          tags: ["Content"],
        },
      },
    );
