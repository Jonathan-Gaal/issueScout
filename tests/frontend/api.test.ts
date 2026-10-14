import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ currentUser: { getIdToken: vi.fn(async () => "test-id-token") } as { getIdToken: () => Promise<string> } | null }));
vi.mock("../../lib/client/firebase", () => ({ clientAuth: () => auth }));
import { api, ApiFailure } from "../../lib/client/api";
afterEach(() => { vi.unstubAllGlobals(); auth.currentUser = { getIdToken: vi.fn(async () => "test-id-token") }; });
describe("frontend authenticated API boundary", () => {
  it("attaches the token centrally and keeps a partial HTTP 200 result", async () => {
    const result = { status: "stopped", report: { coverage: { stopReason: "time_limit" } } };
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(result))); vi.stubGlobal("fetch", fetch);
    expect(await api("/api/runs", { method: "POST", body: JSON.stringify({ issueUrl: "https://github.com/calcom/cal.diy/issues/1" }) })).toEqual(result);
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/runs");
    const options = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer test-id-token");
  });
  it("does not call the backend when signed out", async () => {
    auth.currentUser = null; const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(api("/api/runs")).rejects.toBeInstanceOf(ApiFailure); expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves the backend's exact error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "not_found", message: "Run not found." } }), { status: 404 })));
    await expect(api("/api/runs/unknown")).rejects.toMatchObject({ code: "not_found", message: "Run not found." });
  });
  it("never sends a token to an absolute external URL", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(api("https://example.com/api/runs")).rejects.toThrow("Invalid API path"); expect(fetch).not.toHaveBeenCalled();
  });
});
