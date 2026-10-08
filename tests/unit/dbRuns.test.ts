import { afterEach, describe, expect, it, vi } from "vitest";

// Mocks the Supabase client's query-builder chain so we can inspect
// exactly which filter methods were called with which arguments — the
// literal implementation of TRD §3.2's "ownership check is in the
// query predicate itself" rule, asserted via call-argument inspection,
// not just the return value.
function createQueryBuilderMock(finalResult: { data: unknown; error: unknown; count?: number }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainableMethods = ["select", "insert", "update", "eq", "gte", "order", "limit"];
  for (const methodName of chainableMethods) {
    builder[methodName] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => finalResult);
  builder.maybeSingle = vi.fn(async () => finalResult);
  // The query builder itself is also awaitable (list() doesn't call
  // .single()/.maybeSingle()) — make the object thenable.
  (builder as unknown as { then: unknown }).then = (
    resolve: (value: typeof finalResult) => void
  ) => resolve(finalResult);
  return builder;
}

describe("db.runs", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../../lib/server/db/supabaseClient");
  });

  it("getOwned(id, userId) constructs a query filtering on both id and user_id", async () => {
    const queryBuilder = createQueryBuilderMock({ data: { id: "run-1", user_id: "user-1" }, error: null });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { runs } = await import("../../lib/server/db/runs");
    await runs.getOwned("run-1", "user-1");

    expect(fromMock).toHaveBeenCalledWith("runs");
    expect(queryBuilder.eq).toHaveBeenCalledWith("id", "run-1");
    expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("getOwned returns null when the run exists but belongs to a different user (same shape as not-found)", async () => {
    const queryBuilder = createQueryBuilderMock({ data: null, error: null });
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: vi.fn(() => queryBuilder) },
    }));

    const { runs } = await import("../../lib/server/db/runs");
    const result = await runs.getOwned("run-1", "someone-else");

    expect(result).toBeNull();
  });

  it("list(userId, limit) always includes a user_id filter", async () => {
    const queryBuilder = createQueryBuilderMock({ data: [], error: null });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { runs } = await import("../../lib/server/db/runs");
    await runs.list("user-1", 10);

    expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(queryBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(10);
  });

  it("countInLastHour scopes the count query to the given user_id", async () => {
    const queryBuilder = createQueryBuilderMock({ data: null, error: null, count: 3 });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { runs } = await import("../../lib/server/db/runs");
    const count = await runs.countInLastHour("user-1");

    expect(queryBuilder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(count).toBe(3);
  });

  it("create() inserts with the given userId and issueUrl and returns the created row", async () => {
    const createdRow = { id: "run-1", user_id: "user-1", issue_url: "https://github.com/calcom/cal.diy/issues/1" };
    const queryBuilder = createQueryBuilderMock({ data: createdRow, error: null });
    const fromMock = vi.fn(() => queryBuilder);
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: fromMock },
    }));

    const { runs } = await import("../../lib/server/db/runs");
    const result = await runs.create({ userId: "user-1", issueUrl: createdRow.issue_url });

    expect(queryBuilder.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      issue_url: createdRow.issue_url,
    });
    expect(result).toEqual(createdRow);
  });

  it("create() throws when the insert fails rather than returning a falsy/undefined row", async () => {
    const queryBuilder = createQueryBuilderMock({ data: null, error: { message: "insert failed" } });
    vi.doMock("../../lib/server/db/supabaseClient", () => ({
      supabaseClient: { from: vi.fn(() => queryBuilder) },
    }));

    const { runs } = await import("../../lib/server/db/runs");
    await expect(runs.create({ userId: "user-1", issueUrl: "u" })).rejects.toThrow();
  });
});
