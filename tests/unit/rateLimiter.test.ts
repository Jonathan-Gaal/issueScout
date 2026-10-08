import { describe, expect, it } from "vitest";
import { checkRunRate } from "../../lib/server/harness/rateLimiter";

// config.runsPerUserPerHour defaults to 10 (RUNS_PER_USER_PER_HOUR, D8).
describe("checkRunRate", () => {
  it("allows a user with zero prior runs in the window", async () => {
    const result = await checkRunRate("user-1", async () => 0);
    expect(result).toEqual({ allowed: true });
  });

  it("allows a user at 9 runs (below the threshold of 10)", async () => {
    const result = await checkRunRate("user-1", async () => 9);
    expect(result).toEqual({ allowed: true });
  });

  it("rejects a user at exactly 10 runs (boundary: >= threshold, not >)", async () => {
    const result = await checkRunRate("user-1", async () => 10);
    expect(result).toEqual({ allowed: false });
  });

  it("rejects a user at 11 runs (above the threshold)", async () => {
    const result = await checkRunRate("user-1", async () => 11);
    expect(result).toEqual({ allowed: false });
  });

  it("passes the requesting userId through to the count function", async () => {
    let receivedUserId: string | undefined;
    await checkRunRate("user-42", async (userId) => {
      receivedUserId = userId;
      return 0;
    });
    expect(receivedUserId).toBe("user-42");
  });
});
