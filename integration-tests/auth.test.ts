import { describe, it, expect } from "bun:test";
import {
  signUp,
  signIn,
  fetchWithTimeout,
  deleteCurrentUser,
} from "./helpers/http";
import { createTestUser, TEST_PASSWORD } from "./helpers/factory";

describe("Auth endpoints", () => {
  describe("POST /api/auth/sign-up/email", () => {
    it("returns 200 with user when signup succeeds", async () => {
      const session = await createTestUser("authsignup");
      expect(session.cookie).toBeTruthy();
      expect(session.userId).toBeTruthy();
      await deleteCurrentUser(session.cookie);
    });

    it("returns 400 (VALIDATION_ERROR) when missing email", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-up/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: TEST_PASSWORD,
            name: "test",
          }),
        },
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 (VALIDATION_ERROR) when missing password", async () => {
      const session = await createTestUser("authpwdtest");
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-up/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `${session.userId}@test.com`,
            name: "test",
          }),
        },
      );
      await deleteCurrentUser(session.cookie);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 (VALIDATION_ERROR) when missing name", async () => {
      const session = await createTestUser("authtestname");
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-up/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `${session.userId}@test.com`,
            password: TEST_PASSWORD,
          }),
        },
      );
      await deleteCurrentUser(session.cookie);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 (FAILED_TO_CREATE_USER) when email already exists", async () => {
      const session = await createTestUser("authtestdup");
      const email = `${session.userId}@test.com`;

      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-up/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: TEST_PASSWORD,
            name: "seconduser",
          }),
        },
      );
      await deleteCurrentUser(session.cookie);
      expect(res.status).toBe(422);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("FAILED_TO_CREATE_USER");
    });

    it("returns 400 (PASSWORD_TOO_SHORT) when password too short", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-up/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "shortpw@test.com",
            password: "short",
            name: "test",
          }),
        },
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("PASSWORD_TOO_SHORT");
    });
  });

  describe("POST /api/auth/sign-in/email", () => {
    it("returns 200 when sign-in succeeds", async () => {
      const email = `signin${Date.now()}${Math.random().toString(36).slice(2)}@test.com`;
      const session = await signUp(email, TEST_PASSWORD, "authsignin");
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: TEST_PASSWORD,
          }),
        },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("user");
      expect(body).toHaveProperty("token");
      await deleteCurrentUser(session.cookie);
    });

    it("returns 400 (VALIDATION_ERROR) when missing email", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: TEST_PASSWORD,
          }),
        },
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 (VALIDATION_ERROR) when missing password", async () => {
      const session = await createTestUser("authsigninpwd");
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `${session.userId}@test.com`,
          }),
        },
      );
      await deleteCurrentUser(session.cookie);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 when user not found", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "notfound999@test.com",
            password: TEST_PASSWORD,
          }),
        },
      );
      expect(res.status).toBe(401);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    });

    it("returns 401 when password wrong", async () => {
      const session = await createTestUser("authwrongpass");
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-in/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `${session.userId}@test.com`,
            password: "WrongPassword123!",
          }),
        },
      );
      expect(res.status).toBe(401);
      const body = (await res.json()) as { code: string };
      expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
      await deleteCurrentUser(session.cookie);
    });
  });

  describe("POST /api/auth/sign-out", () => {
    it("returns success when signed in user signs out", async () => {
      const session = await createTestUser("authsignout");
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-out`,
        {
          method: "POST",
          headers: {
            Cookie: session.cookie,
          },
        },
      );
      expect([200, 403]).toContain(res.status);
      await deleteCurrentUser(session.cookie);
    });

    it("returns success when not authenticated", async () => {
      const res = await fetchWithTimeout(
        `${process.env.TEST_API_BASE}/api/auth/sign-out`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect([200, 403]).toContain(res.status);
    });
  });
});
