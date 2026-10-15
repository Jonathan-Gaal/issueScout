import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({
  create: vi.fn(async () => ({ id: "stored-run", user_id: "owner" })),
  updateStatus: vi.fn(async () => {}),
  reportCreate: vi.fn(async () => {}),
  getOwned: vi.fn(async () => ({ id: "stored-run", user_id: "owner", status: "completed" })),
}));
vi.mock("../lib/server/auth", () => ({
  verifySession: vi.fn(async () => ({ uid: "owner", email: "audit@example.com" })),
  isAllowlisted: vi.fn(() => true),
}));
vi.mock("../lib/server/db/runs", () => ({ runs: {
  admit: fakes.create, finish: vi.fn(async () => {}), create: fakes.create, updateStatus: fakes.updateStatus, getOwned: fakes.getOwned,
  countInLastHour: vi.fn(async () => 0), list: vi.fn(async () => []), hasRunBefore: vi.fn(async () => false),
} }));
vi.mock("../lib/server/db/reports", () => ({ reports: {
  create: fakes.reportCreate,
  getOwned: vi.fn(async () => ({ summary: "Saved report" })),
} }));
vi.mock("../lib/server/github/client", () => ({ RestGitHubClient: class {} }));
vi.mock("../lib/server/model", () => ({ getModelProvider: vi.fn(() => ({})) }));
vi.mock("../lib/server/harness/runHarness", () => ({ runHarness: vi.fn(async () => ({
  status: "completed", report: { summary: "Saved report" },
})) }));

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://issuescout.example.com"); });
afterEach(() => vi.unstubAllEnvs());
describe("API persistence wiring", () => {
  it("creates a stored run and returns that actual ID", async () => {
    const { POST } = await import("../app/api/runs/route");
    const response = await POST(new Request("https://issuescout.example.com/api/runs", {
      method: "POST", headers: { origin: "https://issuescout.example.com", "content-type": "application/json" },
      body: JSON.stringify({ issueUrl: "https://github.com/calcom/cal.diy/issues/42" }),
    }));
    expect(fakes.create).toHaveBeenCalled();
    expect((await response.json()).runId).toBe("stored-run");
  });
  it("returns the persisted report when an owner opens their run", async () => {
    const { GET } = await import("../app/api/runs/[id]/route");
    const response = await GET(new Request("https://issuescout.example.com/api/runs/stored-run", {
      headers: { origin: "https://issuescout.example.com" },
    }), { params: Promise.resolve({ id: "stored-run" }) });
    expect(response.status).toBe(200);
    expect((await response.json()).report).toEqual({ summary: "Saved report" });
  });
  it("provides explicit CORS preflight handling for bearer-token browser requests", async () => {
    const route = await import("../app/api/runs/route");
    expect(route).toHaveProperty("OPTIONS", expect.any(Function));
  });
});
