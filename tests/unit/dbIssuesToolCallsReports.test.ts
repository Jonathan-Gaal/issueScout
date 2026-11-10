import { afterEach, describe, expect, it, vi } from "vitest";
import type { Report } from "../../lib/contract";

// Mocks the pool's query() so each test can inspect the exact SQL and
// $n parameters an accessor sends (values are never interpolated).
function mockQuery(result: { rows: unknown[] } | Error) {
  const queryMock = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  vi.doMock("../../lib/server/db/pool", () => ({ query: queryMock }));
  return queryMock;
}

function lastCall(queryMock: ReturnType<typeof mockQuery>): [string, unknown[]] {
  return queryMock.mock.calls.at(-1) as unknown as [string, unknown[]];
}

function uniqueViolation(): Error {
  return Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
}

const SAMPLE_REPORT: Report = {
  summary: "A test report.",
  category: "bug_report",
  categoryReason: "x",
  priority: "medium",
  priorityEvidence: "x",
  priorityUncertainty: "x",
  suggestedLabels: [],
  evidence: [],
  missingInformation: [],
  relatedIssues: [],
  recommendedNextStep: "x",
  proposedActions: [],
  containsEmbeddedInstructions: false,
  limitations: [],
  issue: { number: 1, title: "t", url: "u", state: "open", retrievedAt: "2026-01-01T00:00:00Z" },
  coverage: {
    searchesRun: 0,
    searchesFailed: 0,
    candidatesRead: 0,
    commentsTruncated: false,
    stopReason: "completed",
    removedByValidation: [],
  },
};

describe("db.reports", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/pool");
  });

  it("create() passes the full report jsonb object as a bound parameter", async () => {
    const queryMock = mockQuery({ rows: [] });

    const { reports } = await import("../../lib/server/db/reports");
    await reports.create({ runId: "run-1", report: SAMPLE_REPORT });

    const [sql, params] = lastCall(queryMock);
    expect(sql).toBe("INSERT INTO reports (run_id, report) VALUES ($1, $2::jsonb)");
    expect(params[0]).toBe("run-1");
    expect(JSON.parse(params[1] as string)).toEqual(SAMPLE_REPORT);
  });

  it("surfaces a second create() for the same runId as a typed DuplicateReportError, not a silent overwrite", async () => {
    mockQuery(uniqueViolation());

    const { reports, DuplicateReportError } = await import("../../lib/server/db/reports");
    await expect(reports.create({ runId: "run-1", report: SAMPLE_REPORT })).rejects.toBeInstanceOf(DuplicateReportError);
  });

  it("surfaces a non-unique-violation insert error as a plain Error, not DuplicateReportError", async () => {
    mockQuery(Object.assign(new Error("connection reset"), { code: "08006" }));

    const { reports, DuplicateReportError } = await import("../../lib/server/db/reports");
    const failure = reports.create({ runId: "run-1", report: SAMPLE_REPORT });
    await expect(failure).rejects.toThrow(/Failed to create report for run run-1/);
    await expect(failure).rejects.not.toBeInstanceOf(DuplicateReportError);
  });

  it("getOwned() scopes the lookup to the run owner in the join predicate itself", async () => {
    const queryMock = mockQuery({ rows: [{ report: SAMPLE_REPORT }] });

    const { reports } = await import("../../lib/server/db/reports");
    const report = await reports.getOwned("run-1", "user-1");

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/JOIN runs ON runs\.id = r\.run_id\s+WHERE r\.run_id = \$1 AND runs\.user_id = \$2/);
    expect(params).toEqual(["run-1", "user-1"]);
    expect(report).toEqual(SAMPLE_REPORT);
  });

  it("getOwned() returns null when no owned report exists", async () => {
    mockQuery({ rows: [] });

    const { reports } = await import("../../lib/server/db/reports");
    expect(await reports.getOwned("run-1", "someone-else")).toBeNull();
  });
});

describe("db.issues", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/pool");
  });

  it("create() inserts the issue fields scoped to runId", async () => {
    const queryMock = mockQuery({ rows: [] });

    const { issues } = await import("../../lib/server/db/issues");
    await issues.create({
      runId: "run-1",
      repo: "calcom/cal.diy",
      number: 42,
      title: "Bug",
      state: "open",
      url: "https://github.com/calcom/cal.diy/issues/42",
      retrievedAt: "2026-01-01T00:00:00Z",
    });

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/INSERT INTO issues \(run_id, repo, number, title, state, url, retrieved_at\)/);
    expect(params).toEqual([
      "run-1",
      "calcom/cal.diy",
      42,
      "Bug",
      "open",
      "https://github.com/calcom/cal.diy/issues/42",
      "2026-01-01T00:00:00Z",
    ]);
  });

  it("throws when the insert fails", async () => {
    mockQuery(new Error("insert failed"));

    const { issues } = await import("../../lib/server/db/issues");
    await expect(
      issues.create({
        runId: "run-1",
        repo: "r",
        number: 1,
        title: "t",
        state: "open",
        url: "u",
        retrievedAt: "2026-01-01T00:00:00Z",
      })
    ).rejects.toThrow(/Failed to create issue for run run-1/);
  });
});

describe("db.toolCalls", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/pool");
  });

  it("create() inserts the tool call fields scoped to runId", async () => {
    const queryMock = mockQuery({ rows: [] });

    const { toolCalls } = await import("../../lib/server/db/toolCalls");
    await toolCalls.create({
      runId: "run-1",
      operation: "search",
      arguments: { query: "label:bug", nested: [1, 2] },
      outcome: "ok",
      durationMs: 120,
    });

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/INSERT INTO tool_calls \(run_id, operation, arguments, outcome, error_code, duration_ms\)/);
    expect(params).toEqual(["run-1", "search", JSON.stringify({ query: "label:bug", nested: [1, 2] }), "ok", null, 120]);
  });

  it("throws when the insert fails", async () => {
    mockQuery(new Error("insert failed"));

    const { toolCalls } = await import("../../lib/server/db/toolCalls");
    await expect(
      toolCalls.create({ runId: "run-1", operation: "read", arguments: {}, outcome: "error" })
    ).rejects.toThrow(/Failed to create tool_call for run run-1/);
  });
});
