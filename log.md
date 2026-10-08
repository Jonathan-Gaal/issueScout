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
