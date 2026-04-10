/**
 * Preload for integration tests (see bunfig.toml).
 * Expects the API to be running (e.g. `docker compose up`) at TEST_API_BASE.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { apiBase } from "./helpers/http";

config({ path: resolve(process.cwd(), ".env") });

process.env.TEST_API_BASE = (
  process.env.TEST_API_BASE ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");

// Must match the API container (see docker-compose TEST_ADMIN_PROMOTE_SECRET).
if (!process.env.TEST_ADMIN_PROMOTE_SECRET?.trim()) {
  process.env.TEST_ADMIN_PROMOTE_SECRET = "lilypad-local-test-promote-only";
}

const probe = await fetch(`${apiBase()}/api/user`, {
  method: "GET",
  signal: AbortSignal.timeout(8000),
}).catch((e: unknown) => {
  throw new Error(
    `API not reachable at ${apiBase()}. Start the server (e.g. docker compose up). Cause: ${e}`,
  );
});

if (probe.status !== 401) {
  console.warn(
    `[test/setup] GET /api/user returned ${probe.status} (expected 401 without cookie). Check TEST_API_BASE.`,
  );
}
