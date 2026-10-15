# Project Log — IssueScout

Episodic record of decisions and events for this project. `[DECISION]` entries are ADR-shaped per `.claude/ADR-TEMPLATE.md`; Orion Pax promotes the ones that generalize beyond this project.

---

## 2026-10-08 — Alpha Trion (Project Assembly)

### [DECISION] ADR 001: Minimum-viable team for Phase 1, not a full-tier-sized roster

**Decision:** Dispatch teletraan-1, red-alert, starscream, alpha-trion, jazz, shockwave, optimus-prime, ratchet, wheeljack, scattershot, perceptor, and orion-pax for this cycle. Exclude bumblebee, hotshot, and blaster. Include soundwave conditionally, only for specs implementing auth/ownership/RLS.

**Why:** Full tier governs document depth (12-section PRD, TRD/SCHEMA required) — it does not mean every optional agent in the suite is warranted. This is a 2-person bootcamp/portfolio project, backend-only this cycle (Jonathan's slice), Phase-1-scoped (read-only, no writes). Bumblebee's job (walk a running end-to-end flow) has nothing to exercise yet since the frontend hasn't started. Hotshot requires a dedicated refactor task, which doesn't exist on a greenfield build. Blaster packages ratchet-verified work into a demo script/confidence map — nothing is verified green yet, so there's nothing to package, despite this being exactly the kind of portfolio-facing project blaster normally serves. Soundwave is included narrowly (not for the whole build) because the auth/ownership/RLS work is a real architectural/security surface per PRD §9's six Red-Alert findings, which is precisely soundwave's trigger condition.

**Tradeoffs:** Re-evaluating blaster/bumblebee later means a second assembly touch-point rather than a one-time team lock — acceptable because the alternative (including them now) would have them running against nothing, wasting tokens on agents with no real input.

**Revisit When:** Ivaylo's frontend branch has a submit-to-report flow running (reinstate bumblebee); a refactor task is explicitly opened (reinstate hotshot); Phase 1 produces at least one green `[COMPLIANCE-REPORT]` (reinstate blaster).

---

### [DECISION] ADR 002: Skill propagation scoped to backend stack this cycle; frontend skills noted but not actively propagated

**Decision:** Propagate `typescript`, `postgresql`, `firebase` (auth-integration section only), and `ai-feature-rules` as actively applicable this cycle. Note `react`, `nextjs-frontend`, and `laws-of-ux` in `CLAUDE.md` for when Ivaylo's slice starts, rather than treating them as live for this dispatch cycle.

**Why:** Alpha-trion's propagation step is the conditional-firing mechanism based on *this* project's actual stack, not a blanket list. This cycle's dispatched agents (jazz, shockwave, wheeljack) are working only against `app/api/` and `lib/server/` — no component, page, or hook code is being written yet. Propagating frontend skills as "active" when no frontend spec exists yet would be the "just in case" inclusion both the agent-selection and skill-propagation rules warn against.

**Tradeoffs:** The frontend skill list is written down now (in CLAUDE.md) specifically so it doesn't need to be re-derived at the next assembly touch-point — a deliberate tradeoff of a few extra lines now against re-reading the PRD's stack decisions again later.

**Revisit When:** Ivaylo's frontend branch starts and a UI-touching spec is written — at that point `react`/`nextjs-frontend`/`laws-of-ux` move from "noted" to "actively propagated," and wheeljack's standalone hard rule (laws-of-ux mandatory before any component/page/form) applies in practice.

---

### Note for the record (not acted on, per the task's explicit instruction)

A human-approved, detailed Phase-1 backend implementation plan already exists at `/Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md` — file-by-file design (config module, GitHub client interface, model provider interface, harness pseudocode, zod schemas, DB migration SQL, API route handlers, test plan, build order). It already resolved D2 (Anthropic primary/Groq best-effort swap), D3 (read-only fine-grained PAT), D6/D7/D8 (constants), and the tech-choice rationale. Referenced in `TRD.md`'s header and §1, and in `CLAUDE.md`'s Project-specific constraints — Shockwave should treat it as a strong design reference when writing specs rather than re-deriving these decisions.

---

## 2026-10-08 — Wheeljack (Build)

### [GAP] Spec 009 automated RLS test skipped — no live Supabase instance in this build environment; manually verified against local Postgres instead

**What:** `tests/integration/rls.test.ts` (spec 009) is marked `describe.skipIf(!hasSupabaseAnonConnection)` rather than running automatically, because no `SUPABASE_URL`/`SUPABASE_ANON_KEY` are configured in this worktree. Per the SECRETS discipline and this build's explicit instruction, `.env` (which may hold real Supabase credentials) was never read or copied by this agent.

**What was actually verified, manually, against a real database (not mocked):** A local Postgres instance (`psql -h /tmp -p 5432`) was reachable in this environment. The real `migrations/0001_init.sql` was applied to a scratch database (`issuescout_migration_check`, dropped after) with a minimal `auth.uid()` stub standing in for Supabase's auth schema. Confirmed via `\d runs`/`\d issues`/`\d tool_calls`/`\d reports`: every column, constraint, FK, and index matches SCHEMA.md exactly. Then, with a `NOBYPASSRLS` role simulating Supabase's non-service-role `anon` connection: a cross-user `SELECT` on `runs` for a row owned by a different `user_id` returned 0 rows; a cross-user `INSERT` on `runs` raised `ERROR: new row violates row-level security policy`; a cross-user `SELECT` on `issues` (subquery-scoped via `runs.user_id`) returned 0 rows, and the same query as the owning user correctly returned 1 row. This is the same RLS engine Supabase runs on (Postgres RLS), so this is real enforcement-level evidence, not merely "the SQL parsed."

**Why this is still a logged gap, not a closed item:** The *automated, repeatable* `tests/integration/rls.test.ts` still needs a real Supabase project's `SUPABASE_URL`/`SUPABASE_ANON_KEY` to run as part of the normal test suite — the manual verification above was a one-off scratch-database session in this build, not a committed, re-runnable check. SCHEMA.md/US-7 call for RLS to "actually be tested," which the manual check above satisfies in spirit for this build, but the committed automated test remains skipped until real Supabase credentials exist.

**What would close this gap:** Once a real Supabase project exists with `SUPABASE_URL`/`SUPABASE_ANON_KEY` available to a test run (not the service-role key), un-skip `tests/integration/rls.test.ts` and implement the same two assertions already manually proven above, so the check is repeatable in CI rather than a one-off session.

**Flagged for:** Soundwave's post-GREEN risk assessment on this spec (per CLAUDE.md's team roster, spec 009's RLS work is explicitly named as a soundwave-dispatch trigger) and perceptor's close-out gap review.

---

### [GAP] Spec 008 persistence: dependency-injected, not a direct import of spec 009's "data layer"

**What:** Spec 008's Inputs/Outputs section says persistence (step 9) happens "via spec 009's data layer (referenced, not redefined)." Spec 009 (already built) is the DB *migration* and RLS policies — it does not expose any data-access functions (no `db/runs.ts`, `db/issues.ts`, etc.). The actual data-access layer is specs 010/010b, which come *after* 008 in the given build order. Importing a not-yet-built module from `runHarness.ts` was not possible without either reordering the build or inventing the shape of 010/010b's exports ahead of their own spec — the latter risks exactly the "never invent an API response shape" hard rule.

**Resolution:** Built `runHarness.ts`'s persistence step as dependency-injected (`persistRun?: (outcome) => Promise<void>`, defaulting to a no-op), same pattern spec 007b already established for the rate-limit count source. This lets `runHarness`'s own tests run with zero DB dependency, and leaves specs 010/010b free to define their own real persistence function signature on their own terms, then have spec 013 (API routes) wire `persistRun` to the real implementation when assembling the full `POST /api/runs` handler.

**Why this is a judgment call worth flagging, not a silent one:** This changes "spec 009's data layer" (as spec 008's text names it) into "whatever spec 010/010b end up building, injected." If spec 013 (which wires the API route) was written assuming `runHarness` imports the DB layer directly rather than accepting it as a parameter, that's a contract mismatch to resolve when building spec 013 — noted here so it isn't missed.

**Flagged for:** Whoever builds/reviews spec 013 (API routes) — confirm `runHarness`'s actual signature (`RunHarnessDependencies.persistRun`) against spec 013's expectations before wiring the route handler.

---

### [GAP] Spec 010's manual Supabase round-trip check not run — no live Supabase project in this build environment

**What:** Spec 010's oracle names a second, non-CI-blocking check: "after spec 009's migration is applied to a real Supabase project, one `db.runs.create()` + `db.runs.getOwned()` round-trip succeeds against the real database." No real Supabase project is reachable in this build environment (same root cause as spec 009's RLS gap — no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` configured, and `.env` is never read by this agent per the SECRETS discipline).

**What was verified instead:** The CI-blocking half of spec 010's oracle (`tests/unit/dbRuns.test.ts`, mocked Supabase client, 6/6 green) fully passes, including the call-argument-level assertions that `getOwned`/`list`/`countInLastHour` all filter on `user_id`. The query shapes were also cross-checked by hand against the real column names confirmed live via spec 009's manual `psql \d runs` check (same column names: `id`, `user_id`, `issue_url`, `status`, etc.) — so the query strings are known-correct against the real schema, even without a live round-trip through Supabase's own API layer specifically.

**What would close this gap:** Once `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` exist for a real project with spec 009's migration applied, run one `db.runs.create()` followed by `db.runs.getOwned()` manually and confirm the round-trip, per spec 010's own instruction that this check is logged in the completion report, not a CI gate.

---

### [BUGFIX] supabaseClient.ts constructed eagerly, crashing `next build` with no Supabase env vars set

**What:** While building spec 013's route handlers (`app/api/runs/route.ts`, `app/api/runs/[id]/route.ts`), `npm run build` failed with `Error: supabaseUrl is required.` Next.js's build-time route collection imports every route module to gather metadata — this import chain reaches `lib/server/db/supabaseClient.ts` (spec 010), which called `createClient(supabaseUrl ?? "", supabaseServiceRoleKey ?? "")` at module scope. `@supabase/supabase-js`'s `createClient` throws synchronously on an empty URL, so the build crashed even though no request was ever made — this build environment has no real Supabase env vars configured (same root cause as the spec 009/010 gaps above).

**Red (confirmed failing for the right reason):** `npm run build` failed with the exact error above, pointing at `supabaseClient.ts`'s module-scope `createClient` call, before any fix was applied.

**Fix:** Changed `supabaseClient` from an eagerly-constructed `const` to a `Proxy` that lazily constructs the real client (via `getSupabaseClient()`) on first property access, not at import time. Falls back to placeholder connection values (`http://localhost:54321`, `"placeholder-key"`) when env vars are unset, so import/build-time evaluation never throws — a real request would still fail at the actual Supabase call (correctly), but merely importing the module no longer does.

**Green (confirmed fixed):** `npm run build` now completes cleanly, `app/api/runs` and `app/api/runs/[id]` both show up as recognized dynamic routes. `tests/unit/dbRuns.test.ts` and `tests/unit/dbIssuesToolCallsReports.test.ts` (both mock the entire `supabaseClient` module) re-ran green after the change — 21/21 across the three affected test files.

**Regression test:** Covered implicitly by every spec's `npm run build` oracle re-running green going forward — this is exactly the kind of regression a build-must-pass gate catches; no separate unit test was added since the failure mode is "the module throws on import," which `npm run build` already exercises directly on every spec from here on.

---

### [NOTE] Spec 014: T5/T7 intentionally not implemented, no trace stub added (file-cap tradeoff)

**What:** Spec 014 explicitly scopes T5 (approve one action, reject another, confirm only the approved one writes) and T7 (direct call to the write path with no approval record is refused) out of this cycle — both require the `actions`/`approvals` tables and the write path, neither of which exist yet (Phase 2, blocked on D4/D5, per SCHEMA.md and PRD §10). Spec 014's own text allows (not requires) "a stub or skipped test for T5/T7... with an explicit `.skip()` and a comment," but its Files list caps this spec at the 4 combined T-test files plus fixtures — no 5th file was spent on a T5/T7 stub, since the spec frames it as optional ("may be added") and the Files list already uses its 4 real slots plus the fixtures slot.

**Why this is traceable, not silent:** This log entry is the trace. T5/T7's absence is also directly visible from the oracle command itself (`tests/harness/t1.t2.test.ts tests/harness/t3.t4.test.ts tests/harness/t6.t8.test.ts tests/harness/t9.t10.test.ts` — no t5/t7 file named), from PRD §10's explicit Phase-2 gating, and from CLAUDE.md's "T5 and T7 are Phase 2, skipped" framing already stated before this build started.

**What would close this:** Once Phase 2 is in scope (actions/approvals tables exist, D4/D5 resolved), T5/T7 get their own spec alongside the write-path build — not retrofitted onto spec 014's Phase-1-scoped file cap.

---

## 2026-10-08 — Ratchet Mode 2 (Green) + Red-Alert Mode 2 (Diff Re-check)

### [COMPLIANCE-REPORT] Phase 1 build verified green; Red-Alert Mode 2 re-check of the 6 original findings — 5 confirmed closed, 1 new non-blocking gap

**Ratchet Mode 2:** `npm test` → 19 passed, 1 skipped (20 files); 139 passed, 2 skipped (141 tests). `npm run build` → compiles clean, `/api/runs` and `/api/runs/[id]` both register as dynamic routes. Both oracles green as of commit `c6a5dce` on `worktree-agent-afdb4de6b4bdbcbc9`.

**Red-Alert Mode 2** re-checked the actual diff against PRD §9's six findings, not a fresh audit:

1. **Two-check auth (finding #1):** CONFIRMED closed. `lib/server/auth.ts` exposes `verifySession`/`isAllowlisted` as two separate functions; both `app/api/runs/route.ts` and `app/api/runs/[id]/route.ts` call both, no combined guard exists to call instead.
2. **IDOR / per-resource ownership (finding #2):** CONFIRMED closed. `db.runs.getOwned(id, userId)` filters `WHERE id = :id AND user_id = :userId` as the query predicate itself; the route handler collapses "doesn't exist" and "exists but not yours" to the same `not_found` response.
3. **GITHUB_WRITE_TOKEN provisioning gate (finding #3):** CONFIRMED closed. Zero references anywhere in `lib/` or `app/`.
4. **RLS on all 4 tables (finding #4):** CONFIRMED present in `migrations/0001_init.sql` for `runs`, `issues`, `tool_calls`, `reports`. Automated test remains skipped pending real Supabase credentials — already logged as a gap by Wheeljack above, not a new finding.
5. **Strict CORS (finding #5):** CONFIRMED closed for the allowlist check itself — `lib/server/cors.ts`'s `checkCorsOrigin` is non-wildcard, checked first in every handler, before auth.
6. **Secrets/logging discipline (finding #6, generalized):** CONFIRMED closed. `LogMeta` in `lib/server/logger.ts` has no free-text field (structural, not conventional); `config.ts` never logs secret values, only warns on missing `GITHUB_READ_TOKEN`.

**[GAP] New, non-blocking: no `OPTIONS` handler on either route, despite `cors.ts` advertising `OPTIONS` in `Access-Control-Allow-Methods`.** A real browser request will preflight (OPTIONS) because `Authorization` is a non-simple header; neither `app/api/runs/route.ts` nor `app/api/runs/[id]/route.ts` exports an `OPTIONS` handler, so Next.js's App Router will 405 the preflight, blocking the actual GET/POST from ever being sent by a browser. Not blocking for this cycle (backend-only, no frontend caller exists yet to trigger a real preflight; `curl`/server-to-server calls used by the T1-T10 acceptance tests never preflight). **Must be fixed before Ivaylo's frontend slice makes its first real browser call** — add an `OPTIONS` export to both route files that returns `buildCorsHeaders(origin)` with a 204, reusing the existing `checkCorsOrigin`/`buildCorsRejectedResponse` helpers already in `cors.ts`. Flagged for whoever starts the frontend integration, and for perceptor's close-out gap review.

**Soundwave (conditional, specs 009/011/013):** Architecture holds. The D9 auth-provider swap risk is correctly isolated behind the two-function `verifySession`/`isAllowlisted` interface — a provider change touches only `auth.ts`. The IDOR defense is structural (query predicate, not a post-fetch comparison) so it can't regress via a careless edit to the handler. RLS is real defense-in-depth, not just declared SQL (per Wheeljack's manual psql verification above). No architectural concerns beyond the OPTIONS gap already logged under Red-Alert above.

**Verdict:** Phase 1 backend build PASSES Mode 2 review. One non-blocking gap logged (OPTIONS/preflight) for pre-frontend-integration fix. Cleared for Scattershot to ship.

---

## 2026-10-08 — Scattershot (Ship)

### Phase 1 backend merged to `main`

Merged `worktree-agent-afdb4de6b4bdbcbc9` (specs 001-015, Ratchet Mode 2 green, Red-Alert Mode 2 passed) into `main` via `--no-ff` merge. Removed the now-fully-merged worktree and its branch. Re-verified post-merge at root: `npm test` → 139 passed, 2 skipped (141); `npm run build` → clean. `main` now holds the complete Phase 1 backend (`app/api/`, `lib/server/`, `migrations/`, full test suite, README, `.env.example`).

No production deploy performed — that stays an explicit separate human step per CLAUDE.md.

**Carried-forward open items (not closed by this merge):**
- OPTIONS/CORS-preflight gap (logged under Red-Alert Mode 2 above) — fix before Ivaylo's frontend makes its first real browser call.
- `tests/integration/rls.test.ts` automated test still skipped pending real Supabase credentials (manually verified instead, per Wheeljack's log entry).
- D9 (auth provider) still pending Ivaylo's explicit sign-off — PRD §12 Definition of Done not yet met on this point.
- Retention/deletion stance for quoted third-party GitHub text (PRD §9 finding #6) — unresolved product escalation.

---

## 2026-10-15 — Red-Alert + Soundwave (re-dispatched) + Jonathan (joint-ownership fixes)

### [DECISION] Oct 14 public-signup change reverted — PRD §9 finding #1 had silently regressed

Commit `acf9ebf` ("Enable public Google signup and preserve private report ownership", Ivaylo, Oct 14) deleted `isAllowlisted()` from `lib/server/auth.ts` and `config.allowedUserEmails`, removing the second half of the two-check auth gate this log's 2026-10-08 entry above had explicitly marked **CONFIRMED closed**. Re-dispatching Red-Alert Mode 2 and Soundwave against the current codebase (not a fresh audit — a targeted re-check of exactly this finding, same methodology as the original close-out) found:

- **Red-Alert: FAIL, critical.** Any Firebase-verified identity — Google or, after the later email/password commit, email+password — could call `/api/runs`, not just the allowlisted pair. `app/api/runs/route.ts`'s own header comment ("two-check auth") had gone stale and no longer matched the code beneath it.
- **Soundwave: data confidentiality intact, cost/credential exposure real.** `db.runs`'s ownership-scoped queries meant a new signup could never read another user's existing reports — the "preserve private report ownership" half of the Oct 14 commit's own stated intent held up. But every new signup got its own fresh `runsPerUserPerHour` allowance against the shared `ANTHROPIC_API_KEY`/`GITHUB_READ_TOKEN`, with zero logging of signups or token spend to detect it (closed separately, see the observability work below).

**Action taken, under Jonathan and Ivaylo's joint ownership of this project, logged here rather than silently overwritten:**
- Restored `isAllowlisted()`/`config.allowedUserEmails` and the two call sites (`lib/server/auth.ts`, both `app/api/runs/route.ts` handlers, `app/api/runs/[id]/route.ts`).
- Reverted the misleading UI copy the Oct 14 commit introduced: `AccessGate.tsx`'s "Anyone can create an account with Google" and `SignIn.tsx`'s "No invitation needed" badge, both of which now claim open access that no longer exists. The email/password signup flow itself (added later, on top of the Oct 14 decision) was **kept** — it's a legitimate sign-in method orthogonal to allowlist gating, not something this revert needed to remove; a non-allowlisted signup still correctly lands on `/not-authorized` via the existing `isAccessError` redirect in `AccessGate.tsx`'s `VerifiedAccess`.
- Reverted `README.md`'s intro line and retention-stance paragraph to allowlist-aware wording, and replaced the "Public registration decision" section with this entry's pointer rather than deleting it outright.
- Reverted `FRONTEND-HANDOFF.md`'s three touched spots (env setup step 4, day-1 test plan, "not yet verified" section).
- Added `WITH CHECK` to the `runs_update_own` RLS policy (new migration `20261015193012_runs_update_with_check.sql`) — Red-Alert flagged the missing clause separately; low severity today since only `service_role` writes, but closed as defense-in-depth. **Must still be applied manually via the Supabase SQL editor against the live instance — no CLI/DB credentials were available in this session to apply it directly.**

**Not done here, explicitly flagged for Ivaylo:** this session separately broadened repo scope from one hardcoded repo (`calcom/cal.diy`) to any public GitHub repo, which touches the shared `ErrorCode` contract (`repo_not_allowed` removed — see below) and the frozen system-prompt text. Both are called out again in that work's own log entry.

**Confirm before relying on this:** `.env`'s `ALLOWED_USER_EMAILS` was set to `jonathangaal@pursuit.org,ivaylo.nanev@pursuit.org` — the second address is inferred from Ivaylo's git commit author email, not confirmed as his actual Firebase/Google sign-in identity. Verify this before deploying; a wrong value locks out the only two legitimate users.
- The stray `issuescout/` scaffold directory at the repo root is still untracked, unused leftover from before spec 001 relocated the real app to the project root — candidate for deletion, not yet acted on.
