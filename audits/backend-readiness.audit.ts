import { afterEach, describe, expect, it, vi } from "vitest";
import { parseIssueUrl } from "../lib/server/github/urlParsing";
import { RestGitHubClient } from "../lib/server/github/client";
import { executeToolCall, createInitialToolCallRunState } from "../lib/server/harness/toolExecutor";
import { runHarness } from "../lib/server/harness/runHarness";
import { config } from "../lib/server/config";
import type { GitHubClient } from "../lib/server/github/types";
import type { ModelProvider } from "../lib/server/model/types";
import fixture from "../tests/fixtures/model/valid-bug-report.json";

const url = "https://github.com/calcom/cal.diy/issues/42";
const issue = {
  number: 42, title: "Booking crash", body: "A reproducible error", state: "open",
  labels: [], url, createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z", retrievedAt: "2026-01-01T00:00:00Z",
};
function github(): GitHubClient {
  return {
    getIssue: vi.fn(async () => issue),
    getComments: vi.fn(async () => ({ comments: [], truncated: false })),
    getLabels: vi.fn(async () => [{ name: "bug", description: null }]),
    searchIssues: vi.fn(async () => []),
  };
}
function finalResponse() {
  const report = { ...fixture } as Record<string, unknown>;
  delete report._fixture;
  return { content: [{ type: "text" as const, text: JSON.stringify(report) }], stopReason: "end_turn" as const };
}
function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Backend readiness requirements", () => {
  it("accepts a well-formed HTTPS issue URL (control)", () => {
    expect(parseIssueUrl(url).ok).toBe(true);
  });
  it("rejects HTTP URLs under the agreed HTTPS-only policy", () => {
    expect(parseIssueUrl(url.replace("https:", "http:")).ok).toBe(false);
  });
  it("rejects issue numbers that cannot be represented exactly", () => {
    expect(parseIssueUrl(url.replace("42", "9007199254740993")).ok).toBe(false);
  });
  it("does not treat an issue-endpoint pull request as an issue", async () => {
    respond(200, { number: 42, title: "PR", body: "changes", state: "open", html_url: url, pull_request: {} });
    let acceptedIssue = false;
    try { acceptedIssue = !("notFound" in await new RestGitHubClient("calcom/cal.diy").getIssue(42)); } catch { /* rejection is valid */ }
    expect(acceptedIssue).toBe(false);
  });
  it("does not convert a comments outage into a successful empty list", async () => {
    respond(503, { message: "unavailable" });
    let value: unknown;
    try { value = await new RestGitHubClient("calcom/cal.diy").getComments(42, 20); } catch { value = "explicit failure"; }
    expect(value).not.toEqual({ comments: [], truncated: false });
  });
  it("does not convert malformed search JSON into no matches", async () => {
    respond(200, { unexpected: true });
    expect(await new RestGitHubClient("calcom/cal.diy").searchIssues("crash", 10, 42)).not.toEqual([]);
  });
  it("rejects a candidate from outside the bound repository", async () => {
    respond(200, { items: [{ number: 7, title: "outside", state: "open", html_url: "https://github.com/other/project/issues/7" }] });
    const result = await new RestGitHubClient("calcom/cal.diy").searchIssues("crash repo:other/project", 10, 42);
    expect(Array.isArray(result) ? result : []).toEqual([]);
  });
  it("enforces the read budget for failed attempts too", async () => {
    const client = github();
    client.getIssue = vi.fn(async () => ({ notFound: true as const }));
    const state = createInitialToolCallRunState();
    for (let i = 0; i < config.maxCandidateReads + 3; i++) {
      await executeToolCall({ operation: "read", issueNumber: 99 }, client, 42, state);
    }
    expect(client.getIssue).toHaveBeenCalledTimes(config.maxCandidateReads);
  });
  it("returns a structured failure when initial retrieval throws", async () => {
    const client = github();
    client.getIssue = vi.fn(async () => { throw new Error("upstream failure"); });
    const model: ModelProvider = { complete: vi.fn(async () => finalResponse()) };
    await expect(runHarness({ issueUrl: url, userId: "audit-user" }, {
      githubClient: client, modelProvider: model, countRunsInLastHour: async () => 0,
    })).resolves.toMatchObject({ status: "failed", errorCode: expect.any(String) });
  });
  it("refuses an unknown model tool without making a GitHub search", async () => {
    const client = github();
    const model: ModelProvider = { complete: vi.fn()
      .mockResolvedValueOnce({ content: [{ type: "tool_use", id: "a", name: "unregistered_tool", input: { operation: "search", query: "crash" } }], stopReason: "tool_use" })
      .mockResolvedValue(finalResponse()) };
    await runHarness({ issueUrl: url, userId: "audit-user" }, {
      githubClient: client, modelProvider: model, countRunsInLastHour: async () => 0,
    });
    expect(client.searchIssues).not.toHaveBeenCalled();
  });
  it("enforces the run deadline while a model call is pending", async () => {
    vi.useFakeTimers();
    const model: ModelProvider = { complete: vi.fn(() => new Promise<never>(() => {})) };
    const promise = runHarness({ issueUrl: url, userId: "audit-user" }, {
      githubClient: github(), modelProvider: model, countRunsInLastHour: async () => 0,
    });
    let settled = false;
    void promise.then(() => { settled = true; }, () => { settled = true; });
    await vi.advanceTimersByTimeAsync((config.maxRunSeconds + 1) * 1000);
    expect(settled).toBe(true);
  });
});
