# Backend repair status — October 10, 2026

Repairs are on `fix/backend-readiness` in the Desktop checkout. The original audit below is retained as the baseline, not a description of current behavior.

Implemented: owned run/report persistence via atomic RPCs; race-safe hourly admission; whole-run cancellation; explicit upstream errors; tool name/argument checks and attempted-read caps; HTTPS/safe integer/PR/repository validation; browser preflight; candidate comments, label pagination, verified citation URLs; Groq tool-history serialization; numeric bounds; verified/revocation-checked Firebase identities; broader secret ignores; run metrics and safe logs.

Firebase plus the pair-only allowlist is confirmed. Phase 1 is four read-only-triage tables. The seven-table PRD checklist includes later actions/approvals/evaluation phases, not additional Phase-1 work.

The migration passes an isolated PGlite (PostgreSQL WASM) check of SQL execution, sequential admission caps, atomic report/history persistence, four-table RLS, RPC grants, duplicate completion rejection and rollback. This does **not** verify concurrent multi-connection admission or a hosted Supabase installation. Those are covered by opt-in live tests which remain unexecuted without a dedicated test project.

To repeat the isolated SQL check without adding a project dependency:

```bash
npm install --prefix /tmp/issuescout-sql-check @electric-sql/pglite@0.5.8 --ignore-scripts
PGLITE_MODULE=/tmp/issuescout-sql-check/node_modules/@electric-sql/pglite/dist/index.js node audits/check-database.mjs
```

Verification after repairs: **155 ordinary tests passed, 14 readiness tests passed, 3 live database tests skipped**. TypeScript and ESLint passed. The webpack production build passed. The credential-pattern scan found no matching credentials in the reviewed source/test files, and `.env`, `.env.local`, and `.env.production` are ignored. This is not a full historical secret audit.

Still required before claiming the backend is complete: hosted test migration, live Firebase/model/database round trip, live RLS/concurrent admission tests, token scope confirmation and the remaining provider/limit/retention decisions. No frontend or GitHub write functionality was added.

---

# Backend readiness audit — October 10, 2026

## Decision

**Not ready for frontend integration sign-off.** The Phase 1 backend has substantial implementation, but passing the existing tests does not establish the documented persistence, failure-handling, timeout, and access guarantees. This audit changes no production code and adds no frontend functionality.

Reviewed baseline: `1cf58d0` on `main`. Local audit branch: `audit/backend-readiness`.

## Executed checks

| Check | Result |
| --- | --- |
| Install from committed npm lockfile | Passed, 553 packages; lifecycle scripts disabled |
| Existing Vitest suite | 139 passed; 2 skipped |
| Separate readiness suite | 1 control passed; 13 requirement checks failed |
| ESLint | Passed |
| TypeScript | Passed after `next typegen`; fresh-checkout `tsc --noEmit` initially failed on generated `LayoutProps` |
| Default Turbopack production build | Not verified: initial font network restriction, then local process/port permission error |
| Alternate production build, `next build --webpack` | Passed |
| Real Firebase/model/Supabase end-to-end run | Not executed: no local credentials configured |
| Real database RLS enforcement | Not verified; existing tests are empty placeholders |

The targeted suite uses controlled tool responses and mocks. It reproduces behavior in the actual client, harness, and routes without contacting real accounts. It does not establish live model quality, deployed security, or third-party availability.

## Reproduce

From the repository root with Node and npm available:

```bash
npm ci --ignore-scripts
npx next typegen
npm run type-check
npm run lint
npm test
npx vitest run --config audits/vitest.config.mts
npx next build --webpack
```

The separate audit command is expected to exit nonzero until the reported requirements are fixed. It is intentionally not included by the default Vitest filename pattern; it must remain a visible readiness gate, not be mistaken for passing coverage or waived failures. As repairs land, move the regression cases into the ordinary suite.

## Highest-priority findings

### 1. Run persistence and report history are not connected

`app/api/runs/route.ts:55` calls the harness without its optional `persistRun` callback. The route never creates a database run, and returns a new random ID at line 73 instead. Database accessors exist but no production caller wires their writes into the lifecycle. `app/api/runs/[id]/route.ts:47` always returns `report: null`.

Consequences: new reports cannot be reopened through their returned IDs, tool-call history is not saved, and per-user rate checks cannot count these new runs. Audit tests reproduce the missing run creation and null report response.

Repair: create the owned run, persist its outcome/report/tool history, return the stored ID, and load the owner's report through the history endpoint. Add a create-to-retrieve integration test and verify failure outcomes are saved. Enforce rate-limit admission against started runs, including concurrent requests.

### 2. Run deadline does not bound pending operations

`lib/server/harness/runHarness.ts:160` starts its timer after initial GitHub retrieval. The loop checks time only between model turns; the awaited model call has no harness deadline. The audit advances fake time beyond the configured run budget and the pending run does not settle. Format repair is also outside the main loop's turn/time checks.

Repair: one deadline covering the full run, cancellation/timeout propagation through model and GitHub calls, and no additional tools or repair calls after exhaustion. Test slow initial reads, stalled models, multi-tool turns, and repair at the turn boundary.

