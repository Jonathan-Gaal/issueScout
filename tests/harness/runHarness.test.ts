import { describe, expect, it, vi } from "vitest";
import { runHarness } from "../../lib/server/harness/runHarness";
import type { GitHubClient } from "../../lib/server/github/types";
import type { ModelProvider, ModelResponse } from "../../lib/server/model/types";

const APPROVED_ISSUE_URL = "https://github.com/calcom/cal.diy/issues/42";

const VALID_MODEL_REPORT_JSON = {
  summary: "A clean bug report.",
  category: "bug_report",
  categoryReason: "Reproducible crash.",
  priority: "medium",
  priorityEvidence: "Known workaround exists.",
  priorityUncertainty: "None.",
  suggestedLabels: [],
  evidence: [],
  missingInformation: [],
  relatedIssues: [],
  recommendedNextStep: "Fix the input validation.",
  proposedActions: [],
  containsEmbeddedInstructions: false,
  limitations: [],
};

function createFakeGitHubClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    getIssue: vi.fn(async (number: number) => ({
      number,
      title: "Booking crashes on malformed month",
      body: "Steps to reproduce...",
      state: "open",
      labels: [],
      url: APPROVED_ISSUE_URL,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      retrievedAt: "2026-01-01T00:00:00Z",
    })),
    getComments: vi.fn(async () => ({ comments: [], truncated: false })),
    getLabels: vi.fn(async () => [{ name: "bug", description: null }]),
    searchIssues: vi.fn(async () => []),
    ...overrides,
  };
}

function createFakeModelProvider(responses: ModelResponse[]): ModelProvider {
  let callIndex = 0;
  return {
    complete: vi.fn(async () => {
      const response = responses[Math.min(callIndex, responses.length - 1)];
      callIndex += 1;
      return response;
    }),
  };
}

const alwaysAllowedRateCheck = async () => 0;

describe("runHarness", () => {
  it("(a) a clean fixture run returns status: completed with coverage.stopReason === 'completed'", async () => {
    const githubClient = createFakeGitHubClient();
    const modelProvider = createFakeModelProvider([
      { content: [{ type: "text", text: JSON.stringify(VALID_MODEL_REPORT_JSON) }], stopReason: "end_turn" },
    ]);

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("completed");
    expect(result.report?.coverage.stopReason).toBe("completed");
    expect(result.report?.summary).toBe(VALID_MODEL_REPORT_JSON.summary);
  });

  it("(b) a model that requests searches forever is stopped at MAX_MODEL_TURNS, returning a partial report, never undefined/throwing", async () => {
    const githubClient = createFakeGitHubClient();
    const infiniteSearchResponse: ModelResponse = {
      content: [{ type: "tool_use", id: "t1", name: "github_issue_research", input: { operation: "search", query: "crash" } }],
      stopReason: "tool_use",
    };
    const modelProvider = createFakeModelProvider([infiniteSearchResponse]);

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("stopped");
    expect(result.report).toBeDefined();
    expect(result.report?.coverage.stopReason).toBe("turn_limit");
  });

  it("(c) report.proposedActions is [] even when the model's raw output includes non-empty proposedActions", async () => {
    const githubClient = createFakeGitHubClient();
    const reportWithProposedActions = {
      ...VALID_MODEL_REPORT_JSON,
      proposedActions: [{ kind: "add_labels", labels: ["bug"] }],
    };
    const modelProvider = createFakeModelProvider([
      { content: [{ type: "text", text: JSON.stringify(reportWithProposedActions) }], stopReason: "end_turn" },
    ]);

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.report?.proposedActions).toEqual([]);
  });

  it("(d) a model whose first and retried output both fail zod validation returns status: failed, errorCode: model_output_invalid", async () => {
    const githubClient = createFakeGitHubClient();
    const modelProvider = createFakeModelProvider([
      { content: [{ type: "text", text: "not valid json at all" }], stopReason: "end_turn" },
      { content: [{ type: "text", text: "still not valid json" }], stopReason: "end_turn" },
    ]);

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("model_output_invalid");
  });

  it("(e) a forced GitHub rate-limit mid-run results in coverage.searchesFailed >= 1, never a report implying zero matches", async () => {
    const githubClient = createFakeGitHubClient({
      searchIssues: vi.fn(async () => ({ rateLimited: true as const })),
    });
    const modelProvider = createFakeModelProvider([
      {
        content: [{ type: "tool_use", id: "t1", name: "github_issue_research", input: { operation: "search", query: "crash" } }],
        stopReason: "tool_use",
      },
      { content: [{ type: "text", text: JSON.stringify(VALID_MODEL_REPORT_JSON) }], stopReason: "end_turn" },
    ]);

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.report?.coverage.searchesFailed).toBeGreaterThanOrEqual(1);
  });

  it("never constructs a model message array when the input check fails before any model call (invalid_url)", async () => {
    const githubClient = createFakeGitHubClient();
    const completeMock = vi.fn();
    const modelProvider: ModelProvider = { complete: completeMock };

    const result = await runHarness(
      { issueUrl: "not a url", userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("invalid_url");
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("never constructs a model message array when the input check fails before any model call (repo_not_allowed)", async () => {
    const githubClient = createFakeGitHubClient();
    const completeMock = vi.fn();
    const modelProvider: ModelProvider = { complete: completeMock };

    const result = await runHarness(
      { issueUrl: "https://github.com/octocat/hello-world/issues/1", userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("repo_not_allowed");
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("returns run_rate_limited and never calls the model or GitHub when the per-user rate limit is exceeded", async () => {
    const getIssueMock = vi.fn();
    const githubClient = createFakeGitHubClient({ getIssue: getIssueMock });
    const completeMock = vi.fn();
    const modelProvider: ModelProvider = { complete: completeMock };

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: async () => 10 }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("run_rate_limited");
    expect(completeMock).not.toHaveBeenCalled();
    expect(getIssueMock).not.toHaveBeenCalled();
  });

  it("returns not_found and never calls the model when the issue does not exist", async () => {
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async () => ({ notFound: true as const })),
    });
    const completeMock = vi.fn();
    const modelProvider: ModelProvider = { complete: completeMock };

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("not_found");
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("returns issue_too_long and never calls the model when the issue body exceeds ISSUE_MAX_CHARS", async () => {
    const hugeBody = "x".repeat(20001);
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async (number: number) => ({
        number,
        title: "Huge issue",
        body: hugeBody,
        state: "open",
        labels: [],
        url: APPROVED_ISSUE_URL,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        retrievedAt: "2026-01-01T00:00:00Z",
      })),
    });
    const completeMock = vi.fn();
    const modelProvider: ModelProvider = { complete: completeMock };

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("issue_too_long");
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("calls the injected persistRun callback with the final status and report", async () => {
    const githubClient = createFakeGitHubClient();
    const modelProvider = createFakeModelProvider([
      { content: [{ type: "text", text: JSON.stringify(VALID_MODEL_REPORT_JSON) }], stopReason: "end_turn" },
    ]);
    const persistRun = vi.fn(async (outcome: Record<string, unknown>) => {
      expect(outcome).toBeDefined();
    });

    await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck, persistRun }
    );

    expect(persistRun).toHaveBeenCalledTimes(1);
    expect(persistRun.mock.calls[0][0]).toMatchObject({ userId: "user-1", status: "completed" });
  });
});
