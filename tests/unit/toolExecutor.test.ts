import { describe, expect, it, vi } from "vitest";
import {
  GITHUB_ISSUE_RESEARCH_TOOL,
  createInitialToolCallRunState,
  executeToolCall,
} from "../../lib/server/harness/toolExecutor";
import type { GitHubClient } from "../../lib/server/github/types";

function createFakeGitHubClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    getIssue: vi.fn(async (number: number) => ({
      number,
      title: "fake issue",
      body: "fake body",
      state: "open",
      labels: [],
      url: `https://github.com/calcom/cal.diy/issues/${number}`,
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

describe("GITHUB_ISSUE_RESEARCH_TOOL", () => {
  it("contains no owner/repo property at any nesting level of its schema", () => {
    const serializedTool = JSON.stringify(GITHUB_ISSUE_RESEARCH_TOOL);
    expect(serializedTool).not.toContain('"owner"');
    expect(serializedTool).not.toContain('"repo"');
  });
});

describe("executeToolCall", () => {
  it("refuses the 4th search once MAX_SEARCHES=3 is reached, without calling searchIssues a 4th time", async () => {
    const searchIssuesMock = vi.fn(async () => []);
    const githubClient = createFakeGitHubClient({ searchIssues: searchIssuesMock });
    const runState = createInitialToolCallRunState();

    for (let callIndex = 0; callIndex < 3; callIndex++) {
      const result = await executeToolCall(
        { operation: "search", query: "crash" },
        githubClient,
        1,
        runState
      );
      expect(result.outcome).toBe("ok");
    }

    const fourthResult = await executeToolCall(
      { operation: "search", query: "crash" },
      githubClient,
      1,
      runState
    );

    expect(fourthResult.outcome).toBe("refused");
    expect(searchIssuesMock).toHaveBeenCalledTimes(3);
  });

  it("refuses the 6th candidate read once MAX_CANDIDATE_READS=5 is reached, without calling getIssue a 6th time", async () => {
    const getIssueMock = vi.fn(async (number: number) => ({
      number,
      title: "fake issue",
      body: "fake body",
      state: "open",
      labels: [],
      url: `https://github.com/calcom/cal.diy/issues/${number}`,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      retrievedAt: "2026-01-01T00:00:00Z",
    }));
    const githubClient = createFakeGitHubClient({ getIssue: getIssueMock });
    const runState = createInitialToolCallRunState();

    for (let callIndex = 0; callIndex < 5; callIndex++) {
      const result = await executeToolCall(
        { operation: "read", issueNumber: callIndex + 2 },
        githubClient,
        1,
        runState
      );
      expect(result.outcome).toBe("ok");
    }

    const sixthResult = await executeToolCall(
      { operation: "read", issueNumber: 99 },
      githubClient,
      1,
      runState
    );

    expect(sixthResult.outcome).toBe("refused");
    expect(getIssueMock).toHaveBeenCalledTimes(5);
  });

  it("sets githubRateLimited and refuses all further calls once a 403/429 is hit", async () => {
    const githubClient = createFakeGitHubClient({
      searchIssues: vi.fn(async () => ({ rateLimited: true as const })),
    });
    const runState = createInitialToolCallRunState();

    const rateLimitedResult = await executeToolCall(
      { operation: "search", query: "crash" },
      githubClient,
      1,
      runState
    );
    expect(rateLimitedResult.outcome).toBe("error");
    expect(runState.searchesFailed).toBe(1);
    expect(runState.githubRateLimited).toBe(true);

    const nextCallResult = await executeToolCall(
      { operation: "read", issueNumber: 2 },
      githubClient,
      1,
      runState
    );
    expect(nextCallResult.outcome).toBe("refused");
  });

  it("returns a typed error (never throws) when the issue is not found", async () => {
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async () => ({ notFound: true as const })),
    });
    const runState = createInitialToolCallRunState();

    const result = await executeToolCall({ operation: "read", issueNumber: 999 }, githubClient, 1, runState);
    expect(result.outcome).toBe("error");
  });
});
