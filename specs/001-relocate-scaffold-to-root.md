# 001 — Relocate the Next.js scaffold to the project root

## [SPEC]

- **Objective**: Resolve the path ambiguity Jazz flagged (codebase-map.md "Confusion"): move the valid, already-`npm install`-run Next.js scaffold currently sitting in the stray `issuescout/` subfolder up to the project root (`/Users/jongaal/Documents/native_ai/L2/wk3/projects/issueScout/`), so every subsequent spec's paths (`app/api/...`, `lib/server/...`, `migrations/...`, `tests/...`) resolve directly under the project root, not under a nested `issuescout/` directory. Install the four remaining pre-authorized dependencies (`zod`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `firebase-admin`) plus the dev dependency `vitest`.
- **Chosen approach (Shockwave's call, per the Orchestrator's resolved ambiguity — option (a), not (b))**: Move files up, don't scaffold fresh. The existing `issuescout/` tree is a legitimate, already-`npm install`-run `create-next-app` output (Next.js 16.4.0, React 19.3.0, TypeScript, Tailwind v4, ESLint — confirmed via Jazz's codebase-map.md and a direct read of `issuescout/package.json`). Its `package.json` `"name"` field is already the required lowercase `"issuescout"` — no rename needed, contrary to the Orchestrator's assumption that this still needed fixing; Wheeljack should verify this on arrival and treat it as already-satisfied, not re-derive a fix for a problem that doesn't exist. Deleting this tree and re-running `create-next-app` at a temp name would burn an install cycle and a scaffold generation for zero benefit over moving files that are already correct, just mislocated. This is the cleaner option and is authorized as such.
- **Inputs/Outputs**: N/A — this is a filesystem/tooling spec, not an API-shape spec. No TRD §3 contract is implicated.
- **Design Pattern**: none — simple case (directory move + package install).
- **Bounded-AI boundary**: Entirely deterministic. No LLM-generated content; this is `mv`/`npm install`/file-edit work only.
- **Verification Oracle**: From the project root, run:
  1. `test -d issuescout && echo FAIL || echo PASS` — the stray subfolder no longer exists.
  2. `test -f package.json && test -d app && test -d node_modules && echo PASS` — scaffold now lives at root.
  3. `node -e "const p=require('./package.json'); if(p.name!=='issuescout') process.exit(1)"` exits 0 — package name is lowercase `issuescout`, directory stays `issueScout` (confirmed by `pwd` showing the capitalized path).
  4. `npm ls zod @supabase/supabase-js @anthropic-ai/sdk firebase-admin vitest --depth=0` exits 0 — all five newly-installed packages resolve.
  5. `npm run build` completes without error against the stock scaffold (confirms the moved Next.js app still builds before any IssueScout code is added).
- **Intellectual Control**: A pure relocation has no logic to get wrong beyond "did the files move and do dependencies resolve" — low risk, mechanically checkable, and it unblocks every path reference in every later spec. Doing this first means no later spec has to guess at a path prefix.
- **Constraints**: Do not modify `app/page.tsx` / `app/layout.tsx` content in this spec — they stay the stock template for now; a later frontend spec (out of scope this cycle, Ivaylo's slice) overwrites them. Do not touch `.env` or `.gitignore` at the root (both already exist and are correct per Jazz's packet). Preserve `node_modules`/`package-lock.json` from the move rather than re-running a fresh `npm install` from scratch, to avoid an unnecessary full reinstall; `npm install` only for the four new runtime deps + vitest.
- **Edge Cases**: If `node_modules` fails to move cleanly (symlink/permission issues), prefer re-running `npm install` at the root fresh over debugging a partial move. If root-level `.gitignore` doesn't already exclude `node_modules`/`.next` (it currently excludes only `.env` and `node_modules/` per Jazz's packet — `.next` is not listed), add `.next` to the root `.gitignore` as part of this move since the relocated scaffold will produce a `.next` build cache at root. Confirm no root-level file collides with a moved file before overwriting (there should be none — root currently has only `.env`, `.gitignore`, `.git`, the doc `.md` files, and the PNG diagram).
- **UI States**: N/A — no UI files touched.
- **Files** (≤5):
  1. Moves (not new content): `issuescout/package.json`, `issuescout/app/`, `issuescout/public/`, `issuescout/tsconfig.json`, `issuescout/next.config.ts`, `issuescout/eslint.config.mjs`, `issuescout/node_modules/`, `issuescout/package-lock.json` → each to the equivalent root path. (Counted as one unit of work — a relocation, not 8 separate edits.)
  2. `package.json` (root, post-move) — edited to add the 5 new dependencies.
  3. `.gitignore` (root) — add `.next` if not already present.
  4. Delete: `issuescout/` (now empty) and its leftover `AGENTS.md`, `README.md`, `.next/` build cache, `.gitignore` (the subfolder's own, superseded by root's).
  5. (reserve slot — not expected to be needed)

[FORCES]
1. Unblocking every later path reference > doing a from-scratch scaffold that re-proves nothing new.
2. Simplicity > Pattern purity (always present unless explicitly overridden).
