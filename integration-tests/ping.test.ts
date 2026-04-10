import { describe, it, expect } from "bun:test";
import { fetchWithTimeout, apiBase } from "./helpers/http";

describe("Ping endpoint", () => {
  describe("GET / (unauthenticated)", () => {
    it("returns 200 with ok status", async () => {
      const res = await fetchWithTimeout(`${apiBase()}/api/`);
      expect(res.status).toBe(200);

      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toHaveProperty("ok");
      expect(body.ok).toBe(true);
    });
  });
});
