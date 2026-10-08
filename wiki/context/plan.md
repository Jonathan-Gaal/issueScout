---
title: Phase 1 Build Plan — IssueScout
category: entity
tags: [plan, issuescout, phase-1, shockwave]
source: PRD.md, USER-STORIES.md, TRD.md, SCHEMA.md, CLAUDE.md, ISSUESCOUT-BUILD-SPEC.md, /Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md, wiki/context/codebase-map.md, wiki/context/session-state.md
last_updated: 2026-10-08
---

# [PLAN]

## Goal (one sentence)

Build Phase 1 of IssueScout's backend — a bounded, read-only, tool-calling LLM harness that turns one signed-in, allowlisted maintainer's GitHub issue URL into a structured, validated triage report, persisted to Supabase with two-check auth, per-run IDOR protection, strict CORS, and RLS defense-in-depth — with `proposedActions` forced to `[]` in every report, no GitHub write capability anywhere, and `GITHUB_WRITE_TOKEN` never provisioned this cycle.

## Critical path

1. **Path resolution first** (spec 001) — every later spec's file paths depend on resolving Jazz's flagged ambiguity (stray `issuescout/` scaffold vs. project root). Nothing else can be built against a path that might move.
2. **Shared types/config/errors** (spec 002) — every other backend file imports from `lib/contract.ts`/`config.ts`/`errors.ts`.
3. **Independent leaf pieces, buildable in any order relative to each other** (specs 003 GitHub client, 004 zod schema, 005 model provider, 006 system prompt) — each depends only on spec 002, not on each other.
4. **Harness pieces** (specs 007 tool executor + content validation, 007b rate limiter) — depend on specs 002-005.
5. **Harness wiring** (spec 008, `runHarness.ts`) — the integration point; depends on 002-007b. This is the single highest-complexity file in the build and the one most of Build Spec §11's acceptance tests (spec 014) target directly.
6. **Database** (specs 009 migration+RLS, 010 client+runs, 010b issues/toolCalls/reports) — 009 can run in parallel with specs 003-006 (no code dependency, just needs to land before 008's persistence calls are wired and before 010/010b can query against real tables). 010/010b depend on 009's schema.
7. **Auth** (spec 011) — depends only on spec 002; order-independent relative to specs 003-010b, but must land before spec 013 (route handlers call it).
8. **Logger** (spec 012) — depends only on spec 002; order-independent, must land before spec 013 if route handlers log (they should, per PRD §9 Observability).
9. **API routes + CORS** (spec 013) — the integration point for auth (011), harness (008), and data layer (010/010b). This and spec 008 are the two highest-blast-radius specs in the sequence.
10. **Formal acceptance tests** (spec 014) — depends on spec 008 (and transitively everything underneath it) being complete and correct; this is Phase 1's primary go/no-go oracle alongside spec 013's IDOR test.
11. **Docs** (spec 015) — last; documents what's actually built, not what's planned.

**Recommended build order for Wheeljack:** 001 → 002 → (003, 004, 005, 006 in any order, or parallel) → (007, 007b) → 009 (can start as soon as 002 lands, in parallel with 003-006) → 008 → (010, 010b) → 011 → 012 → 013 → 014 → 015.

## Points of brittleness

- **D9 (auth provider) is a placeholder, not finalized.** Spec 011 builds against the Firebase-shaped interface TRD §5 describes, but PRD §12's Definition of Done explicitly withholds "Phase 1 complete" until Ivaylo signs off. If D9 changes to a different provider, only spec 011's internals change — the two-function interface (`verifySession`/`isAllowlisted`) is the isolation boundary, by design.
- **Model provider swap behavior (D2, Anthropic/Groq) is an acknowledged, not eliminated, risk** (TRD §6). Spec 004's zod validation is the safety net regardless of which provider spec 005 routes to — this is why spec 004 is built before spec 008 wires providers in, not after.
- **RLS policies are untested by any real caller in production** (service-role key bypasses them for 100% of today's traffic) — spec 009's oracle explicitly requires a non-service-role test connection; if no real Supabase instance exists in the build environment, this must be logged as a skipped-with-reason gap, never silently dropped.
- **`MAX_MODEL_TURNS`/`MAX_RUN_SECONDS` are stated as starting values**, not final — spec 008's limit-enforcement code should treat these as `config.ts` constants (already true per spec 002), not hardcoded magic numbers, so adjusting them later never requires touching harness logic.
- **Vercel's own function-duration limit vs. `MAX_RUN_SECONDS=120`** (TRD §6's named risk) is a deploy-time check, not a code-level one — flagged here so it isn't lost; no spec in this cycle builds against a real Vercel deploy, so this risk is carried forward rather than closed.

## Deliberately not planned this cycle (and why)

- **Phase 2 (write-back, `actions`/`approvals` tables, `GITHUB_WRITE_TOKEN`, approval workflow)** — blocked on D4/D5 per PRD §10; explicitly out of scope per the task. SCHEMA.md documents these tables' eventual shape and RLS policy now (spec 009) so Phase 2 doesn't re-derive that decision, but no Phase-2 code is written.
- **Phase 3 (eval harness, `/api/evals/*`, `eval_results` table)** — out of scope per the task; not planned.
- **Frontend (Ivaylo's slice)** — separate branch, not started, out of scope for this backend-only cycle per CLAUDE.md's explicit "never dispatch a builder against Ivaylo's slice" rule.
- **Retention/deletion stance for stored report excerpts (PRD §9 finding #6 / US-8)** — an open product decision the owners haven't made; spec 015 surfaces it as a documented escalation, no spec in this sequence resolves it, since doing so would mean a builder picking a retention policy no one authorized.
- **A dedicated spec for "fix `package.json`'s name field"** — turned out unnecessary. Direct inspection of `issuescout/package.json` during Shockwave's planning confirmed `"name": "issuescout"` is already lowercase; spec 001 notes this explicitly so Wheeljack doesn't spend effort "fixing" something that isn't broken.

## Spec sequence (build order)

| # | Spec | Files | Depends on |
|---|---|---|---|
| 1 | `specs/001-relocate-scaffold-to-root.md` | 5 | none |
| 2 | `specs/002-shared-contract-config-errors.md` | 4 | 001 |
| 3 | `specs/003-github-url-parsing-and-client.md` | 5 | 002 |
| 4 | `specs/004-model-report-zod-schema.md` | 5 | 002 |
| 5 | `specs/005-model-provider-interface.md` | 5 | 002, (003 for tool-def type only) |
| 6 | `specs/006-system-prompt.md` | 3 | none (pure content) |
| 7 | `specs/007-harness-tool-executor-and-content-validation.md` | 4 | 002, 003, 004 |
| 8 | `specs/007b-rate-limiter.md` | 2 | 002 |
| 9 | `specs/009-database-migration-and-rls.md` | 2 | none (SQL, independent of app code) |
| 10 | `specs/008-harness-run-loop.md` | 4 | 002-007b |
| 11 | `specs/010-database-data-layer.md` | 3 | 009 |
| 12 | `specs/010b-database-data-layer-issues-toolcalls-reports.md` | 4 | 009, 010 |
| 13 | `specs/011-auth-two-check.md` | 2 | 002 |
| 14 | `specs/012-logger.md` | 2 | none |
| 15 | `specs/013-api-routes-and-cors.md` | 4 | 008, 010, 010b, 011 |
| 16 | `specs/014-acceptance-tests-t1-t10.md` | 5 | 008 |
| 17 | `specs/015-readme-and-env-example.md` | 2 | 002, 011 (for D9 status), 014 (for what's verified) |

Note: spec 009 is numbered after 007b but builds early/in-parallel per the critical-path note above — table order here is the numeric filename order, not strict dependency order; see "Recommended build order" above for the actual sequencing Wheeljack should follow.

## Soundwave dispatch points

Per CLAUDE.md's conditional-inclusion rule, dispatch soundwave (post-GREEN risk assessment) specifically against the diffs from:
- Spec 009 (RLS policy definitions)
- Spec 011 (two-check auth)
- Spec 013 (per-run ownership/IDOR enforcement at the route level)

Not against the whole build — a zod schema file or a logger is not the architectural/security surface soundwave exists to assess.

## Assumptions this plan makes, and what invalidates them

- **Assumes** the `issuescout/` scaffold's `package.json` name is already lowercase (verified directly — true as of this planning session). If a future re-scaffold ever regenerates `package.json` from a capitalized directory name, this assumption breaks and spec 001's approach (move, don't regenerate) should be reconsidered.
- **Assumes** a real or locally-running Supabase/Postgres instance is reachable during spec 009's build for the RLS test to actually run (not just be written). If not reachable, spec 009's oracle explicitly degrades to a logged, skipped test — not a silent pass.
- **Assumes** D9 (auth) stays Firebase-shaped through this cycle's build, per the working assumption TRD §5/CLAUDE.md state. If Ivaylo's sign-off changes the provider before this cycle closes, only spec 011 needs rework — the interface boundary is designed to absorb that.
