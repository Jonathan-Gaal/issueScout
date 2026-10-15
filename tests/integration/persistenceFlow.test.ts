import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../fixtures/model/valid-bug-report.json";
import type { RunHarnessDependencies } from "../../lib/server/harness/runHarness";
const state = vi.hoisted(() => ({ outcome: null as null | Parameters<NonNullable<RunHarnessDependencies["persistRun"]>>[0], failWrite: false, allowed: true }));
vi.mock("../../lib/server/auth", () => ({ verifySession: async () => ({ uid: "owner", email: "owner@example.com" }), isAllowlisted: () => true }));
vi.mock("../../lib/server/db/runs", () => ({ runs: {
  admit: vi.fn(async () => state.allowed ? { id: "saved-run" } : null),
  finish: vi.fn(async (_id, _user, _repo, outcome) => { if (state.failWrite) throw new Error("private upstream text"); state.outcome = outcome; }),
  getOwned: async (id: string, user: string) => id === "saved-run" && user === "owner" ? { id, status: state.outcome?.status } : null,
} }));
vi.mock("../../lib/server/db/reports", () => ({ reports: { getOwned: async () => state.outcome?.report ?? null } }));
vi.mock("../../lib/server/github/client", () => ({ RestGitHubClient: class {
  async getIssue() { return { number: 42, title: "Crash", body: "Repro", state: "open", labels: [], url: "https://github.com/calcom/cal.diy/issues/42", retrievedAt: "2026-01-01T00:00:00Z" }; }
  async getComments() { return { comments: [], truncated: false }; }
  async getLabels() { return []; }
} }));
vi.mock("../../lib/server/model", () => ({ getModelProvider: () => ({ complete: async () => {
  const report: Record<string, unknown> = { ...fixture }; delete report._fixture;
  return { content: [{ type: "text", text: JSON.stringify(report) }], stopReason: "end_turn" };
} }) }));
beforeEach(() => { vi.resetModules(); vi.stubEnv("CORS_ALLOWED_ORIGINS", "https://test.example"); state.outcome = null; state.failWrite = false; state.allowed = true; });
afterEach(() => vi.unstubAllEnvs());
function request() { return new Request("https://test.example/api/runs", { method: "POST", headers: { origin: "https://test.example" }, body: JSON.stringify({ issueUrl: "https://github.com/calcom/cal.diy/issues/42" }) }); }
it("runs the real harness, saves the exact report, then retrieves it by returned ID", async () => {
  const { POST } = await import("../../app/api/runs/route");
  const response = await POST(request());
  expect(response.status).toBe(200);
  const created = await response.json();
  expect(created.runId).toBe("saved-run");
  expect(state.outcome?.report).toEqual(created.report);
  expect(state.outcome?.modelTurnsUsed).toBe(2);
  const { GET } = await import("../../app/api/runs/[id]/route");
  const loaded = await GET(new Request("https://test.example/api/runs/saved-run", { headers: { origin: "https://test.example" } }), { params: Promise.resolve({ id: created.runId }) });
  expect(loaded.status).toBe(200);
  expect((await loaded.json()).report).toEqual(created.report);
});
it("does not return success or private upstream text when database persistence fails", async () => {
  state.failWrite = true;
  const { POST } = await import("../../app/api/runs/route");
  const response = await POST(request());
  expect(response.status).toBe(502);
  const body = await response.json();
  expect(body.error.code).toBe("write_failed");
  expect(JSON.stringify(body)).not.toContain("private upstream text");
});
it("rejects an exhausted admission before the harness can create a report", async () => {
  state.allowed = false;
  const { POST } = await import("../../app/api/runs/route");
  const response = await POST(request());
  expect(response.status).toBe(429);
  expect(state.outcome).toBeNull();
});
