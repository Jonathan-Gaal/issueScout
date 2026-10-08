// T1/T2 — Build Spec §11, verbatim pass conditions. Expected output
// was written before running, per Build Spec §11's explicit
// instruction — these assertions are the pre-committed pass/fail bar
// for runHarness, not a description retrofitted to its output.

import { describe, expect, it, vi } from "vitest";
import { runHarness } from "../../lib/server/harness/runHarness";
import type { GitHubClient } from "../../lib/server/github/types";
import type { ModelProvider } from "../../lib/server/model/types";

const APPROVED_ISSUE_URL = "https://github.com/calcom/cal.diy/issues/42";

function createFakeGitHubClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
  return {
    getIssue: vi.fn(async (number: number) => ({
      number,
      title: "Booking page crashes with month=garbage",
      body: "Steps to reproduce: visit /booking?month=garbage. The page crashes with a 500 error. Valid links (e.g. month=2026-01) continue to work normally.",
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

const alwaysAllowedRateCheck = async () => 0;

describe("T1 — clean bug-report fixture, correct classification and duplicate assessment", () => {
  it("classifies bug_report, priority medium, candidate A possible_duplicate, candidate B unlikely_match", async () => {
    const githubClient = createFakeGitHubClient({
      searchIssues: vi.fn(async () => [
        {
          number: 10,
          title: "Booking fails on malformed month",
          excerpt: "Crash when month=garbage is used in the booking URL.",
          state: "open",
          url: "https://github.com/calcom/cal.diy/issues/10",
        },
        {
          number: 11,
          title: "Different availability error",
          excerpt: "Availability calculation returns wrong slots under DST.",
          state: "open",
          url: "https://github.com/calcom/cal.diy/issues/11",
        },
      ]),
      getIssue: vi.fn(async (number: number) => ({
        number,
        title: number === 10 ? "Booking fails on malformed month" : "Booking page crashes with month=garbage",
        body: "Steps to reproduce...",
        state: "open",
        labels: [],
        url: `https://github.com/calcom/cal.diy/issues/${number}`,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        retrievedAt: "2026-01-01T00:00:00Z",
      })),
    });

    const t1ModelReport = {
      summary: "Booking page crashes with an invalid date when month=garbage is passed. Valid links work.",
      category: "bug_report",
      categoryReason: "Reproducible crash on malformed input.",
      priority: "medium",
      priorityEvidence: "Known workaround (use a valid link) exists; no data loss or security impact.",
      priorityUncertainty: "Severity could be higher if malformed links are shared externally.",
      suggestedLabels: [{ name: "bug", reason: "Reproducible crash." }],
      evidence: [{ observation: "Confirmed crash with month=garbage.", sourceUrl: APPROVED_ISSUE_URL }],
      missingInformation: ["The affected app version was not stated."],
      relatedIssues: [
        {
          number: 10,
          title: "Booking fails on malformed month",
          url: "https://github.com/calcom/cal.diy/issues/10",
          similarities: "Same malformed-month crash, same page, matching steps.",
          differences: "None material.",
          assessment: "possible_duplicate",
        },
        {
          number: 11,
          title: "Different availability error",
          url: "https://github.com/calcom/cal.diy/issues/11",
          similarities: "Both are booking-page errors.",
          differences: "Different trigger (DST availability calc, not a malformed parameter) and different error.",
          assessment: "unlikely_match",
        },
      ],
      recommendedNextStep: "Validate/sanitize the month query parameter before use.",
      proposedActions: [],
      containsEmbeddedInstructions: false,
      limitations: ["No independent reproduction performed."],
    };

    // The model first searches (so candidates 10/11 enter the run's
    // retrieved-issue-numbers set), then reads both candidates, then
    // returns its final answer — mirrors the real multi-turn flow
    // closely enough for validateContent to accept the relatedIssues
    // the fixture names, without re-testing the harness loop itself
    // (already covered by spec 008's own test suite).
    let turnIndex = 0;
    const modelProvider: ModelProvider = {
      complete: vi.fn(async () => {
        turnIndex += 1;
        if (turnIndex === 1) {
          return {
            content: [
              { type: "tool_use" as const, id: "t1", name: "github_issue_research", input: { operation: "search", query: "malformed month crash" } },
            ],
            stopReason: "tool_use" as const,
          };
        }
        if (turnIndex === 2) {
          return {
            content: [
              { type: "tool_use" as const, id: "t2", name: "github_issue_research", input: { operation: "read", issueNumber: 10 } },
            ],
            stopReason: "tool_use" as const,
          };
        }
        if (turnIndex === 3) {
          return {
            content: [
              { type: "tool_use" as const, id: "t3", name: "github_issue_research", input: { operation: "read", issueNumber: 11 } },
            ],
            stopReason: "tool_use" as const,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(t1ModelReport) }],
          stopReason: "end_turn" as const,
        };
      }),
    };

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("completed");
    expect(result.report?.category).toBe("bug_report");
    expect(result.report?.priority).toBe("medium");

    const candidateA = result.report?.relatedIssues.find((issue) => issue.number === 10);
    const candidateB = result.report?.relatedIssues.find((issue) => issue.number === 11);
    expect(candidateA?.assessment).toBe("possible_duplicate");
    expect(candidateA?.similarities).toMatch(/matching steps|same.*crash/i);
    expect(candidateB?.assessment).toBe("unlikely_match");
    expect(candidateB?.differences.length).toBeGreaterThan(0);

    expect(result.report?.missingInformation.some((item) => /version/i.test(item))).toBe(true);
    expect(result.report?.limitations.some((item) => /reproduction/i.test(item))).toBe(true);
  });
});

describe("T2 — vague issue, needs_clarification/needs_review, no duplicate inferred", () => {
  it("classifies needs_clarification, priority needs_review, asks for steps/environment, no duplicate despite a loose search hit", async () => {
    const githubClient = createFakeGitHubClient({
      getIssue: vi.fn(async (number: number) => ({
        number,
        title: "Booking is broken",
        body: "Booking is broken.",
        state: "open",
        labels: [],
        url: APPROVED_ISSUE_URL,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        retrievedAt: "2026-01-01T00:00:00Z",
      })),
      searchIssues: vi.fn(async () => [
        {
          number: 20,
          title: "Booking confirmation email broken for EU timezones",
          excerpt: "A detailed, unrelated report about EU timezone handling in confirmation emails.",
          state: "open",
          url: "https://github.com/calcom/cal.diy/issues/20",
        },
      ]),
    });

    const t2ModelReport = {
      summary: "The reporter states booking is broken with no steps, environment, or expected behavior.",
      category: "needs_clarification",
      categoryReason: "No reproduction steps, environment, or expected-vs-actual behavior were provided.",
      priority: "needs_review",
      priorityEvidence: "Insufficient evidence to assess severity.",
      priorityUncertainty: "Cannot assess without more detail from the reporter.",
      suggestedLabels: [],
      evidence: [],
      missingInformation: [
        "Steps to reproduce.",
        "Expected versus actual behavior.",
        "Environment or app version.",
        "Error details, if any.",
      ],
      relatedIssues: [],
      recommendedNextStep: "Ask the reporter for steps to reproduce, expected vs. actual behavior, and environment.",
      proposedActions: [],
      containsEmbeddedInstructions: false,
      limitations: ["Search returned a loosely similar but unrelated report; not treated as a duplicate."],
    };

    const modelProvider: ModelProvider = {
      complete: vi.fn(async () => ({
        content: [{ type: "text" as const, text: JSON.stringify(t2ModelReport) }],
        stopReason: "end_turn" as const,
      })),
    };

    const result = await runHarness(
      { issueUrl: APPROVED_ISSUE_URL, userId: "user-1" },
      { githubClient, modelProvider, countRunsInLastHour: alwaysAllowedRateCheck }
    );

    expect(result.status).toBe("completed");
    expect(result.report?.category).toBe("needs_clarification");
    expect(result.report?.priority).toBe("needs_review");
    expect(result.report?.relatedIssues).toEqual([]);

    const missingInfoText = result.report?.missingInformation.join(" ").toLowerCase() ?? "";
    expect(missingInfoText).toMatch(/step/);
    expect(missingInfoText).toMatch(/expected|actual/);
    expect(missingInfoText).toMatch(/environment|version/);
  });
});
