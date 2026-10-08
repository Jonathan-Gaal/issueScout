# CLAUDE.md — IssueScout (Project-Local)

**Author:** Alpha Trion (Project Assembly)
**Date:** 2026-10-08
**Tier:** Full (confirmed by human after a borderline call — see `PRD.md` header)
**Scope of this run:** Phase 1 only (read-only triage). Phase 2 (write-back) and Phase 3 (evals) are scoped in the PRD but not built this cycle.

This file is what every dispatched agent on this project actually reads — dispatched subagents do not inherit the root `native_ai/CLAUDE.md`. Anything that needs to reach them has to be said here.

---

## Handoff order (starting point: Starscream's PRD)

```
PRD.md (starscream, done) + APPFLOW.md / DESIGN-BRIEF.md / USER-STORIES.md (starscream, done)
  -> TRD.md / SCHEMA.md (alpha-trion, this file's companion docs, done)
  -> jazz (context packet — run before shockwave starts)
  -> shockwave (writes specs/NNN-slug.md, one per phase-1 slice; cites TRD.md §3 for API shape, USER-STORIES.md for oracles)
  -> optimus-prime (spec review)
  -> ratchet Mode 1 (red)
  -> wheeljack (build — backend only, this cycle)
  -> ratchet Mode 2 (green) -> red-alert Mode 2 (diff) -> soundwave (conditional, see below)
  -> scattershot (ship: commits, docs, changelog note)
  -> perceptor -> orion-pax (close)
```

`bumblebee`, `hotshot`, and `blaster` are deliberately **not** in this cycle's roster — see Team Selection below for why, and the per-phase re-evaluation note.

---

## Team roster for this build (Phase 1)

