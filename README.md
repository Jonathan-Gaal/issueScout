# IssueScout

IssueScout is a read-only AI research assistant for **software maintainers and engineering teams in the software industry**. A signed-in, allowlisted user submits a GitHub issue URL from any public repository, and the app returns a report explaining the reported problem, suggested labels and priority, potentially related issues, missing information, and a recommended next step. This build is **Phase 1 only**: read-only against GitHub, no writes of any kind. `proposedActions` is always `[]`, enforced by the harness regardless of what the model produces.

It helps the person responsible for an issue tracker decide what to investigate next. The report distinguishes reporter and commenter claims from what IssueScout actually checked. It does not fix bugs or change anything on GitHub.

## What the agent does

1. A user signs in with a verified Firebase account and submits one issue URL.
2. The backend reads the issue, comments, and repository labels through the GitHub REST API.
3. A bounded agent loop can search the same repository and read candidate issues.
4. The harness validates the model's report, limits tool use, and supplies research-coverage information.
5. The website presents findings, evidence, uncertainty, and a next step. Its API persists runs and reports for owner-scoped history.

All model-derived and GitHub-derived text is rendered as escaped plain text. Labels are suggestions drawn from the repository's existing list. Unsupported effort labels such as “Quick Wins” are withheld because the current tools cannot establish implementation effort. Proposed write actions are always empty.

The public `/demo/report` page displays a **saved real GitHub + Anthropic run** for issue #30264, revalidated with the effort-label guard. Opening it makes no new AI request and does not save a run to your history. Its calendar illustration depicts reported behavior; it is not a screenshot or proof that IssueScout reproduced the bug. Other prepared demo content is not evidence of a live run.

## How to run locally

### 1. Clone and install

Use Node.js 22 LTS and npm, Git, a model-provider account, and access to the team's Firebase and Supabase setup.

```bash
git clone https://github.com/Jonathan-Gaal/issueScout.git
cd issueScout
npm ci
cp .env.example .env.local
```

If `.env.local` already exists, edit it instead of copying over it. Replace placeholder values; do not leave placeholder tokens configured. Never commit `.env.local` or a service-account JSON file.

### 2. Configure the environment

Use `.env.example` as the variable reference. The primary tested model path is Anthropic.

| Variable | What to provide |
| --- | --- |
| `MODEL_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY` | Your privately supplied model API key |
| `ANTHROPIC_MODEL` | A model available to your account; the current configured default is `claude-sonnet-4-5` |
| `GITHUB_READ_TOKEN` | Your own fine-grained PAT scoped to "Public Repositories (read-only)" — no write permissions, never scoped to private repos |
| `SUPABASE_URL` | URL of the team's configured database project |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-only service-role key, supplied securely by the project owner |
| `AUTH_PROVIDER` | `firebase` |
| `ALLOWED_USER_EMAILS` | Comma-separated allowlist of signed-in emails permitted to call the API; see "Set up Firebase" below |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public Firebase web-app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web-app auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID; team project: `issuescout-c2238` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web-app ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to approved server credentials, described below |
| `CORS_ALLOWED_ORIGINS` | Exact browser origins, including scheme and port; example: `http://localhost:3000` |

If using `http://127.0.0.1:3015`, include that exact origin in `CORS_ALLOWED_ORIGINS`. Multiple origins are comma-separated; do not use a wildcard. Frontend API calls remain same-origin relative paths such as `/api/runs`.

The GitHub client can read public data without a token, but is then subject to GitHub's unauthenticated limits. Remove an unused token variable rather than sending the template's placeholder. The repository to query is resolved once per run from the submitted issue URL itself — there is no separately configured "approved repo"; every subsequent GitHub call for that run is bound to that same repository and rejects any response that doesn't match it.

Groq is an alternative through `MODEL_PROVIDER=groq`, `GROQ_API_KEY`, and `GROQ_MODEL`. It is not the path used for the recorded Anthropic report. Model availability and provider limits must be checked before deployment.

### 3. Set up Firebase browser and server authentication

