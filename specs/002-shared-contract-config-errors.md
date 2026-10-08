# 002 — Shared contract types, config module, error map

## [SPEC]

- **Objective**: Establish the three foundational files every later backend spec imports from: the shared `ModelReport`/`Report`/`ErrorCode` TypeScript types (`lib/contract.ts`), the single config module holding all env reads and the five `CONFIRM BEFORE SHIPPING` placeholders (`lib/server/config.ts`), and the `ErrorCode` -> HTTP status + plain message map (`lib/server/errors.ts`).
- **Inputs/Outputs**: Types lifted verbatim from TRD.md §3.1 (`ModelReport`/`Report`, including the `coverage` shape and the Phase-1 `proposedActions: []` invariant noted in TRD §3.1's "Phase-1 invariant" paragraph) and TRD.md §3.2 (the full `ErrorCode` union: `invalid_url`, `repo_not_allowed`, `is_pull_request`, `not_found`, `issue_too_long`, `rate_limited`, `timeout`, `github_error`, `model_output_invalid`, `turn_limit`, `time_limit`, `unauthorized`, `run_rate_limited`, `write_failed`). Config values lifted from TRD §3.3's limits table and PRD §3's "Technical limits" (constants) plus the plan's config module shape (`/Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md`, "Config module" section) for the five placeholders' env var names and defaults.
- **Design Pattern**: none — simple case (type definitions + flat config object + lookup map).
- **Bounded-AI boundary**: Entirely deterministic. No model-generated content in any of these three files.
- **Verification Oracle**: `npx tsc --noEmit` passes with the new files included (type-checks `lib/contract.ts` compiles and is importable). `npx vitest run tests/unit/errors.test.ts` — a new unit test asserting every `ErrorCode` value maps to a defined `{ status, message }` pair and that no `message` string contains the substring `"Error:"` or a stack-trace-shaped pattern (guards TRD §3.2's "MUST NOT contain stack traces... raw upstream errors" rule at the one place all error messages originate). `grep -c "CONFIRM BEFORE SHIPPING" lib/server/config.ts` returns `5` (confirms all five placeholders — D2, D3, D6/D7/D8, D9 — are present and tagged, per CLAUDE.md's "grep for that tag as a pre-deploy gate" instruction).
- **Intellectual Control**: Centralizing config in one flat object (no env-schema library, per the plan's explicit "don't over-engineer" calibration) means every later spec reads `config.X` instead of `process.env.X` directly — this is what makes the five placeholders greppable in one place rather than scattered across route handlers, and it's the single swap point if D2/D9 change. The error map being a lookup table (not inline per-route string literals) is what makes "never a raw error" mechanically enforceable rather than a convention every route handler has to remember.
- **Constraints**: No new dependency beyond what's already authorized (zod is used by a later spec, not this one — these three files use plain TypeScript only). `config.ts` MUST NOT read or log the actual secret *values* anywhere except assigning them to the object; no `console.log(config)` anywhere. `GITHUB_WRITE_TOKEN` MUST NOT appear anywhere in `config.ts` — PRD §9 finding #3 / CLAUDE.md: it is not provisioned this cycle, full stop, so there is no config key for it, not even an unset one.
- **Edge Cases**: `config.githubReadToken` may be `undefined` in dev — warn via `console.warn`, don't throw/crash (plan's explicit guidance). `config.allowedUserEmails` parses an empty `ALLOWED_USER_EMAILS` env var to an empty array, not a crash — an empty allowlist is a valid (if maximally restrictive) state, not an error state. Every `ErrorCode` in the TRD §3.2 union MUST have a map entry — a missing entry is a build-time catchable error (exhaustiveness check via a `satisfies Record<ErrorCode, ...>` type constraint), not a runtime surprise on first use of an uncovered code.
- **UI States**: N/A — no UI files.
- **Files** (≤5):
  1. `lib/contract.ts` — new.
  2. `lib/server/config.ts` — new.
  3. `lib/server/errors.ts` — new.
  4. `tests/unit/errors.test.ts` — new.
  5. (reserve slot — not expected to be needed)

[FORCES]
1. One config module, greppable placeholders > per-file env reads scattered across the codebase.
2. Simplicity > Pattern purity (always present unless explicitly overridden).
