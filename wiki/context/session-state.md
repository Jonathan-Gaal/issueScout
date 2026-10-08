---
title: Session State — IssueScout (Jazz context packet)
category: entity
tags: [context-packet, issuescout, phase-1, jazz]
source: PRD.md, TRD.md, SCHEMA.md, USER-STORIES.md, APPFLOW.md, DESIGN-BRIEF.md, CLAUDE.md, log.md, ISSUESCOUT-BUILD-SPEC.md, /Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md
last_updated: 2026-10-08
---

# [CONTEXT-PACKET]

**Task:** Build Phase 1 of IssueScout's backend (`app/api/`, `lib/server/`) — a bounded, read-only, tool-calling LLM harness that takes one GitHub issue URL from a signed-in, allowlisted maintainer and returns a structured triage `Report` (summary, category, priority, suggested labels, evidence, related issues, coverage), persisted to Supabase Postgres, with two-check auth, per-run IDOR protection, strict CORS, and RLS as defense-in-depth. Frontend, Phase 2 (write-back), and Phase 3 (evals) are explicitly out of scope this cycle.

## Files (≤10, path — why it matters)

- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/TRD.md` — authoritative API contract (§3: `Report`/`ModelReport` shape, 3 active Phase-1 endpoints, the `github_issue_research` tool contract, all 12 harness-enforced limit constants). Shockwave cites this, never invents a shape.
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/SCHEMA.md` — authoritative data model for the 4 Phase-1 tables (`runs`, `issues`, `tool_calls`, `reports`), their RLS policy shape, and the two real indexes that matter.
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/USER-STORIES.md` — per-feature EARS acceptance criteria (US-1 through US-9); map each spec's Verification Oracle to the matching US-N directly, not to the PRD's project-wide criteria.
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/PRD.md` §9 — the six Red-Alert security findings as binding MUSTs (two-check auth, per-resource IDOR check, write-token provisioning gate, RLS, strict CORS, retention stance); §12 Acceptance Criteria is Phase 1's definition of done.
- `/Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md` — human-approved, detailed implementation design: exact directory structure, config module shape, GitHub/model provider interfaces, harness pseudocode mapped to TRD's 9 steps, zod validation approach, migration SQL, route-handler shape, build order. Treat as load-bearing design reference per CLAUDE.md — don't re-derive a different shape.
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/ISSUESCOUT-BUILD-SPEC.md` — original human-authored spec; still valid, cited by section number throughout PRD/TRD/SCHEMA. Contains the verbatim system prompt (§10) and the 10 acceptance tests T1-T10 (§11) — TRD/plan don't restate the prompt text, so this file is the only copy.
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/CLAUDE.md` — project-local agent instructions: team roster/reasoning, backend-only scope this cycle, the 5 `CONFIRM BEFORE SHIPPING` placeholders (D2/D3/D6/D7/D8/D9) living in one config file, skill propagation (`typescript`, `postgresql`, `firebase`-auth-section, `ai-feature-rules` active now; `react`/`nextjs-frontend`/`laws-of-ux` noted for later).
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/log.md` — ADR 001 (minimum-viable team: bumblebee/hotshot/blaster excluded this cycle, soundwave conditional on auth/IDOR/RLS specs) and ADR 002 (skill propagation scoped to backend stack).
- `/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/issuescout/` — stray scaffold, see Context audit below. Not a real input; flagged, not read for contract purposes.

## Key facts

- **Contract is frozen.** TRD.md states "treat sections 5, 6, 9 as a proposed contract unless an owner changes them" (lifted verbatim from Build Spec §0). Any spec whose endpoint/report shape doesn't match TRD §3 exactly is a halt-and-escalate, not a quiet workaround.
- **Harness state machine = 9 numbered steps**, authoritative numbering fixed in TRD §2 and Build Spec §8.1 — specs reference these step numbers, never renumber them. Step 10 (approval) is Phase 2, not built this cycle.
- **`proposedActions` MUST be force-overwritten to `[]`** by the harness immediately before persist/return, in Phase 1, regardless of model output — a build-time invariant, not model trust (TRD §3.1, CLAUDE.md).
- **Two-check auth, always in this order:** `verifySession(req)` then `isAllowlisted(email)`, as two separate functions, never one combined guard (TRD §5, PRD §9 finding #1, US-1). This is the highest-severity Red-Alert finding.
- **Per-resource ownership check is a query predicate, not a post-fetch comparison:** `WHERE id = :id AND user_id = :requestingUserId` (TRD §4/§5, PRD §9 finding #2, US-5). `GET /api/runs/:id` for a non-owned run must return the *same* response shape as a non-existent run (`not_found` or `unauthorized`, pick one, apply consistently) — existence must never be distinguishable.
- **No write capability anywhere in the model's tool schema, in any phase** — the injection defense is architectural (no `owner`/`repo` param, no write operation defined), not prompt-only. `containsEmbeddedInstructions` is a reviewer signal, not the actual defense.
- **GITHUB_WRITE_TOKEN must not be created/provisioned this cycle at all** — gated on D5 (`PRACTICE_REPO` name) being finalized (PRD §9 finding #3). No spec should reference it.
- **RLS required on all 4 Phase-1 tables even though the service-role key bypasses it for every real caller today** — defense-in-depth for a future non-service-key caller (PRD §9 finding #4, US-7, SCHEMA.md Row Level Security section). Must actually be tested (attempt a non-service-role read/write, confirm denial), not just declared in SQL.
- **CORS: non-wildcard explicit allowlist, server-checked on every request, from the first route handler** — not a pre-deploy checklist item (CLAUDE.md, PRD §9 finding #5, US-6).
- **Model text renders as plain escaped text only, never HTML/Markdown** — relevant even backend-side (response assembly) even though frontend isn't built this cycle (TRD §5, DESIGN-BRIEF §3).
- **Logging is identifiers/counts/outcomes only** — never issue bodies, comments, tokens, or personal data; `logger.ts`'s `meta` param should be structurally incapable of accepting free text (TRD §4, Build Spec §8.2).
- **5 placeholders live in one config file (`lib/server/config.ts`), each tagged `// CONFIRM BEFORE SHIPPING`**, grep-able: D2 (model provider), D3 (PAT scope), D6/D7/D8 (`ISSUE_MAX_CHARS=20000`, `MAX_OUTPUT_TOKENS=4000`, `RUNS_PER_USER_PER_HOUR=10`), D9 (auth/allowlist — still open pending Ivaylo's sign-off, per PRD §11/§12 Definition of Done).
- **Dependency list already pre-authorized by the plan:** `zod`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `firebase-admin`, `vitest`, native `fetch`+`AbortController` for GitHub/Groq (no extra HTTP client). Any *additional* dependency beyond this list needs Shockwave's `DEPENDENCY AUTHORITY` sign-off per CLAUDE.md.
- **Build order is fixed** (plan "Build order" section, 16 steps): shared types → config/errors → GitHub client → zod schemas → model providers → prompt → harness pieces → `runHarness.ts` → DB/migration → auth → logger → API routes → acceptance tests → README → manual smoke test.
- **Team/skill context (log.md, CLAUDE.md):** soundwave runs conditionally, only on the spec(s) implementing auth + per-run ownership check — not the whole build. `react`/`nextjs-frontend`/`laws-of-ux` are not live this cycle (no frontend spec exists yet); don't propagate them prematurely.

