# 012 — Logger: identifiers/counts/outcomes only, structurally

## [SPEC]

- **Objective**: Build `lib/server/logger.ts` exposing `logRunEvent(runId, event, meta)` where `meta`'s type signature structurally excludes free-text fields — PRD §9 Observability's "never issue bodies, comments, tokens, or personal data" rule, enforced as a type constraint rather than a reviewed convention (TRD §4: "there is no code path that accepts a free-text/body field, so 'accidentally logged the issue body' is structurally prevented").
- **Inputs/Outputs**: `logRunEvent(runId: string, event: RunLogEvent, meta?: LogMeta): void` where `RunLogEvent` is a fixed string-literal union (`"run_started"`, `"run_completed"`, `"run_stopped"`, `"run_failed"`, `"tool_call"`, `"validation_removal"`) matching PRD §9's "Key events to log" list, and `LogMeta` is a type permitting only: numeric counts (`searchesRun`, `candidatesRead`, etc.), short enum-shaped string codes (`stopReason`, `errorCode`, `outcome`), and IDs (`runId`, already a positional param) — explicitly no `string` catch-all field a caller could stuff issue text into.
- **Design Pattern**: none — simple case (one typed function, one restrictive parameter type doing the real work).
- **Bounded-AI boundary**: Entirely deterministic. No model-generated content is ever a valid `LogMeta` value by this type's construction — if a caller tried to pass model output directly, it would be a type error, not a runtime filtering decision.
- **Verification Oracle**: `npx tsc --noEmit` fails if any call site in the codebase passes a free-text-shaped value (e.g., an issue body string, a full `Report` object) as `meta` — demonstrated by a new negative test: `tests/unit/logger.test.ts` includes a `// @ts-expect-error` line attempting `logRunEvent(runId, "run_completed", { issueBody: "some text" })` and asserts TypeScript rejects it (via `npx tsc --noEmit` on that test file, or a `expectTypeOf` runtime-type-check library call if preferred — but no new dependency for this alone; prefer the `@ts-expect-error` compile-time approach, zero dependency cost). A second positive test confirms a valid call (`logRunEvent(runId, "run_stopped", { stopReason: "turn_limit", searchesRun: 2 })`) compiles and logs the expected structured output (asserted via a mocked `console.log`/output sink).
- **Intellectual Control**: Putting the restriction in the *type* rather than in a runtime scrubber means a violation is caught at build time, before the code ever runs in a context where it could leak — matching TRD §4's explicit design intent ("structurally prevented," not "reviewed and caught"). This is cheaper than a runtime redaction pass and categorically can't be bypassed by a call site that doesn't know about a redaction convention.
- **Constraints**: No new dependency — plain TypeScript's type system does the enforcement work; no logging library (pino/winston/etc.) is needed for this project's scale (PRD §9 Scalability: ~2-3 users, no multi-tenant/high-concurrency goal) — `console.log`/`console.error` with structured JSON output is sufficient, matching the plan's "don't over-engineer" calibration.
- **Edge Cases**: A caller attempting to log an entire `Report` object as `meta` (an easy mistake — "just log the whole thing for debugging") is rejected at compile time by `LogMeta`'s restrictive shape, not left to a developer's discipline to avoid. A `validation_removal` event's `meta` may include the *name* of what was removed (a label name, an issue number) as a short identifier — this is a count/identifier, not the underlying free-text content, and is explicitly within `LogMeta`'s allowed shape per PRD §9's "Key events to log" (validation removals are named as a loggable event).
- **UI States**: N/A — no UI files.
- **Files** (≤5):
  1. `lib/server/logger.ts` — new.
  2. `tests/unit/logger.test.ts` — new.
  3. (reserve slot — not expected to be needed)
  4. (reserve slot — not expected to be needed)
  5. (reserve slot — not expected to be needed)

**References (≤3):** PRD.md §9 Observability (the binding requirement), TRD.md §4 (the "structurally prevented" design intent this spec implements).

[FORCES]
1. A restrictive type that makes a violation a compile error > a runtime scrubber that depends on every call site remembering a convention.
2. Simplicity > Pattern purity (always present unless explicitly overridden).
