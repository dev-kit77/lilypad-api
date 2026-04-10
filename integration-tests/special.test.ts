import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  authedFetch,
  deleteCurrentUser,
  deleteReport,
  fetchWithTimeout,
  trackForCleanup,
  cleanupAll,
  apiBase,
  type AuthSession,
} from "./helpers/http";
import {
  createTestUser,
  createTestAdmin,
  createTestUserReport,
} from "./helpers/factory";

describe("Special (Reports) endpoints", () => {
  let reporterSession: AuthSession;
  let targetSession: AuthSession;
  let adminSession: AuthSession;
  let createdReportId: string;

  beforeAll(async () => {
    reporterSession = await createTestUser("reporter");
    targetSession = await createTestUser("target-special");
    adminSession = await createTestAdmin();
    trackForCleanup({ type: "user", id: reporterSession.userId, cookie: reporterSession.cookie });
    trackForCleanup({ type: "user", id: targetSession.userId, cookie: targetSession.cookie });
    trackForCleanup({ type: "user", id: adminSession.userId, cookie: adminSession.cookie });

    const reportRes = await createTestUserReport(
      reporterSession.cookie,
      targetSession.userId,
      "Test report",
      "Inappropriate behavior",
    );

    createdReportId = reportRes.report.id;
    trackForCleanup({ type: "report", id: createdReportId, cookie: adminSession.cookie });
  });

  afterAll(async () => {
    await cleanupAll();
  });

  describe("GET /api/special (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special/${createdReportId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special/${createdReportId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved: true, actionTaken: "warned" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special/${createdReportId}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/special (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch("/special", reporterSession.cookie);
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/special (admin)", () => {
    it("returns 200 with reports array containing created report", async () => {
      const res = await authedFetch("/special", adminSession.cookie);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("reports");
      expect(Array.isArray(body.reports)).toBe(true);

      const reports = body.reports as Array<{
        id: string;
        userID: string;
      }>;
      expect(reports.length).toBeGreaterThan(0);

      const targetReports = reports.filter((r) => r.id === createdReportId);
      expect(targetReports.length).toEqual(1);
      expect(targetReports[0]?.userID).toBe(reporterSession.userId);
    });
  });

  describe("GET /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special/${createdReportId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/special/:reportId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/special/${createdReportId}`,
        reporterSession.cookie,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/special/:reportId (admin, valid ID)", () => {
    it("returns 200 with report object", async () => {
      const res = await authedFetch(
        `/special/${createdReportId}`,
        adminSession.cookie,
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("report");

      const report = body.report as Record<string, unknown>;
      expect(report).toHaveProperty("id");
      expect(report).toHaveProperty("userID");
      expect(report).toHaveProperty("reason");
      expect(report).toHaveProperty("content");
      expect(report).toHaveProperty("time");
      expect(report).toHaveProperty("resolved");
      expect(report).toHaveProperty("reportedUserID");
    });
  });

  describe("GET /api/special/:reportId (admin, invalid ID)", () => {
    it("returns 404 for a non-existent report", async () => {
      const res = await authedFetch(
        "/special/non-existent-report-id",
        adminSession.cookie,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special/${createdReportId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved: true, actionTaken: "warned" }),
        },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/special/:reportId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/special/${createdReportId}`,
        reporterSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ resolved: true, actionTaken: "warned" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/special/:reportId (admin, resolve report)", () => {
    it("returns 200 with report object when resolving a report", async () => {
      const res = await authedFetch(
        `/special/${createdReportId}`,
        adminSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ resolved: true, actionTaken: "user_warned" }),
        },
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        report: {
          id: string;
          resolved: boolean;
          action?: string;
        };
      };
      expect(body.report).toHaveProperty("id");
      expect(body.report).toHaveProperty("resolved");
      expect(body.report.resolved).toBe(true);
      expect(body.report.action).toBe("user_warned");
    });
  });

  describe("PUT /api/special/:reportId (admin, non-existent ID)", () => {
    it("returns 400 for a non-existent report", async () => {
      const res = await authedFetch(
        "/special/non-existent-report-id",
        adminSession.cookie,
        {
          method: "PUT",
          body: JSON.stringify({ resolved: true }),
        },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${apiBase()}/api/special/${createdReportId}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/special/:reportId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/special/${createdReportId}`,
        reporterSession.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/special/:reportId (admin, valid ID)", () => {
    it("returns 200 when deleting a report", async () => {
      const res = await authedFetch(
        `/special/${createdReportId}`,
        adminSession.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("status");
      expect(body.status).toBe("OK");
    });
  });

  describe("DELETE /api/special/:reportId (admin, non-existent ID)", () => {
    it("returns 404 for a non-existent report", async () => {
      const res = await authedFetch(
        "/special/non-existent-report-id",
        adminSession.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(404);
    });
  });
});
