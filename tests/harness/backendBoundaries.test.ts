import { afterEach, expect, it, vi } from "vitest";
import { runHarness } from "../../lib/server/harness/runHarness";
import { executeToolCall, createInitialToolCallRunState } from "../../lib/server/harness/toolExecutor";
import type { GitHubClient } from "../../lib/server/github/types";
import type { ModelResponse } from "../../lib/server/model/types";
import { config } from "../../lib/server/config";
const issueUrl = "https://github.com/calcom/cal.diy/issues/42";
function github(): GitHubClient { return {
  getIssue: vi.fn(async () => ({ number: 42, title: "Test", body: "Test", state: "open", url: issueUrl, labels: [], createdAt: "2026-01-01", updatedAt: "2026-01-01", retrievedAt: "2026-01-01" })),
  getComments: vi.fn(async () => ({ comments: [], truncated: false })), getLabels: vi.fn(async () => []), searchIssues: vi.fn(async () => []),
}; }
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
it.each([null, {}, { operation: "delete" }, { operation: "read", issueNumber: -1 }, { operation: "read", issueNumber: 1.5 }, { operation: "search", query: "test", repo: "other/repo" }])("rejects invalid tool arguments before I/O: %j", async input => {
  const client = github();
  expect((await executeToolCall(input, client, 42, createInitialToolCallRunState())).outcome).toBe("refused");
  expect(client.getIssue).not.toHaveBeenCalled(); expect(client.searchIssues).not.toHaveBeenCalled();
});
it("bounds a stalled initial read and records the failure once", async () => {
  vi.useFakeTimers(); const client = github();
  client.getIssue = vi.fn(() => new Promise<never>(() => {}));
  const persistRun = vi.fn(async () => {}); const complete = vi.fn();
  const result = runHarness({ issueUrl, userId: "test" }, { githubClient: client, modelProvider: { complete }, countRunsInLastHour: async () => 0, persistRun });
  await vi.advanceTimersByTimeAsync(config.maxRunSeconds * 1000 + 1);
  expect(await result).toEqual({ status: "failed", errorCode: "timeout" });
  expect(persistRun).toHaveBeenCalledTimes(1); expect(complete).not.toHaveBeenCalled();
});
it("a late model response cannot execute a tool or persist a second outcome", async () => {
  vi.useFakeTimers(); const client = github(); let resolve!: (response: ModelResponse) => void;
  const complete = vi.fn(() => new Promise<ModelResponse>(r => { resolve = r; })); const persistRun = vi.fn(async () => {});
  const result = runHarness({ issueUrl, userId: "test" }, { githubClient: client, modelProvider: { complete }, countRunsInLastHour: async () => 0, persistRun });
  await vi.advanceTimersByTimeAsync(config.maxRunSeconds * 1000 + 1);
  expect(await result).toMatchObject({ status: "stopped", report: { coverage: { stopReason: "time_limit" } } });
  resolve({ content: [{ type: "tool_use", name: "github_issue_research", id: "late", input: { operation: "search", query: "crash" } }], stopReason: "tool_use" });
  await vi.advanceTimersByTimeAsync(1);
  expect(client.searchIssues).not.toHaveBeenCalled(); expect(persistRun).toHaveBeenCalledTimes(1);
});
it("format repair cannot exceed the model-turn limit", async () => {
  const original = config.maxModelTurns;
  config.maxModelTurns = 1;
  const complete = vi.fn(async () => ({ content: [{ type: "text" as const, text: "bad json" }], stopReason: "end_turn" as const }));
  const result = await runHarness({ issueUrl, userId: "test" }, { githubClient: github(), modelProvider: { complete }, countRunsInLastHour: async () => 0 });
  config.maxModelTurns = original;
  expect(result.status).toBe("failed"); expect(complete).toHaveBeenCalledTimes(1);
});