Access is allowlist-gated: Firebase sign-in (Google or email/password) establishes identity, but the backend separately checks the signed-in email against `ALLOWED_USER_EMAILS` before serving any API request — these are two distinct, independently enforced checks, not one combined guard. Creating a Firebase account does **not** by itself grant API access. Enable Google and Email/Password providers in the same Firebase project if offering both login options. Authorize the development hostname in Firebase Authentication. Email/password users must verify their email before accessing research.

The public `NEXT_PUBLIC_FIREBASE_*` values configure browser sign-in. They are **not Firebase Admin credentials**.

The server uses `firebase-admin` with Application Default Credentials and calls `verifyIdToken(token, true)`. The `true` enables revocation checking, requiring authenticated access to read Firebase Authentication user records.

For local development, obtain an approved service-account JSON for the same Firebase project, with permission to read Authentication users. Keep it outside the repository and set:

```ini
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/repo/firebase-service-account.json
```

Never prefix this variable or private keys with `NEXT_PUBLIC_`. Do not paste the JSON into chat, a PR, or the README. Exchange it through an approved secure channel.

`firebase login` and `gcloud auth login` authenticate their respective command-line tools; they do not configure this backend's credentials. User-based Application Default Credentials have additional Firebase Authentication requirements and should not be assumed interchangeable with the service-account setup. See [Firebase Admin setup](https://firebase.google.com/docs/admin/setup).

If Google account selection succeeds but the app rejects access, check Admin credentials, project consistency, email verification, the exact allowed origin, and whether the signed-in email is actually present in `ALLOWED_USER_EMAILS`. Do not disable token verification, revocation checks, or the allowlist check to make login appear to work.

### 4. Prepare the database

Ask the project owner whether migrations are already applied. For a new dedicated test database, apply these SQL files in order:

1. `migrations/0001_init.sql`
2. `supabase/migrations/20261010190601_backend_readiness.sql`

Do not rerun initial table creation on an existing database. These define the Phase 1 tables (`runs`, `issues`, `tool_calls`, `reports`) and the admission/persistence functions. RLS is enabled, but the service-role key bypasses RLS, so server-side ownership checks remain essential. The key must never reach the browser.

### 5. Start and verify

```bash
npm run dev
```

Open the URL printed in the terminal and ensure its origin matches `CORS_ALLOWED_ORIGINS`. For port 3015, use `npm run dev -- --port 3015`. Restart the server after changing credentials.

Test the full journey:

1. Sign in with a verified, allowlisted account.
2. Submit a real public issue URL, e.g. `https://github.com/calcom/cal.diy/issues/30264` (any public repo works — it is not limited to this one).
3. Wait for a newly generated report and inspect its evidence and limitations.
4. Open history and reopen that saved report.
5. Sign out; verify protected routes require sign-in again.
6. With a separate test account, confirm the first account's report is inaccessible.
7. With a signed-in account that is **not** on the allowlist, confirm the API rejects the request (`401`) even though sign-in itself succeeded.

A successful saved-preview page alone does not verify this journey. New research makes model API calls and may incur provider charges.

## Tests and verification status

```bash
npm test
npm run type-check
npm run lint
```

`npm test` includes the ordinary tests and readiness audits. `npm run type-check` generates Next.js route types before TypeScript checking.

As of **October 15, 2026**, after the allowlist restore, RLS hardening, and any-public-repo broadening, the suite passed 171 ordinary tests and 14 audit tests, with three tests skipped. TypeScript passed clean. These are recorded results, not a guarantee of future runs.

- **Live research:** successful direct-harness runs used real GitHub data and Anthropic for #30264, and separately against a second, different public repository to confirm the repo is not hardcoded. Attribution was tightened after an overclaim was observed. The final effort-label guard was tested and replayed against saved output without another model call.
- **Access boundary:** a signed-in but non-allowlisted account is rejected with zero GitHub and model calls in the checked harness path; a request for an issue URL that doesn't match the repository bound to the run is also rejected before any model call.
- **Injection fixture:** three of three runs of one attack fixture, with mocked GitHub and a live model, executed no off-task calls. This is not a general resistance rate. The fixture was not rerun after the attribution changes.
- **Local website end to end:** unverified at this checkpoint. Ivaylo's local Firebase Admin credentials are missing; sign-in, report persistence, and history have not been verified together. This describes that local setup, not the state of every deployment.
- **Model quality:** automated test passes are not aggregate correctness or reliability scores. Untested evaluation dimensions remain unscored.

