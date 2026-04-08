import { describe, it, expect } from "bun:test";

const base = () => process.env.TEST_API_BASE!;
const LIMIT = 300;

describe("Rate limiting", () => {
  it("returns 429 after exceeding per-IP request limit on /api/", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

    let lastStatus = 0;
    let lastHeaders: Headers | undefined;

    for (let i = 0; i < LIMIT + 1; i++) {
      const res = await fetch(`${base()}/api/`, {
        headers: {
          "x-forwarded-for": ip,
        },
      });
      lastStatus = res.status;
      lastHeaders = res.headers;
    }

    expect(lastStatus).toBe(429);
    expect(lastHeaders?.get("retry-after")).not.toBeNull();
    expect(lastHeaders?.get("x-ratelimit-limit")).toBe(String(LIMIT));
  });
});
