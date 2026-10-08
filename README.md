# IssueScout

IssueScout prepares a first-pass triage report for one GitHub issue so a maintainer can review it: a signed-in, allowlisted user submits an issue URL, the backend fetches the issue and its comments, an LLM (run inside a bounded tool-calling harness) searches the same repository for related issues, and the app returns a report — summary, category, provisional priority, suggested labels, evidence, missing information, related issues, a recommended next step, and limitations. This build is **Phase 1 only**: read-only against GitHub, no writes of any kind. `proposedActions` is always `[]`, enforced by the harness regardless of what the model produces.

## Running locally

```bash
npm install
cp .env.example .env   # fill in real values — see below
npm run dev
```

Required environment variables are documented in `.env.example`, with inline notes on which ones are still pending the project owners' sign-off (see "Open items before any deploy" below). At minimum, local development needs:

- `ANTHROPIC_API_KEY` (or `GROQ_API_KEY` if `MODEL_PROVIDER=groq`)
- `GITHUB_READ_TOKEN` (optional locally — without it, GitHub's unauthenticated 60/hr rate limit applies)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_USER_EMAILS` and a Firebase project configured for `firebase-admin` (auth is currently a placeholder behind a swappable interface — see "Auth" below)

### Database

Apply `migrations/0001_init.sql` to your Supabase project via the SQL editor (no migration-tool dependency is used for this two-person project). This creates the four Phase-1 tables (`runs`, `issues`, `tool_calls`, `reports`) with Row Level Security enabled on all four, scoped per `SCHEMA.md`.

### Running the test suite

```bash
npm test              # all unit + integration + harness tests
npx vitest run tests/harness/t1.t2.test.ts tests/harness/t3.t4.test.ts tests/harness/t6.t8.test.ts tests/harness/t9.t10.test.ts   # the 8 formal acceptance tests (T1-T4, T6, T8-T10)
```

## Limits

These are the harness's actual enforced limits (`lib/server/config.ts`), not aspirational targets — a run stops or refuses a call once it hits one of these, rather than running unbounded:

| Limit | Value |
|---|---|
| Max searches per run | 3 |
| Max results per search | 10 |
| Max candidate issues read per run | 5 |
| Max comments read per issue | 20 |
| Per-request timeout | 20 seconds |
| Retries per request | 1 (network failures only, never on a 4xx) |
| Max model turns per run | 15 |
| Max run duration | 120 seconds |
| Max retries on invalid model output structure | 1 |
| Max issue size accepted | 20,000 characters (`ISSUE_MAX_CHARS`) |
| Max model output tokens | 4,000 (`MAX_OUTPUT_TOKENS`) |
| Max runs per user per hour | 10 (`RUNS_PER_USER_PER_HOUR`) |

A run that hits a limit before finishing always returns a partial report naming the limit and what was left unchecked — never a blank result.

## What this build does not do (by design, Phase 1)

- No write of any kind to GitHub — no labels added, no comments posted, no issues closed. The model is never given a write-capable tool, in any phase. A write-scoped GitHub token is not provisioned this cycle at all (Phase 2 only, gated on the practice-repository name being finalized) — `.env.example` has no entry for one, since there is nothing to template until that decision is made.
- No approval/action workflow (`actions`/`approvals` tables, `POST /api/actions/:id/decision`) — that's Phase 2, blocked on two still-open product decisions (D4: how an investigated issue enters the practice repository; D5: the practice repository's name).
- No evaluation endpoints (`POST /api/evals/run`, `GET /api/evals/:id`) — Phase 3.
- Triage of pull requests, or more than one issue per run.

## Auth

Firebase Authentication sits behind a two-function interface (`lib/server/auth.ts`: `verifySession`, `isAllowlisted`) — Firebase is the current placeholder provider, **pending the project owners' final sign-off**, not a settled decision. The two checks are always called separately, in that order: a valid, signed-in session alone is not enough to use the app — the identity's email must also be present in `ALLOWED_USER_EMAILS`. This app is intentionally not open to the public.

## Open items before any deploy beyond local dev

Five environment/constant values in `lib/server/config.ts` are tagged `CONFIRM BEFORE SHIPPING` and still need the project owners' explicit sign-off — grep for that tag before deploying anywhere beyond local development:

1. **Model provider** (Anthropic vs. Groq) — Anthropic is the primary, fully-tested path; Groq is a best-effort local/cost-free alternative and is **not required to pass the acceptance tests**.
2. **GitHub read-token scope** — confirm the fine-grained PAT is scoped exactly to the approved repository, read-only.
3. **Issue size cap, model output token cap, and per-user hourly run cap** — currently 20,000 characters / 4,000 tokens / 10 runs per hour as starting defaults.
4. **Auth provider and allowlist membership** — Firebase as a placeholder, final allowlist not yet confirmed by both owners.

### Retention/deletion stance for quoted third-party GitHub text — open escalation, not resolved

`reports.report` stores quoted third-party GitHub text (issue/comment excerpts) inside its evidence fields. **No retention or deletion stance has been decided for this data.** This is an explicitly open escalation — not something this README, or any part of this build, resolves by omission or by assumption. A deployment broader than the current closed allowlist (a handful of named maintainers) must not happen until the project owners decide a retention/deletion policy for this stored third-party text. Until then, this gap stays visible here rather than being silently treated as settled.

## Stack

Next.js (App Router, TypeScript) on Vercel, Supabase Postgres, Anthropic Claude (primary) / Groq (best-effort swap), Firebase Auth (placeholder), Vitest.