Live database tests are opt-in and create/delete synthetic rows in a **dedicated test project**. Set `RUN_LIVE_DB_TESTS=1`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, and `TEST_SUPABASE_SERVICE_ROLE_KEY`, then run:

```bash
npx vitest run tests/integration/rls.test.ts
```

Never point these tests at production. Without opt-in they are skipped. Local raw evaluation traces are excluded from Git via `traces/`.

## Bounded research and limitations

| Limit | Current value |
| --- | --- |
| Searches per run | 3 |
| Results per search | 10 |
| Candidate reads per run | 5 |
| Comments per issue | 20 |
| GitHub request timeout | 20 seconds |
| GitHub request retries | 1 for network failures, not 4xx responses |
| Model turns per run | 15 |
| Whole-run duration | 120 seconds |
| Format-repair attempts | 1, within the model-turn budget |
| Issue size | 20,000 characters by default |
| Model output | 4,000 tokens by default |
| Runs per user per hour | 10 by default |

See `lib/server/config.ts` for authoritative limits and configurable caps. Anthropic uses the run timeout and the harness's cancellation signal, with no SDK retries. Failed candidate reads consume budget; label pagination is bounded at 1,000 labels. A time-limited run after the initial issue has been retrieved can return a partial report; failure to retrieve the initial issue yields a structured failure.

“Completed” means the bounded run finished, not that every relevant issue was found. The recorded report's candidate-read counter includes a repeated read of the original issue, not a distinct related issue. Reading a reporter's test claim does not mean IssueScout ran that test. A mentioned PR is not proof of a verified fix or merge status.

## Explicitly out of scope

- Fixing bugs, writing code, running tests, or reproducing reported behavior.
- Posting comments, applying labels, assigning people, closing issues, or any other GitHub writes.
- Inspecting pull-request code, verifying a proposed fix, or triaging PRs.
- Researching private repositories or trackers other than public GitHub issues.
- Automatic new-issue monitoring, bulk triage, or ongoing reporter conversations.
- Creating new repository labels or guaranteeing exhaustive duplicate detection.
- An approval/write-back workflow or evaluation API endpoints in this build.

These boundaries keep the product focused on helping a maintainer understand one issue and decide what to check next. Read-only tools limit potential harm; explicit evidence limits prevent suggestions from being presented as verified facts. Humans take any subsequent action on GitHub themselves.

## Data handling and remaining release decisions

Reports can contain quoted third-party issue/comment text. **The retention and deletion policy remains unresolved.** Agree and document it before widening deployment beyond the current closed allowlist — this is now more material, not less, since the app can research any public repository rather than one. Review provider data terms and deployment credentials as well.

Before claiming the website is fully working, complete the authenticated journey above, database ownership checks, and configuration review. Confirm token permissions, model availability, usage caps, and retention decisions. No additional features are required to perform those checks.

## Stack and project guides

Next.js App Router and TypeScript; Firebase Authentication and Admin SDK; Supabase Postgres; GitHub REST API; Anthropic (primary) or Groq; Vitest. Hosting is intended for Vercel.

## Security hardening — October 15, 2026

Ivaylo's October 14, 2026 decision to open signup/login to everyone had silently reverted a previously-closed requirement (PRD §9 finding #1, TRD §5's two-check auth gate), caught by this session's red-alert security audit (FAIL, critical). `/signup` and `/signin` still work via Firebase (Google or email/password); creating an account no longer implies API access — the backend separately re-enforces `ALLOWED_USER_EMAILS` on top of a verified session. The same change broadened the app from one hardcoded repository (`calcom/cal.diy`) to any public GitHub repository, and added `WITH CHECK` to the `runs_update_own` RLS policy as defense-in-depth. See `log.md` for the full decision record.

See `APPFLOW.md`, `DESIGN-BRIEF.md`, `USER-STORIES.md`, `SCHEMA.md`, and `.env.example` for flows, interface requirements, data structure, and configuration. The shared API contract lives in `lib/contract.ts`.
