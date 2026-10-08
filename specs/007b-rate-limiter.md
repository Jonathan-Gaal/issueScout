# 007b — Per-user rate limiter

## [SPEC]

- **Objective**: Build `rateLimiter.ts` — the per-user `RUNS_PER_USER_PER_HOUR` check (US-2's rate-limit acceptance criterion, TRD §3.3/`config.runsPerUserPerHour`). Split from spec 007 to keep that spec's file count within the 5-file cap; this is an independently small, independently testable unit with no dependency on `toolExecutor.ts`/`validateContent.ts`.
- **Inputs/Outputs**: `checkRunRate(userId: string, countRunsInLastHour: (userId: string) => Promise<number>): Promise<{ allowed: boolean }>` (or equivalent) — takes a count function as a parameter (dependency-injected) rather than importing the DB layer directly, so this spec has zero file-level dependency on spec 009's data layer and can be built/tested in either order. `config.runsPerUserPerHour` (D8, from spec 002) is the threshold.
- **Design Pattern**: none — simple case (one function, one boundary comparison), with the count-source dependency-injected specifically so this spec doesn't need to reference the DB layer spec directly.
- **Bounded-AI boundary**: Entirely deterministic — a count compared against a fixed threshold. No model involvement.
- **Verification Oracle**: `npx vitest run tests/unit/rateLimiter.test.ts` — new unit test against a fake count function: a user whose last-hour run count is below `RUNS_PER_USER_PER_HOUR` (10) is allowed; a user at exactly 10 is rejected on the next (11th) attempt; a user at 9 is allowed (boundary-value coverage per edge-case-triage's baseline sweep — off-by-one is the obvious failure shape for any `>=`/`>` threshold check).
- **Intellectual Control**: Dependency-injecting the count function (rather than importing `lib/server/db/runs.ts` directly) keeps this spec's reference count at zero and means its unit test needs no real database — the actual wiring to the real `runs` count query happens in spec 008 (the harness loop), which already references the DB layer for persistence and so is the natural place to make that connection.
- **Constraints**: No new dependency. Pure function, no I/O of its own.
- **Edge Cases**: A user with zero prior runs in the window is trivially allowed. The boundary check must use the correct comparison direction (reject at count `>= 10`, not `> 10`) — explicitly covered by the oracle's 9/10/11 test cases above, since this is exactly the kind of off-by-one a cheap edge-case sweep catches before it ships.
- **UI States**: N/A — no UI files.
- **Files** (≤5):
  1. `lib/server/harness/rateLimiter.ts` — new.
  2. `tests/unit/rateLimiter.test.ts` — new.
  3. (reserve slot — not expected to be needed)
  4. (reserve slot — not expected to be needed)
  5. (reserve slot — not expected to be needed)

**References (≤3):** `lib/server/config.ts` (spec 002, `config.runsPerUserPerHour`).

[FORCES]
1. Dependency-injected count source > a direct import of the DB layer, to keep this spec's reference count minimal and order-independent from spec 009.
2. Simplicity > Pattern purity (always present unless explicitly overridden).