## Out of scope (deliberately excluded, and why)

- Frontend (`app/` minus api, `components/`, `lib/client/`) — Ivaylo's slice, separate branch, not started. No branch exists yet (`git branch -a` shows only `main`).
- Phase 2 (approval workflow, `actions`/`approvals` tables, `GITHUB_WRITE_TOKEN`, write path) — blocked on D4/D5, explicitly out of this cycle per PRD §10/TRD §1.
- Phase 3 (`/api/evals/*`, `eval_results` table) — out of this cycle.
- The `issuescout/` stray scaffold's actual file contents (`AGENTS.md`, its own README, etc.) — flagged for cleanup/decision, not read in depth; not a real input to spec-writing.
- The retention/deletion stance for quoted third-party GitHub text (PRD §9 finding #6, US-8) — open product-level escalation, not something any Phase-1 spec should assume an answer to.

## Context audit

- **Poisoning:** None found. No prior wiki content existed to contradict the code (this is jazz's first run on this project; `wiki/` did not exist before this session).
- **Distraction:** None found — the document set is new and tightly cross-referenced (every PRD/TRD/SCHEMA/USER-STORIES claim cites a Build Spec section or another doc by number), no stale carried-forward detail yet.
- **Confusion:** One real ambiguity, flagged rather than guessed at: **where Phase 1's `app/api/` and `lib/server/` are actually meant to live.** CLAUDE.md says "Jonathan's slice is `app/api/` and `lib/server/` inside `issuescout/`" — implying the stray `issuescout/` folder (currently a vanilla, unmodified `create-next-app` scaffold) is the intended app root, not a throwaway to delete. But nothing in TRD.md/the plan explicitly confirms "build inside the existing `issuescout/` folder" vs. "scaffold a fresh Next.js app at the repo root and ignore/remove `issuescout/`." Shockwave/Wheeljack should get this confirmed before the first spec picks a path prefix — it changes every file path in every spec.
- **Clash:** None between TRD.md/SCHEMA.md and actual code, because **no code implementing the Phase-1 contract exists anywhere in the repo** — there is nothing to clash with yet. This is the expected greenfield state, not a finding of divergence. The one adjacent risk worth naming: SCHEMA.md's "Drift discipline" section says a migration file is expected at `migrations/0001_init.sql` "per the referenced build plan" — that path doesn't exist yet either, consistent with "nothing built."
  - **Flagged pre-emptively (not yet a real clash):** the stray `issuescout/app/page.tsx`/`layout.tsx` (stock `create-next-app` template output) will need to be fully overwritten, not incrementally merged around, whenever frontend work starts — if left as-is and partially built into, it would become a real Clash between "what APPFLOW.md says the Submit-issue screen should be" and "what's actually rendered." Not actionable this cycle (frontend out of scope), but worth carrying forward so Ivaylo's slice doesn't inherit it silently.
- **Incompleteness:** All files declared as required inputs by the task were located and read in full: PRD.md, APPFLOW.md, DESIGN-BRIEF.md, USER-STORIES.md, TRD.md, SCHEMA.md, CLAUDE.md, log.md, ISSUESCOUT-BUILD-SPEC.md, and the external plan file at `/Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md`. The `issuescout/` subfolder was surveyed structurally (file listing, `package.json`, `app/page.tsx` contents) but not read file-by-file (e.g. its `AGENTS.md`, `eslint.config.mjs`) since it's confirmed disposable template output, not a contract input — reading it deeper would not change any plan. No declared input was missing.
