import { afterEach, describe, expect, it, vi } from "vitest";

// Mocks the pool's query() so we can inspect exactly which SQL and which
// $n parameters each accessor sends — the literal implementation of TRD
// §3.2's "ownership check is in the query predicate itself" rule,
// asserted via the statement text and its bound values, not just the
// return value.
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

describe("db.runs", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/pool");
  });

  it("getOwned(id, userId) constructs a query filtering on both id and user_id", async () => {
    const queryMock = mockQuery({ rows: [{ id: "run-1", user_id: "user-1" }] });

    const { runs } = await import("../../lib/server/db/runs");
    await runs.getOwned("run-1", "user-1");

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/FROM runs WHERE id = \$1 AND user_id = \$2/);
    expect(params).toEqual(["run-1", "user-1"]);
  });

  it("getOwned returns null when the run exists but belongs to a different user (same shape as not-found)", async () => {
    mockQuery({ rows: [] });

    const { runs } = await import("../../lib/server/db/runs");
    const result = await runs.getOwned("run-1", "someone-else");

    expect(result).toBeNull();
  });

  it("list(userId, limit) always includes a user_id filter", async () => {
    const queryMock = mockQuery({ rows: [] });

    const { runs } = await import("../../lib/server/db/runs");
    await runs.list("user-1", 10);

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/WHERE user_id = \$1 ORDER BY created_at DESC LIMIT \$2/);
    expect(params).toEqual(["user-1", 10]);
  });

  it("countInLastHour scopes the count query to the given user_id", async () => {
    const queryMock = mockQuery({ rows: [{ count: 3 }] });

    const { runs } = await import("../../lib/server/db/runs");
    const count = await runs.countInLastHour("user-1");

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/WHERE user_id = \$1 AND created_at >= \$2/);
    expect(params[0]).toBe("user-1");
    expect(count).toBe(3);
  });

  it("create() inserts with the given userId and issueUrl and returns the created row", async () => {
    const createdRow = { id: "run-1", user_id: "user-1", issue_url: "https://github.com/calcom/cal.diy/issues/1" };
    const queryMock = mockQuery({ rows: [createdRow] });

    const { runs } = await import("../../lib/server/db/runs");
    const result = await runs.create({ userId: "user-1", issueUrl: createdRow.issue_url });

    const [sql, params] = lastCall(queryMock);
    expect(sql).toMatch(/INSERT INTO runs \(user_id, issue_url\) VALUES \(\$1, \$2\) RETURNING \*/);
    expect(params).toEqual(["user-1", createdRow.issue_url]);
    expect(result).toEqual(createdRow);
  });

  it("create() throws when the insert fails rather than returning a falsy/undefined row", async () => {
    mockQuery(new Error("insert failed"));

    const { runs } = await import("../../lib/server/db/runs");
    await expect(runs.create({ userId: "user-1", issueUrl: "u" })).rejects.toThrow();
  });

  it("updateStatus() only sets whitelisted columns, with every value bound as a parameter", async () => {
    const queryMock = mockQuery({ rows: [] });

    const { runs } = await import("../../lib/server/db/runs");
    await runs.updateStatus("run-1", { status: "failed", durationMs: 5 });

    const [sql, params] = lastCall(queryMock);
    expect(sql).toBe("UPDATE runs SET status = $1, duration_ms = $2 WHERE id = $3");
    expect(params).toEqual(["failed", 5, "run-1"]);
  });
});