| Agent | In this cycle? | Phase(s) it works | Why |
|---|---|---|---|
| teletraan-1 | Yes (already ran) | INTAKE | Standard, ran at intake — CLEAR. |
| red-alert | Yes | INTAKE (done) + GREEN (post-build diff) | Mode 1 already ran — FAIL, 6 findings, now PRD §6/§9 requirements. Mode 2 must re-run on the actual diff, specifically re-checking the two-check auth gate, the IDOR/ownership check, CORS, RLS, and secret handling — these are exactly what Mode 1 flagged, so Mode 2 is confirming the fix landed, not a fresh audit. |
| starscream | Yes (already ran) | PRD | Produced PRD.md + 3 companion docs. Done. |
| alpha-trion | Yes (this run) | ASSEMBLY | This file + TRD.md + SCHEMA.md. |
| jazz | Yes | Once, before shockwave | Repo already has a Next.js scaffold (`issuescout/`) — jazz's first job is confirming what's actually there vs. what the build plan assumes, before shockwave plans against stale assumptions. |
| shockwave | Yes | SPEC | Must cite `TRD.md` §3 for every endpoint shape and `USER-STORIES.md` for every oracle — not invent either. See the build-plan note below: a detailed, human-approved design already exists and should anchor spec-writing, not be re-derived. |
| optimus-prime | Yes | spec review | Standard gate; this project's specs will be unusually contract-heavy (zod schemas, harness state machine) — exactly where a missing-oracle or over-cap spec is likely, so this gate earns its cost here. |
| ratchet | Yes | RED + GREEN | Standard, both modes. Mode 2 additionally reviews against `laws-of-ux` only if/when any UI-touching spec exists in this cycle (unlikely — see wheeljack note below). |
| wheeljack | Yes | BUILD | **Backend only, this cycle.** Jonathan owns `app/api/`, `lib/server/`. Do not dispatch wheeljack against Ivaylo's slice (`app/` minus api, `components/`, `lib/client/`) — that's a separate branch, separate owner, not started, and out of scope for this assembly run. |
| bumblebee | **No, not this cycle** | — | Integration/e2e testing exercises a running app end-to-end. With only the backend slice being built and the frontend not started, there is no end-to-end flow to walk yet — bumblebee's job (start the app as it runs in production, walk the exit criterion) has nothing to exercise beyond what wheeljack's own API-route tests already cover. Reinstate once Ivaylo's frontend branch has a submit-to-report flow to actually click through. |
| hotshot | **No** | — | No refactor task exists. This is a greenfield build on a fresh scaffold, not technical debt remediation. Reinstate only if a dedicated refactor task is opened later. |
| soundwave | **Conditional, not default-included** | post-GREEN | PRD §9 and the Red-Alert findings put real security/architectural weight on this build (auth two-check, IDOR, RLS, CORS, secret handling, a GitHub write-token provisioning gate for later). Soundwave runs "only on security or architectural changes" — the auth/ownership/RLS work in this phase qualifies. Include soundwave specifically for the spec(s) implementing auth + the per-run ownership check, not for the whole build (e.g., not for a logger or a zod schema file). |
| scattershot | Yes | SHIP | Feature-branch commits, README, `.env.example`, changelog note. Standard inclusion — every build needs this. No production deploy without explicit human approval (hard rule, unconditional here too). |
| blaster | **No, not yet** | — | Blaster packages a *demo* of *verified* work (`ratchet`'s green compliance reports) into a confidence map and demo script. This is explicitly a portfolio project (see PRD §1 "market positioning"), so blaster is in-category — but nothing is verified-green yet; there's nothing to package. **Re-evaluate at the close of Phase 1** (or whenever Jonathan/Ivaylo want a demo-ready snapshot) rather than running it now against an empty compliance-report set. |
| perceptor | Yes | CLOSE | Standard, runs at project close. |
| orion-pax | Yes | CLOSE | Standard, runs at project close. |

### Explicit omissions and reasoning (for perceptor's later check against what the build actually needed)

- **bumblebee** — excluded this cycle; no runnable end-to-end flow exists yet (frontend not started). Not "never," just "not yet."
- **hotshot** — excluded; no refactor task defined.
- **blaster** — excluded for *this* dispatch cycle despite being portfolio-facing (which would normally justify inclusion) because nothing is ratchet-verified yet for it to package. Include it once Phase 1 has at least one green `[COMPLIANCE-REPORT]` to build a confidence map from.
- **soundwave** — included conditionally (auth/ownership/RLS specs only), not for every spec in the build, per the minimum-viable-team discipline — a zod schema file or a config module is not an architectural change in the sense soundwave exists to assess.

---

## Project-specific constraints (apply to every dispatched agent)

- **Backend only, this cycle.** Jonathan's slice is `app/api/` and `lib/server/` inside `issuescout/`. Never dispatch a builder against `app/` (non-api), `components/`, or `lib/client/` — that is Ivaylo's slice, on a separate branch not yet started. Touching it here would create merge conflicts against work that hasn't happened yet.
- **Phase 1 is read-only against GitHub.** No code path may call a GitHub write endpoint. `ModelReport.proposedActions` MUST be forced to `[]` by the harness before the report is returned, regardless of what the model emits — this is a build-time invariant, not a trust-the-model assumption (see TRD.md §5, SCHEMA.md).
- **A human-approved, detailed Phase-1 backend design plan already exists** at `/Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md`. It resolved D2 (Anthropic primary, Groq best-effort swap), D3 (read-only fine-grained PAT), D6/D7/D8 (constants), and gives file-by-file structure, the config module shape, the GitHub/model provider interfaces, the harness pseudocode, the zod schema approach, the DB migration SQL, API route handlers, and a build order. **Shockwave should treat this as a strong design reference when writing specs** — it already did the design thinking; re-deriving a different shape from scratch would contradict a decision Jonathan already made and tested conversationally. TRD.md and SCHEMA.md (this assembly run's output) are the authoritative contract specs trace to; the plan file is the implementation-shape reference for *how* to hit that contract.
- **D9 (auth mechanism) is still a placeholder pending Ivaylo's explicit sign-off** (PRD §11, §12 Definition of Done). Build against the Firebase-Auth-placeholder interface described in TRD.md §5, but do not treat D9 as closed — the two-check auth requirement (signed-in != allowed) must work regardless of which provider ends up behind the interface.
- **Five env/constant placeholders are tagged `CONFIRM BEFORE SHIPPING`** in `lib/server/config.ts` per the build plan (D2 provider choice, D3 PAT scope, D6/D7/D8 constants, D9 auth/allowlist). Grep for that tag as a pre-deploy gate; do not silently resolve any of them without the owners' sign-off.
- **`GITHUB_WRITE_TOKEN` must not be created or provisioned in this cycle at all.** PRD §9 finding #3 — it's Phase-2-only and gated on D5 (`PRACTICE_REPO`) being finalized. No spec in this cycle should reference it.
- **Secrets discipline is absolute.** `GITHUB_READ_TOKEN`, the model API key, and the Supabase service-role key live in backend env vars only — never in code, commits, prompts, model context, logs, README, or anything sent to the browser (PRD §9, Build Spec §4). Scattershot may write `.env.example`, never `.env`.
- **Logging is identifiers/counts/outcomes only** — never issue bodies, comments, tokens, or personal data (Build Spec §8.2). Any spec touching `lib/server/logger.ts` must be checked against this.
- **No wildcard CORS, ever, at any point in the build** — `CORS_ALLOWED_ORIGINS` is a non-wildcard explicit allowlist checked server-side on every request (PRD §9 finding #5). This is not a "configure it before deploy" item; build it in from the first route handler.
- **RLS is required on all four Phase-1 tables** even though the service-role key bypasses it (PRD §9 finding #4). Don't skip it as "unnecessary" — it's defense-in-depth for any future non-service-key caller (eval tooling, admin scripts).
- **Model-derived text is never rendered as HTML/Markdown** anywhere this project touches rendering (frontend, out of scope this cycle, but any backend-side templating must honor the same rule) — plain escaped text only (Build Spec §8.2, DESIGN-BRIEF.md §3).
- **The retention/deletion stance for quoted third-party GitHub text (PRD §9 finding #6, US-8) is an open escalation, not resolved by this assembly run.** No spec in this cycle should assume an answer; flag it again at close if still unresolved.

---

## Skill propagation (the conditional-firing mechanism for this project)

Per the PRD's Technical Decisions (§7) and stack:

- **`~/.claude/skills/typescript/SKILL.md`** — the entire backend is TypeScript (Next.js API routes). Covers JS runtime gotchas (async/await, closures) as well as the type system — relevant to the harness's async tool-call loop.
- **`~/.claude/skills/postgresql/SKILL.md`** — Supabase Postgres schema work (migrations, RLS policies, explicit FK behavior per SCHEMA.md). Applies directly to the `runs`/`issues`/`tool_calls`/`reports` migration.
- **`firebase` skill** — the auth placeholder (D9) is Firebase Auth. Security Rules are listed as a Crucial Juncture concern in that skill; note the actual data store here is Supabase, not Firestore, so the skill's *Auth integration* section is what applies, not its Firestore data-modeling section. Apply it when building `lib/server/auth.ts`.
- **`.claude/skills/ai-feature-rules/SKILL.md`** — this is an LLM-backed feature (the harness's tool-calling loop against Claude/Groq). Applies to the model client, the system prompt, and the harness's limit enforcement.
- **`react` / `nextjs-frontend` / `laws-of-ux`** — **propagated here for when Ivaylo's slice starts, not actively needed this cycle** since no frontend work is being dispatched yet. Noted now so the next assembly touch-point (or a direct re-read of this file when frontend work begins) doesn't have to re-derive the propagation list. When frontend specs are written: `~/.claude/skills/react/SKILL.md` (component/hook/state patterns), `.claude/skills/nextjs-frontend/SKILL.md` (Next.js structure), and `.claude/skills/laws-of-ux/SKILL.md` (UI heuristics — mandatory before any component/page/form spec per wheeljack's hard rules) all apply.
- **No Stripe/payment skill** — no payment surface anywhere in this project.
- **`~/.claude/skills/dependency-triage/SKILL.md`** applies as normal — the build plan already named the justified exceptions (zod for untrusted model-output parsing, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `firebase-admin`); any *additional* dependency beyond what the plan already named still needs shockwave authorization per `DEPENDENCY AUTHORITY`.

---

## Wiki

Local wiki path: none created yet for this project — `jazz` creates `wiki/context/` on its first run. Root wiki checked at this assembly run: no `root/agent/*` performance pages exist yet (only one unrelated security pattern and one unrelated decision page — see `.claude/wiki/root/index.md`). Nothing to flag from prior agent performance history; this is effectively a fresh read for every agent on this roster.

---

## Decisions logged this run

See `log.md` in this project directory for the `[DECISION]` ADR entries corresponding to this assembly (team selection, skill propagation scope). If `log.md` does not yet exist, this assembly run creates it.
