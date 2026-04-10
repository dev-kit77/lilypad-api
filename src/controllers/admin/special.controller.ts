import { Elysia } from "elysia";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import {
  reportResponse,
  getReportsResponse,
  updateReportBody,
  updateReportResponse,
  deleteReportResponse,
} from "../../models/controllers/admin.models";
import { log } from "../../../lib/log";
import { ERROR_CODES } from "../../models/controllers/error-codes.models";

export const specialController = (app: Elysia) =>
  app
    .use(authPlugin)
    .get(
      "/special",
      async () => {
        log.out(`GET request at /special`, "special-controller");

        const reports = await prisma.report.findMany({
          where: { resolved: false },
          orderBy: { time: "asc" },
        });

        return {
          reports: reports.map((report) => ({
            id: report.CUID,
            userID: report.userID,
            reason: report.reason,
            content: report.content,
            time: report.time,
            resolved: report.resolved,
            ...(report.action ? { action: report.action } : {}),
            ...(report.reportedPostID
              ? { reportedPostID: report.reportedPostID }
              : {}),
            ...(report.reportedUserID
              ? { reportedUserID: report.reportedUserID }
              : {}),
          })),
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
            return { error: ERROR_CODES.INVALID_ID };
          }

          return {
            report: {
              id: report.CUID,
              userID: report.userID,
              reason: report.reason,
              content: report.content,
              time: report.time,
              resolved: report.resolved,
              ...(report.action ? { action: report.action } : {}),
              ...(report.reportedPostID
                ? { reportedPostID: report.reportedPostID }
                : {}),
              ...(report.reportedUserID
                ? { reportedUserID: report.reportedUserID }
                : {}),
            },
          };
        } catch (e) {
          set.status = 400;
          log.err(400, `Failed to get report: ${e}`, "content-controller");
          return { error: ERROR_CODES.INVALID_FIELD };
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
    )
    .put(
      "/special/:reportId",
      async ({ body, params, set }) => {
        log.out(
          `PUT request at /special/${params.reportId}`,
          "special-controller",
        );
        try {
          log.out(
            `Updating report ${params.reportId} to resolved ${body.resolved} with action ${body.actionTaken}`,
            "special-controller",
          );

          const result = await prisma.report.update({
            where: { CUID: params.reportId },
            data: {
              resolved: body.resolved ?? false,
              action: body.actionTaken,
            },
          });

          if (!result) {
            set.status = 404;
            log.err(
              404,
              `Report ${params.reportId} not found`,
              "special-controller",
            );
            return { error: ERROR_CODES.INVALID_ID };
          }
          log.success(
            `Updated report ${params.reportId} to resolved ${body.resolved} with action ${body.actionTaken}`,
            "special-controller",
          );

          log.out(
            `Fetching updated report ${params.reportId}`,
            "special-controller",
          );

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
            return { error: ERROR_CODES.INVALID_ID };
          }

          log.success(`Found report ${params.reportId}`, "special-controller");

          return {
            report: {
              id: report.CUID,
              userID: report.userID,
              reason: report.reason,
              content: report.content,
              time: report.time,
              resolved: report.resolved,
              ...(report.action ? { action: report.action } : {}),
              ...(report.reportedPostID
                ? { reportedPostID: report.reportedPostID }
                : {}),
              ...(report.reportedUserID
                ? { reportedUserID: report.reportedUserID }
                : {}),
            },
          };
        } catch (e) {
          set.status = 400;
          log.err(400, `Invalid field: ${e}`, "special-controller");
          return { error: ERROR_CODES.INVALID_FIELD };
        }
      },
      {
        auth: "admin",
        body: updateReportBody,
        response: updateReportResponse,
        detail: {
          description: "Update a report by its CUID.",
          tags: ["Content"],
        },
      },
    )
    .delete(
      "/special/:reportId",
      async ({ params, set }) => {
        log.out(
          `DELETE request at /special/${params.reportId}`,
          "special-controller",
        );

        try {
          await prisma.report.delete({
            where: { CUID: params.reportId },
          });

          log.success(
            `Deleted report ${params.reportId}`,
            "special-controller",
          );

          return { status: "OK" };
        } catch (e) {
          set.status = 404;
          log.err(
            404,
            `Report not found: ${params.reportId}`,
            "special-controller",
          );
          return { error: ERROR_CODES.INVALID_ID };
        }
      },
      {
        auth: "admin",
        response: deleteReportResponse,
        detail: {
          description: "Delete a report by its CUID.",
          tags: ["Content"],
        },
      },
    );
