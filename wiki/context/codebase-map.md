---
title: Codebase Map — IssueScout
category: entity
tags: [codebase-map, issuescout, current-state, greenfield]
source: n/a
last_updated: 2026-10-08
---

Jazz checks this file against what it actually finds in the tree (`.claude/agents/jazz.md` Process step 5) and flags drift. First run on this project — no prior version of this file existed. `wiki/context/` itself did not exist before this run; created now per `CLAUDE.md`'s note that "jazz creates `wiki/context/` on its first run."

## Stack (as built, not as planned)

| Layer | TRD.md / plan says | Actually built |
|---|---|---|
| Backend (`app/api/`, `lib/server/`) | Next.js App Router Route Handlers, TypeScript, on Vercel | **Nothing.** No `app/api/`, no `lib/server/` directory exists anywhere in the repo. |
| Frontend (`app/` minus api, `components/`, `lib/client/`) | React, Next.js App Router | **Nothing real.** `issuescout/app/page.tsx` and `issuescout/app/layout.tsx` are the unmodified `create-next-app` default template (stock hero section, Next.js/Vercel template links, default Tailwind classes) — not the IssueScout UI. |
| Database | Supabase Postgres, 4 Phase-1 tables (`runs`, `issues`, `tool_calls`, `reports`) | **Nothing.** No `migrations/` directory, no SQL anywhere in the repo. |
| Auth | Firebase Auth + allowlist, two-check (D9 placeholder) | **Nothing.** No `lib/server/auth.ts`, no firebase-admin dependency installed. |
| Model client | Anthropic primary / Groq swap (D2, resolved) | **Nothing.** No `@anthropic-ai/sdk` or model client code. `.env` has an `ANTHROPIC_API_KEY` value only — no code consumes it yet. |
| GitHub client | Read-only fine-grained PAT (D3, resolved) | **Nothing.** No GitHub client code. `.env` has a `GITHUB_READ_TOKEN` value only — no code consumes it yet. |
| Harness | Bounded tool-calling loop, `lib/server/harness/` | **Nothing.** |
| Tests | Vitest, `tests/` per the build plan | **Nothing.** No test runner installed, no test files. |

**Bottom line: there is no clash to find between TRD.md/SCHEMA.md and actual code, because there is no actual code implementing this project's contract anywhere in the repo.** The only code that exists is an unrelated, unmodified scaffold (see below). This is expected at this stage, not a defect — flagging per the audit process so Shockwave doesn't assume any of the plan's file paths already exist.

## The `issuescout/` subfolder — flagged, not acted on

Per the task's explicit instruction, this folder is noted but not modified or removed.

`issuescout/` (sibling to `PRD.md` etc., i.e. `issueScout/issuescout/`) is a **stray, abandoned manual scaffold attempt**, not the real app structure:

- Produced by a vanilla `npx create-next-app` run: Next.js 16.4.0, React 19.3.0, TypeScript, Tailwind v4, ESLint — all stock dependencies, nothing IssueScout-specific added (no zod, no `@supabase/supabase-js`, no `@anthropic-ai/sdk`, no `firebase-admin`).
- `app/page.tsx` and `app/layout.tsx` are the unedited `create-next-app` template output (literally "To get started, edit the page.tsx file," stock Vercel/Next.js template links, default `public/*.svg` icons).
- No `app/api/` directory — the backend contract (TRD §3) has zero implementation here.
- Has its own `node_modules/`, `.next/` build cache, `package-lock.json`, and an `AGENTS.md` (unread — out of scope for this packet; it's inside the stray folder) — this is a real, `npm install`-run scaffold, not just template files copied in.
- **Not a single git commit exists in the whole repo** (`git log` on `main` returns "does not have any commits yet"). Everything, including this folder, is untracked.

**Why this matters downstream:** TRD.md §2 names `app/api/` and `lib/server/` as the backend's home and CLAUDE.md's Project-specific constraints say "Jonathan's slice is `app/api/` and `lib/server/` inside `issuescout/`" — i.e., the plan's intent is almost certainly to build *inside* this `issuescout/` folder (rename or keep), not create a sibling structure at the repo root. Wheeljack/Shockwave should confirm whether `issuescout/` is the intended app root before deciding where `app/api/runs/route.ts` etc. actually land — right now it's a disposable template, but its *location* appears to be the intended one. This is a potential future Clash (intended structure vs. this stray scaffold's actual contents) if the scaffold is kept as-is and built into naively — the stock `app/page.tsx`/`layout.tsx` will need to be overwritten, not merged around.

## Key files (none yet — nothing to map)

No `lib/contract.ts`, no config module, no route handlers, no schema files exist. When Wheeljack starts building, this section should be populated and this map should stop saying "nothing."

## Known gaps / deferred (not bugs — greenfield state)

- Entire Phase 1 backend: input validation, GitHub client, model client, harness loop, zod schemas, DB layer, auth, logger, 3 API routes — all unbuilt, per plan (`/Users/jongaal/.claude/plans/what-can-u-see-wobbly-deer.md`).
- Entire frontend: Ivaylo's slice, not started, no branch created yet (`git branch -a` shows only `main`, and `main` has zero commits).
- `.env` exists with two real secret values (`ANTHROPIC_API_KEY`, `GITHUB_READ_TOKEN`) — present but unconsumed by any code. `.gitignore` exists at repo root (unread content-wise during this pass, but its presence means `.env` is at least nominally protected from an accidental commit — worth Wheeljack/Scattershot double-checking it actually excludes `.env` before first commit).
- D9 (auth provider/allowlist) still a placeholder per PRD §11/§12 — pending Ivaylo's sign-off, independent of any code question.

## Verified counts

Not applicable — no runnable code, no database, nothing to count.
