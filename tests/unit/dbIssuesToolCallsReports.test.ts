import { afterEach, describe, expect, it, vi } from "vitest";
import type { Report } from "../../lib/contract";

function createQueryBuilderMock(finalResult: { error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.insert = vi.fn(async () => finalResult);
  return builder;
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
    vi.doUnmock("../../lib/server/db/supabaseClient");
  });

  it("create() passes the full report jsonb object through the parameterized .insert() method", async () => {
    const queryBuilder = createQueryBuilderMock({ error: null });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { reports } = await import("../../lib/server/db/reports");
    await reports.create({ runId: "run-1", report: SAMPLE_REPORT });

    expect(fromMock).toHaveBeenCalledWith("reports");
    expect(queryBuilder.insert).toHaveBeenCalledWith({ run_id: "run-1", report: SAMPLE_REPORT });
  });

  it("surfaces a second create() for the same runId as a typed DuplicateReportError, not a silent overwrite", async () => {
    const queryBuilder = createQueryBuilderMock({
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: vi.fn(() => queryBuilder) },
    }));

    const { reports, DuplicateReportError } = await import("../../lib/server/db/reports");
    await expect(reports.create({ runId: "run-1", report: SAMPLE_REPORT })).rejects.toThrow(
      DuplicateReportError
    );
  });

  it("surfaces a non-unique-violation insert error as a plain Error, not DuplicateReportError", async () => {
    const queryBuilder = createQueryBuilderMock({ error: { code: "08000", message: "connection failure" } });
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: vi.fn(() => queryBuilder) },
    }));

    const { reports, DuplicateReportError } = await import("../../lib/server/db/reports");
    await expect(reports.create({ runId: "run-1", report: SAMPLE_REPORT })).rejects.not.toBeInstanceOf(
      DuplicateReportError
    );
  });
});

describe("db.issues", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/supabaseClient");
  });

  it("create() inserts the issue fields scoped to runId", async () => {
    const queryBuilder = createQueryBuilderMock({ error: null });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { issues } = await import("../../lib/server/db/issues");
    await issues.create({
      runId: "run-1",
      repo: "calcom/cal.diy",
      number: 42,
      title: "Test issue",
      state: "open",
      url: "https://github.com/calcom/cal.diy/issues/42",
      retrievedAt: "2026-01-01T00:00:00Z",
    });

    expect(fromMock).toHaveBeenCalledWith("issues");
    expect(queryBuilder.insert).toHaveBeenCalledWith({
      run_id: "run-1",
      repo: "calcom/cal.diy",
      number: 42,
      title: "Test issue",
      state: "open",
      url: "https://github.com/calcom/cal.diy/issues/42",
      retrieved_at: "2026-01-01T00:00:00Z",
    });
  });

  it("throws when the insert fails", async () => {
    const queryBuilder = createQueryBuilderMock({ error: { message: "insert failed" } });
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: vi.fn(() => queryBuilder) },
    }));

    const { issues } = await import("../../lib/server/db/issues");
    await expect(
      issues.create({
        runId: "run-1",
        repo: "calcom/cal.diy",
        number: 42,
        title: "t",
        state: "open",
        url: "u",
        retrievedAt: "2026-01-01T00:00:00Z",
      })
    ).rejects.toThrow();
  });
});

describe("db.toolCalls", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/supabaseClient");
  });

  it("create() inserts the tool call fields scoped to runId", async () => {
    const queryBuilder = createQueryBuilderMock({ error: null });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { toolCalls } = await import("../../lib/server/db/toolCalls");
    await toolCalls.create({
      runId: "run-1",
      operation: "search",
      arguments: { query: "crash" },
      outcome: "ok",
    });

    expect(fromMock).toHaveBeenCalledWith("tool_calls");
    expect(queryBuilder.insert).toHaveBeenCalledWith({
      run_id: "run-1",
      operation: "search",
      arguments: { query: "crash" },
      outcome: "ok",
      error_code: null,
      duration_ms: null,
    });
  });

  it("throws when the insert fails", async () => {
    const queryBuilder = createQueryBuilderMock({ error: { message: "insert failed" } });
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: vi.fn(() => queryBuilder) },
    }));

    const { toolCalls } = await import("../../lib/server/db/toolCalls");
    await expect(
      toolCalls.create({ runId: "run-1", operation: "read", arguments: {}, outcome: "error" })
    ).rejects.toThrow();
  });
});
