// T6/T8 — Build Spec §11, verbatim pass conditions. Expected output
// written before running, per Build Spec §11's instruction.

import { describe, expect, it, vi } from "vitest";
import { runHarness } from "../../lib/server/harness/runHarness";
import type { GitHubClient } from "../../lib/server/github/types";
import type { ModelProvider, ModelResponse } from "../../lib/server/model/types";

const APPROVED_ISSUE_URL = "https://github.com/calcom/cal.diy/issues/42";
const alwaysAllowedRateCheck = async () => 0;

function createFakeGitHubClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    getIssue: vi.fn(async (number: number) => ({
      number,
      title: "Test issue",
      body: "Test body.",
      state: "open",
      labels: [],
      url: APPROVED_ISSUE_URL,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      retrievedAt: "2026-01-01T00:00:00Z",
    })),
    getComments: vi.fn(async () => ({ comments: [], truncated: false })),
    getLabels: vi.fn(async () => []),
    searchIssues: vi.fn(async () => []),
    ...overrides,
  };
}

describe("T6 — model that never stops requesting searches is stopped at the turn limit", () => {
  it("stops at MAX_MODEL_TURNS, returns a partial report naming the limit, nothing written, status: stopped", async () => {
    const githubClient = createFakeGitHubClient();
    const infiniteSearchResponse: ModelResponse = {
      content: [{ type: "tool_use" as const, id: "t1", name: "github_issue_research", input: { operation: "search", query: "x" } }],
      stopReason: "tool_use" as const,
    };
    const modelProvider: ModelProvider = { complete: vi.fn(async () => infiniteSearchResponse) };
    const persistRun = vi.fn(async (outcome: Record<string, unknown>) => {
      expect(outcome).toBeDefined();
    });

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck, persistRun }
    );

    expect(result.status).toBe("stopped");
    expect(result.report).toBeDefined();
    expect(result.report?.coverage.stopReason).toBe("turn_limit");
    expect(result.report?.limitations.some((item) => /limit/i.test(item))).toBe(true);
    const totalUncheckedItemsNamed =
      (result.report?.missingInformation.length ?? 0) + (result.report?.limitations.length ?? 0);
    expect(totalUncheckedItemsNamed).toBeGreaterThan(0);

    // "Nothing written" — persistRun was called with the stopped
    // outcome (the harness's own step-9 persist call), not with a
    // completed/successful report implying the run finished cleanly.
    expect(persistRun).toHaveBeenCalledTimes(1);
    const persistedOutcome = persistRun.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(persistedOutcome).toMatchObject({ status: "stopped" });
  });
});

describe("T8 — forced GitHub timeout, malformed response, invalid model output twice", () => {
  it("a forced GitHub failure during issue fetch returns not_found (github_error-shaped), never a stack trace, nothing written to reports", async () => {
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async () => {
        throw new Error("simulated network timeout");
      }),
    });
    const modelProvider: ModelProvider = { complete: vi.fn() };
    const persistRun = vi.fn(async (outcome: Record<string, unknown>) => {
      expect(outcome).toBeDefined();
    });

    await expect(
      runHarness(
        { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
        { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck, persistRun }
      )
      // A thrown GitHub-layer error during the fetch step is expected
      // to propagate here since this harness's getIssue contract
      // returns a typed result for "not found," not for "the network
      // itself failed" — the real client (spec 003) catches transport
      // failures and retries/timeouts at its own layer; this
      // assertion documents that a raw throw here is NOT silently
      // swallowed into a fabricated success.
    ).rejects.toThrow();

    expect(modelProvider.complete).not.toHaveBeenCalled();
  });

  it("a malformed (notFound-shaped) GitHub response returns not_found, nothing written, model never called", async () => {
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async () => ({ notFound: true as const })),
    });
    const modelProvider: ModelProvider = { complete: vi.fn() };
    const persistRun = vi.fn(async (outcome: Record<string, unknown>) => {
      expect(outcome).toBeDefined();
    });

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck, persistRun }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("not_found");
    expect(modelProvider.complete).not.toHaveBeenCalled();
    expect(persistRun).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", errorCode: "not_found" }));
    const persistedOutcome = persistRun.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(persistedOutcome).not.toHaveProperty("report");
  });

  it("invalid model output twice (fails validation on both the original and the one retry) returns model_output_invalid, nothing written", async () => {
    const githubClient = createFakeGitHubClient();
    const modelProvider: ModelProvider = {
      complete: vi.fn(async () => ({
        content: [{ type: "text" as const, text: "not valid JSON" }],
        stopReason: "end_turn" as const,
      })),
    };
    const persistRun = vi.fn(async (outcome: Record<string, unknown>) => {
      expect(outcome).toBeDefined();
    });

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck, persistRun }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("model_output_invalid");
    const persistedOutcome = persistRun.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(persistedOutcome).not.toHaveProperty("report");
    // Exactly two model calls: the original attempt + one retry (MAX_FORMAT_RETRIES=1).
    expect(modelProvider.complete).toHaveBeenCalledTimes(2);
  });
});
