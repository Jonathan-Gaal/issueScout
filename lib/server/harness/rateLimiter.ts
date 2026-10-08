// Per-user RUNS_PER_USER_PER_HOUR check (US-2, TRD §3.3 / config.runsPerUserPerHour).
// The count source is dependency-injected rather than importing the DB
// layer directly, so this file has zero file-level dependency on
// spec 009/010's data layer — the real wiring happens in the harness
// loop (spec 008), which already references the DB layer.

import { config } from "../config";

export interface RunRateCheckResult {
  allowed: boolean;
}

/**
 * Checks whether a user may start another run this hour.
 * Rejects at count >= config.runsPerUserPerHour, not > — a user who has
 * already run the configured maximum number of times this hour may not
 * start one more.
 */
export async function checkRunRate(
  userId: string,
  countRunsInLastHour: (userId: string) => Promise<number>
): Promise<RunRateCheckResult> {
  const runsInLastHour = await countRunsInLastHour(userId);
  return { allowed: runsInLastHour < config.runsPerUserPerHour };
}
