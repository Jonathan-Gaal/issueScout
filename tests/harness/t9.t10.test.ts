// These legacy tests isolate classification/content filtering. Evidence-review behavior
// is tested separately with the real reviewer in claimReview.test.ts.
import type { ModelReport } from "../../lib/contract";
vi.mock("../../lib/server/harness/claimReview", () => ({ reviewClaims: async (report: ModelReport) => ({ report, removed: [], audit: null }) }));
// T9/T10 — Build Spec §11, verbatim pass conditions. Expected output
// written before running, per Build Spec §11's instruction.

import { describe, expect, it, vi } from "vitest";
import { runHarness } from "../../lib/server/harness/runHarness";
import type { GitHubClient } from "../../lib/server/github/types";
import type { ModelProvider } from "../../lib/server/model/types";

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
    getLabels: vi.fn(async () => [{ name: "bug", description: null }, { name: "enhancement", description: null }]),
    searchIssues: vi.fn(async () => []),
    ...overrides,
  };
}

describe("T9 — fabricated label and un-retrieved related-issue number both stripped", () => {
  it("removes the invented label and the never-retrieved related issue, listing both in coverage.removedByValidation", async () => {
    const githubClient = createFakeGitHubClient();

    const t9ModelReport = {
      summary: "Test summary.",
      category: "bug_report",
      categoryReason: "x",
      priority: "medium",
      priorityEvidence: "x",
      priorityUncertainty: "x",
      suggestedLabels: [
        { name: "bug", reason: "Real label, in the repo's list." },
        { name: "invented-label-that-does-not-exist", reason: "Fabricated by the model." },
      ],
      evidence: [],
      missingInformation: [],
      relatedIssues: [
        {
          number: 999,
          title: "An issue that was never actually retrieved this run",
          url: "https://github.com/calcom/cal.diy/issues/999",
          similarities: "Fabricated similarity.",
          differences: "x",
          assessment: "related",
        },
      ],
      recommendedNextStep: "x",
      proposedActions: [],
      containsEmbeddedInstructions: false,
      limitations: [],
    };

    const modelProvider: ModelProvider = {
      complete: vi.fn(async () => ({
        content: [{ type: "text" as const, text: JSON.stringify(t9ModelReport) }],
        stopReason: "end_turn" as const,
      })),
    };

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("completed");
    expect(result.report?.suggestedLabels).toEqual([{ name: "bug", reason: "Real label, in the repo's list." }]);
    expect(result.report?.relatedIssues).toEqual([]);
    expect(result.report?.coverage.removedByValidation).toContain(
      "suggestedLabel:invented-label-that-does-not-exist"
    );
    expect(result.report?.coverage.removedByValidation).toContain("relatedIssue:999");
  });
});

describe("T10 — PR URL, wrong-repo URL, oversized issue body all short-circuit before any model call", () => {
  it("a pull request URL returns is_pull_request without calling the model", async () => {
    const githubClient = createFakeGitHubClient();
    const completeMock = vi.fn();
    const modelProvider: ModelProvider = { complete: completeMock };

    const result = await runHarness(
      { issueUrl: "https://github.com/calcom/cal.diy/pull/42", userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("is_pull_request");
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("a URL in a different repository returns repo_not_allowed without calling the model", async () => {
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

  it("an issue longer than ISSUE_MAX_CHARS returns issue_too_long without calling the model", async () => {
    const oversizedBody = "x".repeat(20001);
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async (number: number) => ({
        number,
        title: "Oversized issue",
        body: oversizedBody,
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
});
