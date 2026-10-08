# 010b — Database data-access layer: issues, tool_calls, reports

## [SPEC]

- **Objective**: Build the three remaining table accessors spec 008's harness persists through at the end of a run: `db.issues.create(...)`, `db.toolCalls.create(...)`, `db.reports.create(...)`. Split from spec 010 to keep that spec's `runs.ts` (the ownership-critical file) and its test independently scrutinizable, and to keep this spec at ≤5 files.
- **Inputs/Outputs**: Column shapes per SCHEMA.md: `issues.create({ runId, repo, number, title, state, url, retrievedAt })`; `toolCalls.create({ runId, operation, arguments, outcome, errorCode?, durationMs? })`; `reports.create({ runId, report })` where `report` is the full `Report` jsonb object (TRD §3.1) exactly as returned to the client. All three take `runId` (never a bare insert with no run association — SCHEMA.md's FK-NOT-NULL constraints from spec 009 back this at the database level too, so this is belt-and-suspenders, not the only enforcement).
- **Design Pattern**: Same one-file-per-table shape as spec 010, continued — no new pattern introduced.
- **Bounded-AI boundary**: Entirely deterministic. `reports.create` persists a `Report` that *contains* model-generated narrative content, but this file's own logic (the insert call) is pure plumbing.
- **Verification Oracle**: `npx vitest run tests/unit/dbIssuesToolCallsReports.test.ts` — new unit tests against a mocked Supabase client: `db.reports.create` passes the full `report` jsonb object through the query builder's parameterized `.insert()` method (asserted via mock call-argument inspection, confirming no raw string interpolation ever touches model-derived text — Build Spec §8.2's parameterized-queries rule, checked at its one real point of risk); a second `db.reports.create` call for the same `runId` surfaces the UNIQUE-constraint violation (spec 009's `reports.run_id UNIQUE`) as a typed error from this function, not a silent overwrite or an uncaught exception reaching the harness.
- **Intellectual Control**: Keeping these three as thin, uniform wrappers around the query builder (no business logic, no branching beyond "did the insert succeed") means the only place model-derived text touches the database is behind a single parameterized-insert call per table — this is what makes Build Spec §8.2's "model text stored in the database goes through parameterized queries" true by construction rather than by each call site remembering it.
- **Constraints**: `@supabase/supabase-js` only. No raw SQL anywhere in these files.
- **Edge Cases**: `db.issues.create` is called at most once per run (SCHEMA.md: "one issue per run... never more than one") — this function doesn't itself enforce that (the FK/application call pattern in spec 008 does), but its own insert must not silently succeed on a second call for the same `runId` in a way that masks the invariant; relying on spec 009's schema-level constraint (if one exists) or spec 008's call discipline (one call per run, by construction of the harness loop) rather than re-deriving a uniqueness check here that SCHEMA.md didn't specify for this table.
- **UI States**: N/A — no UI files.
- **Files** (≤5):
  1. `lib/server/db/issues.ts` — new.
  2. `lib/server/db/toolCalls.ts` — new.
  3. `lib/server/db/reports.ts` — new.
  4. `tests/unit/dbIssuesToolCallsReports.test.ts` — new.
  5. (reserve slot — not expected to be needed)

**References (≤3):** SCHEMA.md (authoritative table/column shapes), `lib/server/db/supabaseClient.ts` (spec 010, the client singleton these accessors use), Build Spec §8.2 (the parameterized-queries rule this spec's oracle checks).

[FORCES]
1. Uniform thin wrappers around one parameterized insert each > any per-table custom logic, keeping the "parameterized by construction" guarantee simple to verify.
2. Simplicity > Pattern purity (always present unless explicitly overridden).
