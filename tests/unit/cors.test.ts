import { afterEach, beforeEach, expect, it, vi } from "vitest";
beforeEach(() => { vi.resetModules(); vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://app.example"); });
afterEach(() => vi.unstubAllEnvs());
it("allows a bearer-token browser preflight without requiring credentials on OPTIONS", async () => {
  const { handlePreflight } = await import("../../lib/server/cors");
  const response = handlePreflight(new Request("https://app.example/api/runs", { method: "OPTIONS", headers: { origin: "https://app.example", "access-control-request-method": "POST", "access-control-request-headers": "authorization, content-type" } }));
  expect(response.status).toBe(204); expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example");
});
it("denies preflight from an unlisted origin", async () => {
  const { handlePreflight } = await import("../../lib/server/cors");
  const response = handlePreflight(new Request("https://app.example/api/runs", { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } }));
  expect(response.status).toBe(403); expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
});
it("accepts a same-origin browser GET with no Origin but rejects an unknown origin", async () => {
  const { checkCorsOrigin } = await import("../../lib/server/cors");
  expect(checkCorsOrigin(new Request("https://app.example/api/runs", { headers: { "sec-fetch-site": "same-origin" } })).allowed).toBe(true);
  expect(checkCorsOrigin(new Request("https://other.example/api/runs", { headers: { "sec-fetch-site": "same-origin" } })).allowed).toBe(false);
});
