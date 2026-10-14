# IssueScout frontend handoff

The frontend implements the current read-only backend. No API, database, harness, or shared contract files were changed.

## Screens

- `/`: compact landing with a primary Research an issue action.
- `/signin`: Firebase Google sign-in, followed by a server access check.
- `/workspace`: one issue URL submission; synchronous loading; exact API error messages.
- `/runs`: latest 20 owned runs; empty, loading, error, and status states.
- `/runs/[id]`: complete or partial report, or clear failed/in-progress state.
- `/not-authorized`: signed-in but access denied (does not claim to know the cause of token verification failure).
- `/guide`: concise three-step instructions.
- `/demo`, `/demo/report`, `/demo/history`: explicitly fictional walkthrough, no API calls or persistence.

## Connect live mode

1. Copy missing values into your ignored local environment file; do not overwrite an existing file.
2. Add the four NEXT_PUBLIC_FIREBASE values from the **same** Firebase project used by the backend's Admin credentials. These are web configuration; never use Admin/service-account secrets here.
3. Enable Google as a sign-in method and authorize the development/deployment domain in Firebase. The frontend uses the official Firebase SDK Google popup flow.
4. Provide existing backend configuration from `.env.example`. Public signup is enabled; no email allowlist is used. Configure the app's exact origin in CORS_ALLOWED_ORIGINS as required by the existing backend.
5. Keep NEXT_PUBLIC_APPROVED_REPO in sync with APPROVED_REPO. The public variable is explanatory only; the backend enforces access.
6. Restart the dev server after changing public configuration.

Every API request uses the shared wrapper's Firebase ID token and a relative `/api/...` URL. The client never implements an allowlist or receives server credentials. There is no polling, approval UI, or repository write path: those are not supported by the current backend.

## Two-day finish

Day 1: connect Firebase and backend configuration, sign in as a newly registered Google account, run one real approved-repository issue, reopen its saved report, confirm history ownership. Test signed-out and unauthorized accounts separately.

Day 2: verify partial/failed/malformed URL states, mobile and keyboard navigation, and the live evaluation rubric. Deploy a restricted preview and rehearse the exact user journey. Do not call the live flow complete until these checks pass.

## Not yet verified

Real Google signup and sign-in, GitHub/model research, and saved live history require real project configuration. Sample walkthroughs and mocked tests are not evidence of live quality.

Broader rollout still requires the pair's retention/deletion decision. Current scope remains private and read-only.

## Verification from this build

- Production build and TypeScript checks pass; targeted frontend ESLint passes.
- 12 tests pass across the authenticated frontend wrapper and existing API route tests.
- Browser checked: sample workspace, complete/partial toggle, sample history, unconfigured sign-in, and mobile menu.
- Production dependency audit reports zero vulnerabilities after using the official Firebase app/auth modules instead of the full bundle. The full install still reports five high-severity development dependency advisories; review those before sharing a dev server externally.
- Replaced unused remotely fetched fonts with the existing system font stack so builds do not need Google Fonts access.
