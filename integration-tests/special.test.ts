import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  signUp,
  signIn,
  authedFetch,
  deleteCurrentUser,
  deleteReport,
  promoteUserToAdminForTest,
  fetchWithTimeout,
  type AuthSession,
} from "./helpers/http";

describe("Special (Reports) endpoints", () => {
  let reporterSession: AuthSession;
  let targetSession: AuthSession;
  let createdReport: {
    id: string;
    userID: string;
    reason: string;
    content: string;
    time: string;
    resolved: boolean;
    action?: string;
    reportedPostID?: string;
    reportedUserID?: string;
  } | null = null;
  let adminSession: AuthSession;
  let reportId: string | null = null;

  beforeAll(async () => {
    reporterSession = await signUp(
      `reporter-${Date.now()}@test.com`,
      "password1234",
      `reporter${Date.now()}`,
    );
    targetSession = await signUp(
      `target-special-${Date.now()}@test.com`,
      "password1234",
      `target${Date.now()}`,
    );

    const adminEmail = `admin-special-${Date.now()}@test.com`;
    const adminPassword = "password1234";
    adminSession = await signUp(
      adminEmail,
      adminPassword,
      `adminspecial${Date.now()}`,
    );
    await promoteUserToAdminForTest(adminSession.userId);
    adminSession = await signIn(adminEmail, adminPassword);

    const reportRes = await authedFetch(
      `/user/${targetSession.userId}/report`,
      reporterSession.cookie,
      {
        method: "POST",
        body: JSON.stringify({
          reason: "Test report",
          content: "Inappropriate behavior",
        }),
      },
    );
    expect(reportRes.status).toBe(200);

    const reportsRes = await authedFetch("/special", adminSession.cookie);
    const reportBody = (await reportRes.json()) as {
      report: {
        id: string;
        userID: string;
        reason: string;
        content: string;
        time: string;
        resolved: boolean;
        action?: string;
        reportedPostID?: string;
        reportedUserID?: string;
      };
    };
    createdReport = reportBody.report;
  });

  afterAll(async () => {
    if (reportId) {
      await deleteReport(adminSession.cookie, reportId);
    }
    if (reporterSession?.cookie) {
      await deleteCurrentUser(reporterSession.cookie);
    }
    if (targetSession?.cookie) {
      await deleteCurrentUser(targetSession.cookie);
    }
    if (adminSession?.cookie) {
      await deleteCurrentUser(adminSession.cookie);
    }
  });

  describe("GET /api/special (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/special`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/special/${reportId ?? "some-id"}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/special/${reportId ?? "some-id"}`,
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
        `${process.env.TEST_API_BASE}/api/special/${reportId ?? "some-id"}`,
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

      const targetReports = reports.filter((r) => r.id === createdReport?.id);
      expect(targetReports.length).toEqual(1);
      expect(targetReports[0]?.userID).toBe(reporterSession.userId);
    });
  });

  describe("GET /api/special/:reportId (unauthenticated)", () => {
    it("returns 401", async () => {
      const res = await fetch(
        `${process.env.TEST_API_BASE}/api/special/${createdReport?.id ?? "some-id"}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/special/:reportId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/special/${createdReport?.id ?? "some-id"}`,
        reporterSession.cookie,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/special/:reportId (admin, valid ID)", () => {
    it("returns 200 with report object", async () => {
      const res = await authedFetch(
        `/special/${createdReport?.id ?? "some-id"}`,
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
      const res = await fetch(
        `${process.env.TEST_API_BASE}/api/special/${createdReport?.id ?? "some-id"}`,
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
        `/special/${createdReport?.id ?? "some-id"}`,
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
        `/special/${createdReport?.id ?? "some-id"}`,
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
      const res = await fetch(
        `${process.env.TEST_API_BASE}/api/special/${createdReport?.id ?? "some-id"}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/special/:reportId (non-admin)", () => {
    it("returns 403 for a regular user", async () => {
      const res = await authedFetch(
        `/special/${createdReport?.id ?? "some-id"}`,
        reporterSession.cookie,
        { method: "DELETE" },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/special/:reportId (admin, valid ID)", () => {
    it("returns 200 when deleting a report", async () => {
      const res = await authedFetch(
        `/special/${createdReport?.id ?? "some-id"}`,
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