### 3. Failure handling violates the documented contract

`getComments` in `lib/server/github/client.ts:135` returns an empty successful result on an upstream error. Search JSON without `items` becomes `[]` at line 197. Initial network exceptions escape `runHarness`; API routes have no general error boundary. The existing T8 test explicitly expects an exception rather than the documented structured failure.

Consequences: missing evidence can look like no comments/no matches; failures may bypass the expected error response and persistence. Audit tests reproduce all three cases.

Repair: distinguish missing resources, outages, malformed responses, timeouts and rate limits; map exceptions to safe contract responses; preserve incomplete coverage and record terminal outcomes. Update T8 to assert the PRD's behavior instead of exception propagation.

### 4. Tool and repository boundaries need runtime validation

The harness does not check the model's tool name before execution. It casts unknown inputs rather than validating them, and the executor treats every non-read operation as search. Failed candidate reads do not consume the read budget. Tests reproduce execution of an unregistered tool and eight attempted reads despite a limit of five.

Search concatenates model text into a query with repository qualifiers and does not validate returned candidate repositories. A controlled response from another repository is accepted by the client. This demonstrates missing result validation; it is not a claim that a live GitHub query exploit was exercised.

Repair: validate tool name and discriminated arguments before I/O; count attempted calls; constrain search qualifiers and validate result URLs/repositories before feeding results to the model.

### 5. URL and issue-type validation is incomplete

The parser accepts HTTP, contrary to the HTTPS-only policy discussed with Ivaylo. It accepts integers beyond JavaScript's safe range. More seriously, `getIssue` does not reject the `pull_request` field, so an `/issues/...` URL resolving to a pull request proceeds as an issue. All three are reproduced.

Repair: enforce the URL policy and safe positive issue integers, then validate the returned resource type. HTTP acceptance is a policy mismatch, not evidence of an arbitrary-network-fetch vulnerability: the API host is constructed independently.

### 6. Browser CORS integration is unfinished

The routes advertise `OPTIONS` in response headers but export no preflight handler. The audit reproduces the missing handler; a deployed browser preflight was not exercised. Bearer-authenticated cross-origin requests need an actual allowed preflight response. Missing-Origin GET requests are always rejected, which also needs testing with the intended same-origin frontend flow.

Repair: explicit preflight handling for allowed origins/methods/headers, rejected origins without permissive headers, and a tested same-origin request policy. Do not replace authentication with Origin checks or introduce wildcard origins.

## Additional source-review findings

- **RLS tests can falsely pass:** `tests/integration/rls.test.ts:21` skips without credentials, but both bodies are empty even when credentials exist. Implement real ownership/access assertions before counting them as verified.
- **Secret-ignore coverage:** `.gitignore` ignores `.env` only; `.env.local` and `.env.production` are not ignored. Only `.env.example` is tracked in this checkout. This audit did not perform a comprehensive secret scan of all historical commits.
- **Authentication remains provisional:** Firebase is documented as awaiting Ivaylo's sign-off. Admin initialization relies on external Firebase credentials not explained fully in `.env.example`. Live identity verification and allowlisting have not been demonstrated here. Email verification/revocation policy also deserves explicit review for an email-based allowlist.
- **Evidence validation:** search result numbers count as retrieved issues; successful direct reads do not add their numbers to that set. Related-issue URLs are not checked alongside their numbers, and comment URLs are not added to the evidence URL set. This can accept insufficiently investigated recommendations or discard legitimate citations.
- **GitHub coverage:** labels retrieve only the default first page. The tool description promises issue comments for candidate reads, but the executor only fetches the issue itself. Complete these paths or explicitly represent their limitations.
- **Groq fallback:** its outgoing conversation conversion drops tool-use and tool-result blocks, so it cannot reliably continue the demonstrated research loop. It is documented as best-effort; do not present it as a verified substitute.
- **Logging:** the structured logger exists but is not called by the production harness/routes. Persisted counters and operational tracing still need wiring.
- **Configuration:** numeric limits are not validated for finite positive values; invalid configuration could undermine bounds. Existing `CONFIRM BEFORE SHIPPING` decisions remain open.
- **Scope documentation:** the PRD checklist mentions seven RLS tables while the current phase deliberately creates four. Clarify Phase 1 versus later-phase acceptance criteria; do not silently add write-back features during this audit.

## Repair and verification order

1. Wire persistence, report retrieval, terminal failure recording and rate-limit admission.
2. Enforce whole-run deadlines, tool validation, safe URL/resource validation and explicit upstream errors.
3. Finish browser CORS behavior and confirm the authentication configuration with both owners.
4. Correct evidence/coverage handling, secret-ignore coverage and truthful test/documentation claims.
5. Run both suites, type checks, lint and the production build again.
6. With configured test services, verify real sign-in, one public-issue/model/database run, stored report retrieval, cross-user rejection, real RLS denial and configured token scope. Keep secrets out of chat and commits.

Frontend implementation remains deferred. No deployment, GitHub issue write, cloud schema change, credential provisioning, or message to Jonathan was performed by this audit.
