# IssueScout

IssueScout prepares a first-pass triage report for one GitHub issue so a maintainer can review it: a signed-in, allowlisted user submits an issue URL, the backend fetches the issue and its comments, an LLM (run inside a bounded tool-calling harness) searches the same repository for related issues, and the app returns a report — summary, category, provisional priority, suggested labels, evidence, missing information, related issues, a recommended next step, and limitations. This build is **Phase 1 only**: read-only against GitHub, no writes of any kind. `proposedActions` is always `[]`, enforced by the harness regardless of what the model produces.

## Running locally

```bash
npm ci
cp .env.example .env   # fill in real values — see below
npm run dev
```

Required environment variables are documented in `.env.example`, with inline notes on which ones are still pending the project owners' sign-off (see "Open items before any deploy" below). At minimum, local development needs:

- `ANTHROPIC_API_KEY` (or `GROQ_API_KEY` if `MODEL_PROVIDER=groq`)
- `GITHUB_READ_TOKEN` (optional locally — without it, GitHub's unauthenticated 60/hr rate limit applies)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_USER_EMAILS` and a Firebase project configured for `firebase-admin` (Firebase confirmed; see "Auth" below)

### Database

Apply `migrations/0001_init.sql`, then `supabase/migrations/20261010190601_backend_readiness.sql` to a dedicated Supabase test project before deployment. Existing databases that already have the initial migration need only the second file. Do not re-run the initial table creation. This creates the four Phase-1 tables (`runs`, `issues`, `tool_calls`, `reports`) with Row Level Security enabled on all four, scoped per `SCHEMA.md`.

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

A run that reaches its time budget after retrieving the issue returns a partial report. If the initial issue cannot be retrieved, it returns a structured failure. Failed candidate reads consume the read budget; format repair consumes the model-turn budget. Labels are paginated to a bounded maximum of 1,000; exceeding it fails visibly.

## What this build does not do (by design, Phase 1)

- No write of any kind to GitHub — no labels added, no comments posted, no issues closed. The model is never given a write-capable tool, in any phase. A write-scoped GitHub token is not provisioned this cycle at all (Phase 2 only, gated on the practice-repository name being finalized) — `.env.example` has no entry for one, since there is nothing to template until that decision is made.
- No approval/action workflow (`actions`/`approvals` tables, `POST /api/actions/:id/decision`) — that's Phase 2, blocked on two still-open product decisions (D4: how an investigated issue enters the practice repository; D5: the practice repository's name).
- No evaluation endpoints (`POST /api/evals/run`, `GET /api/evals/:id`) — Phase 3.
- Triage of pull requests, or more than one issue per run.

## Auth

Firebase Authentication sits behind a two-function interface (`lib/server/auth.ts`: `verifySession`, `isAllowlisted`) — Firebase was confirmed by Ivaylo on October 10, 2026. The two checks are always called separately, in that order: A verified email and an unrevoked token are required; a valid, signed-in session alone is not enough to use the app — the identity's email must also be present in `ALLOWED_USER_EMAILS`. This app is intentionally not open to the public.

## Open items before any deploy beyond local dev

Remaining environment/constant values in `lib/server/config.ts` are tagged `CONFIRM BEFORE SHIPPING` and still need the project owners' explicit sign-off — grep for that tag before deploying anywhere beyond local development:

1. **Model provider** (Anthropic vs. Groq) — Anthropic is the primary, fully-tested path; Groq is a best-effort local/cost-free alternative and is **not required to pass the acceptance tests**.
2. **GitHub read-token scope** — confirm the fine-grained PAT is scoped exactly to the approved repository, read-only.
3. **Issue size cap, model output token cap, and per-user hourly run cap** — currently 20,000 characters / 4,000 tokens / 10 runs per hour as starting defaults.
4. **Allowlist configuration** — limit it to Ivaylo and Jonathan’s verified Firebase emails. Firebase itself is confirmed.

### Retention/deletion stance for quoted third-party GitHub text — open escalation, not resolved

`reports.report` stores quoted third-party GitHub text (issue/comment excerpts) inside its evidence fields. **No retention or deletion stance has been decided for this data.** This is an explicitly open escalation — not something this README, or any part of this build, resolves by omission or by assumption. A deployment broader than the current closed allowlist (a handful of named maintainers) must not happen until the project owners decide a retention/deletion policy for this stored third-party text. Until then, this gap stays visible here rather than being silently treated as settled.

## Stack

Next.js (App Router, TypeScript) on Vercel, Supabase Postgres, Anthropic Claude (primary) / Groq (best-effort swap), Firebase Auth, Vitest.

## Backend repair verification (October 10, 2026)

The API reserves a database run before investigation, atomically saves its report/tool history/outcome, and returns that stored ID. The history endpoint loads only the requesting owner's report. `admit_run` serializes per-user hourly admission; both RPCs are service-role-only and use invoker security. The backend must keep checking ownership because its service key bypasses RLS.

Firebase Admin uses Application Default Credentials. For local work, set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file **outside the repository** for your Firebase project. Never send this file to the browser. Use verified Firebase accounts and set `ALLOWED_USER_EMAILS` to the pair's actual login addresses. Add the local or deployed app origin to `CORS_ALLOWED_ORIGINS`. Cross-origin clients must send the bearer token; preflight requires no token. Same-origin browser GET requests may omit Origin when Sec-Fetch-Site is same-origin; authentication still applies.

`npm test` runs both the ordinary tests and the readiness regressions. `npm run type-check` generates Next.js route types first. All GitHub operations remain read-only. Mocked test passes are not a measurement of model quality or proof of production configuration.

Live database tests are opt-in and create/delete synthetic users and rows in a **dedicated test project**. Supply `RUN_LIVE_DB_TESTS=1`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, and `TEST_SUPABASE_SERVICE_ROLE_KEY` in your shell, then run `npx vitest run tests/integration/rls.test.ts`. Do not point this at a production project. Without opt-in these tests are reported as skipped; with incomplete configuration they fail.

Before frontend sign-off: apply both migrations to the test database, run the live tests, then verify real Firebase sign-in, one model-backed triage, saved-report retrieval, and rejection under the other user's session. Confirm read-token scope, provider/limits, and retention decisions. No migration has been applied to a cloud database by this repair.
