import { describe, it, expect } from "bun:test";
import { fetchWithTimeout } from "./helpers/http";

const base = () => process.env.TEST_API_BASE!;

describe("Ping endpoint", () => {
  describe("GET / (unauthenticated)", () => {
    it("returns 200 with ok status", async () => {
      const res = await fetchWithTimeout(`${base()}/api/`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("ok");
      expect(body.ok).toBe(true);
    });
  });
});
