# PRD — IssueScout

**Author:** Starscream (PRD Writer)
**Date:** 2026-10-08
**Status:** Draft
**One-line summary:** A signed-in, allowlisted maintainer submits a GitHub issue URL and receives an LLM-generated first-pass triage report (summary, category, priority, suggested labels, related issues) for human review — read-only against GitHub in this phase.

> This PRD folds in, by section-citation, the human-authored `ISSUESCOUT-BUILD-SPEC.md` (Ivaylo Nanev and Jonathan Gaal, 2026-10-07) — referred to below as "the Build Spec." The Build Spec is the authoritative technical contract (report shape, endpoints, data model, system prompt, acceptance tests); this PRD does not re-derive a different product shape. Where this PRD states a requirement already in the Build Spec, it cites the Build Spec section rather than restating the full detail.
>
> Full-tier project per Starscream's Step 0 / `.claude/skills/project-scope-triage/SKILL.md` — confirmed by the human after a borderline call (auth + shared deployment present; no money; allowlist capped at ~2-3 known users). All 12 sections below are filled with real content; no "TBD."

---

## 1. Overview

**Mission.** Give a maintainer of a real open-source repository a fast, evidence-grounded first pass on an incoming GitHub issue — summary, classification, provisional priority, candidate duplicates, and what's missing — so the maintainer's own triage time goes to judgment and action, not re-reading and re-searching.

**Problem.** Triaging a new issue by hand means: reading the issue and its comment thread, guessing at severity, manually searching the repo for whether this has come up before, and checking which labels apply — repeated per issue, with no memory carried from one triage to the next. For a maintainer handling issues alone or in a small team, this is repetitive judgment work that an LLM with read-only GitHub access and a bounded tool loop can accelerate without taking the actual decision away from the human (Build Spec §1, §3).

**Market positioning.** This is not a GitHub App, a bot, or an automation product — it explicitly does not act on GitHub (Phase 1) and, even where it eventually can (Phase 2), only after an explicit per-action human approval (Build Spec §3, §8.2). It sits closer to "a researched first draft" than "an autonomous agent." The comparison point is the status quo (a maintainer doing this by hand) and generic chat-with-an-LLM copy/paste workflows, which lack the bounded, auditable tool harness (search/read limits, coverage reporting, validation against the repo's real label list) this system builds in. This is a two-person bootcamp/portfolio build, not a commercial product; its "market" is a 2-3 person allowlist and the repo `calcom/cal.diy` used for real-world grounding.

---

## 2. Users & Personas

| Persona | Description | Primary goal | Why they use this |
|---------|-------------|--------------|-------------------|
| Maintainer (allowlisted operator) | One of the ~2-3 people on the Firebase email allowlist (initially Jonathan and Ivaylo, acting as stand-in maintainers of `calcom/cal.diy` for this exercise) | Submit an issue URL, get a trustworthy first-pass triage report, decide what to do with it | Saves the manual work of reading, classifying, and searching for duplicates; report format mirrors what a maintainer already does by hand |
| Approver (Phase 2 only) | Same allowlisted individuals, acting in an approval capacity | Review a proposed label or comment action with full visible content before it's written anywhere | The system must not write to GitHub without an explicit, recorded human decision (Build Spec §3, §8.1 step 10) |

**Primary persona:** Maintainer (allowlisted operator) — the Phase 1 build exists entirely to serve this persona's read-only triage need; the Approver persona is the same individuals wearing a second hat once Phase 2 unlocks.

---

## 3. Scope & Constraints

**In scope**
- Phase 1 (this build): signed-in + allowlisted user submits one GitHub issue URL from `APPROVED_REPO` (`calcom/cal.diy`); backend fetches issue, comments, and label list; a tool-calling LLM loop (one agent, one tool, two read-only operations: `read` and `search`) researches related issues within the same repo; system returns a structured `Report` (Build Spec §5) rendered as plain escaped text in the frontend; run history is listed and individually retrievable.
- Phase 2 (scoped now, built later, blocked on D4/D5): proposed label/comment actions attached to a report, each requiring an explicit per-action approve/reject decision recorded with who and when, written only to `PRACTICE_REPO`.
- Phase 3 (scoped now, built later): an eval harness running labeled fixture cases against the pipeline and reporting pass/fail.

**Out of scope** (Build Spec §3, verbatim scope boundary — not optional)
- More than one agent, agent handoffs, or multi-agent orchestration.
- Any second tool or data source for the model (no web browsing, no non-GitHub APIs).
- Any GitHub write without a recorded approval for that exact action, or any write to a repo other than `PRACTICE_REPO`.
- Closing issues, assigning people, creating new labels, triaging pull requests, triaging more than one issue per run, bulk-approving multiple actions in one click, webhook/GitHub-App-triggered automatic triage, cross-run memory/state, code fixes, code review, or replies in ongoing issue threads.

**Technical limits**
- Stack: TypeScript backend API on Vercel (Express vs. Next.js API-only — D1, open), React frontend on Vercel calling only the backend (never GitHub or the model directly) — Build Spec §4.
- Database: Supabase Postgres, service-role key on the backend only.
- GitHub access: read-only fine-grained PAT, resolved this session (D3 — see §7 and §11 below); 60 req/hr unauthenticated ceiling does not apply.
- Model: Anthropic Claude via a school-provided key, swappable to Groq for local testing — resolved this session (D2).
- All secrets live in backend environment variables only; MUST NOT appear in code, commits, prompts, model context, logs, the README, or anything sent to the browser (Build Spec §4).
- Harness-enforced limits (not prompt-enforced): `MAX_SEARCHES=3`, `MAX_SEARCH_RESULTS=10`, `MAX_CANDIDATE_READS=5`, `MAX_COMMENTS_PER_ISSUE=20`, `REQUEST_TIMEOUT_SECONDS=20`, `MAX_RETRIES_PER_REQUEST=1`, `MAX_MODEL_TURNS=15` (starting value), `MAX_RUN_SECONDS=120` (starting value), `MAX_FORMAT_RETRIES=1` (Build Spec §7).
- `ISSUE_MAX_CHARS=20000`, `MAX_OUTPUT_TOKENS=4000`, `RUNS_PER_USER_PER_HOUR=10` — resolved this session (D6, D7, D8).

**Timeline constraint**
- No hard external deadline stated; build order is fixed by the Build Spec (§12): Phase 1 read-only build and its tests (T1-T4, T6, T8-T10) first, Phase 2 write-back second (blocked on D4/D5, tests T5/T7), Phase 3 eval harness third. Bootcamp/portfolio pacing — owners set working pace, not a client deadline.

---

## 4. Success Metrics

The Build Spec (§11) already defines the project's acceptance-test and metric targets; this section adopts them as the PRD's success metrics rather than inventing parallel ones.

| Metric | Definition | Target | How measured |
|--------|------------|--------|---------------|
| Category accuracy | Model's `category` matches a hand-labeled answer key | ≥ 17 of 20 | Hand-labeled fixture set, owner-graded |
| Duplicate-flag precision | `relatedIssues` assessments (`possible_duplicate`/`related`/`unlikely_match`) agree with human judgment | ≥ 90% across ≥ 10 judgments | Owner review of reports against real/fixture issues |
| Evidence grounding | Material factual claims in a report are supported by retrieved evidence (not invented) | 100% across 10 reports | Manual audit: every claim traced to a `sourceUrl` |
| Run completion rate | Runs end with a complete report and no unhandled tool error | ≥ 19 of 20 | Run outcomes from the `runs` table (`status`, `stop_reason`) |
| Failure transparency | Simulated API failures (timeout, malformed response, rate limit) are stated clearly, never silently converted to "no matches" | 5 of 5 | Forced-failure test runs (T3, T8) |
| Injection/out-of-scope resistance | Embedded instructions or out-of-scope requests (code fixes, acting outside the approved repo, skipping approval) are refused or ignored | 10 of 10 | T3, T4 and adversarial fixture runs |
| Write safety | Writes without approval, or writes outside `PRACTICE_REPO` | 0 | T5, T7; code-level audit of the write path |
| Usability without help | Peers can triage one issue end-to-end with no assistance | 3 of 3 | Informal peer test during Phase 1 close-out |

**North-star metric:** Run completion rate with correct category classification (≥ 19 of 20 runs complete; ≥ 17 of 20 categories correct) — this is the single measure that tells the owners the harness is doing its one job (bounded, reliable triage) rather than any secondary concern (UI polish, eval tooling).

---

## 5. User Flows

**Flow: Submit and review a triage report (Phase 1, primary persona)**
1. Maintainer signs in via Firebase Auth. Backend checks (a) the Firebase session is valid and (b) the signed-in email is on the allowlist — two distinct, separately enforced checks (see §9, Non-Functional Requirements, Security — this is a Red-Alert-flagged hard requirement, not implicit in "signed in").
2. Maintainer pastes a GitHub issue URL from `calcom/cal.diy` into the submission form and submits.
3. Backend validates the URL is an issue (not a PR) in `APPROVED_REPO`, checks the user's run rate against `RUNS_PER_USER_PER_HOUR=10`, and fetches the issue, its comments, and the repo's label list (Build Spec §8.1 steps 1-2).
4. The harness runs the bounded LLM loop: the model reads the issue/comments, optionally searches the repo (≤3 searches, ≤5 candidate reads), and returns a structured report (Build Spec §8.1 steps 3-6).
5. The harness validates the report's structure and content (dropping any invented label, unretrieved related-issue number, or fabricated URL into `coverage.removedByValidation`), fills `coverage` from its own counters, and persists the run, its tool calls, and the report (Build Spec §8.1 steps 6-9).
6. Maintainer sees the report rendered as plain escaped text (never HTML/Markdown executed) → **outcome:** maintainer has a grounded first-pass triage report with explicit evidence links, missing-information prompts, and candidate duplicates, and decides their own next step.

**Flow: Review run history**
1. Maintainer opens the run list (`GET /api/runs?limit=`), newest first.
2. Maintainer opens one run (`GET /api/runs/:id`) to see its report and actions.
3. Backend enforces that the requesting user owns that specific run before returning it — a separate, explicit per-resource ownership check, not inferred from "signed-in, allowed user" (see §9; Red-Alert finding, non-negotiable) → **outcome:** maintainer can only ever retrieve their own runs, never another allowlisted user's by guessing an ID.

**Edge / alternate flows**
- **Invalid or out-of-repo URL:** harness returns `invalid_url` or `repo_not_allowed` before any model call (T10).
- **Pull request submitted:** harness returns `is_pull_request`, no model call made (T10).
- **Issue too long:** harness returns `issue_too_long` against `ISSUE_MAX_CHARS=20000`, no model call made (T10).
- **Run exceeds turn/time limit:** harness stops the run, returns a partial report naming the limit and what was unchecked; nothing is written to GitHub (T6).
- **GitHub or model failure (timeout, malformed response, invalid output twice):** harness returns the matching error code and a plain message, never a raw error or stack trace (T8).
- **Embedded instructions in issue text:** model flags `containsEmbeddedInstructions=true` and ignores the instructions; the defense is architectural (model has no write capability), not prompt-only (Build Spec §8.2, T3).
- **Phase 2 — approve/reject an action:** maintainer (as approver) sees the exact label names or full comment text and the target issue before deciding; approval is enforced in backend code, never in the prompt or frontend; one approval covers exactly one action (Build Spec §8.1 step 10, §8.2, T5/T7).

---

## 6. Feature Breakdown

| Feature | User goal served | Priority | Notes |
|---------|------------------|----------|-------|
| Firebase sign-in + email allowlist (two distinct checks) | Keep the app off the public internet; only named maintainers can use it | P0 | Red-Alert finding #1 — "signed in" and "on the allowlist" must be two separately enforced checks, not conflated. D9 placeholder pending final confirmation with Ivaylo. |
| Issue URL submission → triage run | Maintainer gets a first-pass triage report without manual research | P0 | Build Spec §1, §8.1 |
| Bounded GitHub research tool (`read`, `search`) | Grounded, auditable evidence instead of model guesswork | P0 | Build Spec §7; no write operation ever given to the model, in any phase |
| Structured `Report` with coverage metadata | Maintainer can trust what was and wasn't checked | P0 | Build Spec §5, §8.1 step 8 |
| Run history list + per-run retrieval, ownership-enforced | Maintainer can revisit past triage without re-running | P0 | Build Spec §6; Red-Alert finding #2 — explicit per-resource ownership check on `GET /api/runs/:id` |
| Content/structure validation on model output | Invented labels, unretrieved issues, or fabricated URLs never reach the user silently | P0 | Build Spec §8.1 step 7 |
| Rate limiting per user | Prevent runaway usage/cost on a shared key | P1 | D8 = 10 runs/user/hour, resolved this session |
| CORS allowlist enforcement | Only the approved frontend origin can call the backend | P1 | Red-Alert finding #5 — strict non-wildcard `CORS_ALLOWED_ORIGINS`, enforced server-side on every request |
| RLS policies on Supabase tables | Defense-in-depth beyond the service-role key | P1 | Red-Alert finding #4 — required even though the backend bypasses RLS via service-role key; protects any future non-service-key caller |
| Stored report-excerpt retention/deletion stance | Third-party GitHub comment/issue text is quoted in `reports`; needs a stated stance before public-facing use | P1 | Red-Alert finding #6; see §9 Security and §11 Risks |
| Phase 2: proposed actions + approval workflow | Lets an approved maintainer eventually action a finding, safely | P1 (Phase 2) | Build Spec §3, §8.1 step 10; blocked on D4/D5 |
| Phase 2: `GITHUB_WRITE_TOKEN` provisioning | Enables the write path, scoped only to `PRACTICE_REPO` | P1 (Phase 2) | Red-Alert finding #3 — must not be provisioned until D5 (`PRACTICE_REPO`) is finalized, and its actual GitHub-side scope must be hand-verified against documentation, not assumed |
| Phase 3: eval harness + results view | Lets owners measure the metrics in §4 systematically | P2 (Phase 3) | Build Spec §6 (`/api/evals/*`), §9 (`eval_results` table) |

---

## 7. Technical Decisions & Tradeoffs

| Decision | Choice | Why | Tradeoff accepted |
|----------|--------|-----|--------------------|
| Stack | TypeScript backend on Vercel; D1 (Express vs. Next.js API-only) still open | Both options keep frontend/backend on one platform (Vercel) with a shared language | Final framework pick deferred to whoever starts backend scaffolding; not a product-shape decision, so not escalated here |
| Model provider | Anthropic Claude via a school-provided API key; swappable to Groq for local/cheap testing (D2, resolved this session) | School-provided key avoids a personal billing surface during a bootcamp build; Groq swap keeps local iteration cheap and fast | Swapping providers risks subtly different tool-calling/JSON-mode behavior; harness must validate structure regardless of provider (Build Spec §8.1 step 6) rather than trust either provider's output format |
| GitHub access | Read-only fine-grained PAT, already created (D3, resolved this session) | Removes the 60 req/hr unauthenticated ceiling; fine-grained scope limits blast radius versus a classic PAT | A real credential now exists and must be handled per the Security section below (env-var only, never logged) |
| Auth | Firebase Auth + email allowlist, two distinct checks (D9; placeholder, pending final confirmation with Ivaylo) | Firebase is a fast, well-documented way to get real sign-in without building custom auth; allowlist satisfies the fixed "MUST NOT be open to the public" constraint cheaply | Conflating "signed in" with "allowed" is the specific failure mode Red-Alert flagged — the two checks must be visibly separate in code, not collapsed into one guard |
| Database | Supabase Postgres, service-role key on the backend | Matches the team's existing Postgres comfort; service-role key simplifies backend-only access | Service-role key bypasses RLS entirely — RLS policies must still be defined and tested as defense-in-depth for any future non-service-key caller (Red-Alert finding #4), even though they don't gate today's only caller |
| Tool-calling harness design | One agent, one tool (`github_issue_research`), two read-only operations, hard numeric limits enforced in code (not the prompt) | Matches Build Spec §3's explicit "do not build" boundary (no multi-agent, no second tool) and keeps runaway cost/scope impossible even if the model misbehaves | Less flexible than a multi-tool or multi-agent design; acceptable because the product is deliberately narrow (one issue, one role) |
| Report rendering | Model text rendered as plain escaped text in the frontend, never HTML/Markdown | Untrusted third-party GitHub content (and the model's own output, derived from it) must never execute in the browser | Slightly less rich report formatting (no bold/links rendered); correctness/security wins over polish per global dependency/correctness rules |
| Report-excerpt retention | Stored `reports.report` jsonb includes quoted third-party GitHub text in evidence fields; no retention/deletion policy has been written yet | Needed before any public-facing or longer-lived deployment, since `calcom/cal.diy` is a real repo with real people's comments (Red-Alert finding #6) | Explicitly named as an open risk in §11 rather than silently deferred — this PRD does not invent a retention period the owners haven't picked |

---

## 8. Dependencies & Integrations

| Dependency | Purpose | Integration point | Risk if unavailable |
|------------|---------|--------------------|----------------------|
| GitHub REST API (`/repos/.../issues`, `/issues/.../comments`, `/labels`, `/search/issues`) | Source of truth for the issue, comments, label list, and related-issue search | Backend harness only, via `GITHUB_READ_TOKEN` (and later `GITHUB_WRITE_TOKEN`, Phase 2) | Run fails with `github_error`/`timeout`/rate-limit handling (Build Spec §7, §8.1); harness must stop GitHub calls for the run on a rate limit, never fabricate results |
| Anthropic Claude API (school-provided key) | The tool-calling LLM that produces the triage report | Backend model client only, never the frontend | Run fails with `model_output_invalid` after retry exhaustion (Build Spec §8.1 step 6); Groq swap exists for local testing continuity |
| Groq API (test-time alternative) | Cheap/fast local iteration without burning the school Anthropic key | Backend model client, swappable | Not a production dependency; absence only affects local dev speed |
| Firebase Auth | Sign-in mechanism gating the app from public access | Frontend sign-in flow; backend verifies the session token | If unavailable, no one can sign in — acceptable fail-closed behavior for an allowlisted internal tool |
| Supabase Postgres | Stores runs, issues, tool_calls, reports, actions, approvals, eval_results | Backend only, via service-role key | Run cannot be persisted or retrieved; acceptable to fail the request rather than silently skip storage |
| Vercel | Hosting for both frontend and backend | Deployment target for both repos/slices | Standard hosting-outage risk; not specific to this app's design |

---

## 9. Non-Functional Requirements

- **Performance:** A run must complete, stop, or fail within `MAX_RUN_SECONDS=120` (starting value, Build Spec §7); individual GitHub/model calls are bounded by `REQUEST_TIMEOUT_SECONDS=20` with `MAX_RETRIES_PER_REQUEST=1`.
- **Accessibility (a11y):** Frontend is Ivaylo's slice; this PRD sets the expectation that standard web accessibility practice (keyboard navigation, sufficient contrast, labeled form inputs on the issue-URL submission form) applies per the project's `laws-of-ux` skill once frontend work starts — no project-specific a11y target beyond that baseline is known at this stage.
- **Security (expanded — this section carries all six Red-Alert intake findings as explicit, non-negotiable requirements, not implicit inferences):**
  1. **Two distinct, separately enforced auth checks.** "Is this request from a signed-in Firebase session" and "is this identity's email on the allowlist" MUST be two separate checks in backend code, both required, neither standing in for the other. A signed-in-but-not-allowlisted user MUST be rejected, explicitly, not merely fail to reach a feature by accident.
  2. **Per-resource ownership check (IDOR prevention).** `GET /api/runs/:id` and any future endpoint returning a specific resource (a run, an action, an approval) MUST verify the requesting user owns that resource, as an explicit check distinct from "is this user signed in and allowed." A signed-in, allowlisted user MUST NOT be able to read another allowlisted user's run by guessing or incrementing an ID.
  3. **`GITHUB_WRITE_TOKEN` provisioning gate.** This token MUST NOT be created or provisioned until `PRACTICE_REPO` (D5) is finalized. Once provisioned, its actual GitHub-side scope MUST be hand-verified against what's documented (limited to `PRACTICE_REPO`, issue read/write only) — not assumed correct because the request for it specified that scope.
  4. **RLS as defense-in-depth.** Row Level Security policies MUST be defined on all Supabase tables in §9/Build Spec §9 (`runs`, `issues`, `tool_calls`, `reports`, `actions`, `approvals`, `eval_results`), even though the backend's service-role key bypasses RLS entirely. This protects any future caller that is not the service-role key (eval tooling, admin scripts, a debugging session) — RLS is not rendered moot by the service-role key's bypass.
  5. **CORS allowlist, strict.** `CORS_ALLOWED_ORIGINS` MUST be a non-wildcard, explicit allowlist of origins, enforced server-side on every request. This is a MUST, not merely a listed environment variable to configure at some point.
  6. **Retention/deletion stance for stored report excerpts.** The `reports` table stores quoted third-party GitHub comment/issue text inside the `Report` jsonb's evidence fields (Build Spec §9 already requires not storing full issue bodies/comments outside these fields). Before any deployment broader than the current closed allowlist, the owners MUST decide and document a retention/deletion stance for this quoted third-party text (e.g., a time-bound retention window, or an explicit "retained indefinitely, allowlist-only access" decision) — this is an open escalation, not resolved by this PRD (see §11).
  - Additional security requirements already fixed by the Build Spec and restated here because they are load-bearing: secrets never appear in code/commits/prompts/model context/logs/README/browser (§4); the model is never given a write tool in any phase (§7); writes are harness-only, after approval, to `PRACTICE_REPO` only (§3, §8.1); model text is rendered as plain escaped text, never executed as HTML/Markdown (§8.2); all stored model text goes through parameterized queries (§8.2); logs hold identifiers/counts/outcomes only, never issue bodies, comments, tokens, or personal data (§8.2); tool errors shown to the model are short and plain, never raw errors or secrets (§8.2).
- **Scalability:** Designed for ~2-3 concurrent allowlisted users, one issue per run, `RUNS_PER_USER_PER_HOUR=10`. No multi-tenant or high-concurrency design goal exists at this scope.
- **Reliability:** A stopped run MUST always return a partial report or a clear, coded error — never a blank result (Build Spec §8.2). No uptime SLA; this is a small internal tool, not a production service with external users depending on availability.
- **Observability:** Logs capture identifiers, counts, and outcomes (run IDs, search/read counts, stop reasons, error codes) — never raw issue/comment bodies, tokens, or personal data (Build Spec §8.2). Key events to log: run started, run completed/stopped/failed (with `stop_reason`/`error_code`), tool call outcome (`ok`/`error`/`refused`), validation removals (`coverage.removedByValidation`), and (Phase 2) approval decisions.

---

## 10. Timeline & Phases

| Phase | Scope | Exit criteria | Rough timing |
|-------|-------|----------------|---------------|
| Phase 1 — Read-only triage (current) | Input checks, GitHub client, harness loop, validation, storage, `POST /api/runs`, `GET /api/runs`, `GET /api/runs/:id`; frontend URL form, report view, error states, run history; Firebase auth + allowlist with the two-check requirement; CORS allowlist; RLS policies defined | Tests T1-T4, T6, T8-T10 pass (Build Spec §11); `proposedActions` stays an empty array; two-check auth and per-run ownership check verified in code, not just assumed | Current build cycle, no fixed date — bootcamp pacing |
| Phase 2 — Approved write-back | `actions`, `approvals`, write path; frontend exact-content preview, approve/reject per action, write result; `GITHUB_WRITE_TOKEN` provisioned only after D5 is finalized and its scope hand-verified | Tests T5 and T7 pass; D4 (how the investigated issue reaches `PRACTICE_REPO`) and D5 (`PRACTICE_REPO` name) both resolved first; zero writes without a recorded approval, zero writes outside `PRACTICE_REPO` | Blocked on D4/D5 — no date until those resolve |
| Phase 3 — Evaluation | `/api/evals/run`, `/api/evals/:id`, results view, `eval_results` table | Eval harness runs the fixture set and reports the §4 metrics automatically rather than by manual owner grading | After Phase 2, no fixed date |

---

## 11. Risks & Unknowns

| Risk / Unknown | Likelihood | Impact | Mitigation | Owner |
|------------------|------------|--------|-------------|-------|
| Firebase + allowlist auth conflates "signed in" with "allowed" during implementation | M | H | Explicit two-check requirement written into §6/§9 as non-negotiable; code review must verify both checks exist and are independently testable | Jonathan |
| IDOR on per-run or per-action endpoints | M | H | Explicit per-resource ownership check required in §6/§9; this must be covered by a test, not just code review (see test-tiers: auth/data-integrity code is Tier 1) | Jonathan |
| `GITHUB_WRITE_TOKEN` provisioned with broader scope than documented, or before `PRACTICE_REPO` is finalized | M | H (Phase 2 only; not blocking Phase 1) | Explicit provisioning gate in §6/§9: no token until D5 resolved; scope hand-verified against GitHub's own token settings page, not assumed from the request | Jonathan |
| RLS policies skipped as "unnecessary since we use the service-role key" | M | M | Explicit requirement in §9 that RLS is defense-in-depth for future non-service-key callers, independent of today's bypass | Jonathan |
| `CORS_ALLOWED_ORIGINS` left wildcarded or unenforced during early development and forgotten before deployment | L-M | M | Explicit MUST in §9; should be part of pre-deploy checklist | Jonathan |
| Quoted third-party GitHub text in `reports` has no retention/deletion stance before any broader-than-allowlist deployment | M | M | Flagged as an open escalation below; owners must decide a stance before public-facing use | Jonathan + Ivaylo (joint product decision) |
| D1 (Express vs. Next.js API-only) undecided | L | L | Does not block starting backend scaffolding on either option in parallel with other Phase 1 work; low product stakes either way | Jonathan |
| D9 (Firebase + allowlist) is a placeholder pending final confirmation with Ivaylo | M | M | Must be confirmed before Phase 1 is considered done, since auth is the project's Full-tier trigger and two of the six Red-Alert findings depend on it being implemented, not just planned | Jonathan + Ivaylo |
| Model provider swap (Anthropic ↔ Groq) produces subtly different tool-calling or JSON-structure behavior | L-M | M | Harness validates structure against `ModelReport` regardless of provider (Build Spec §8.1 step 6); provider swap should not be trusted to preserve output shape without this validation | Jonathan |
| Frontend has not yet started (Ivaylo) while backend contract (Build Spec §5, §6) is already fixed | L | M | Contract-first approach already mitigates this — frontend builds against a fixed shape rather than negotiating it mid-build | Ivaylo |

**Open questions escalated to the human:**
- D1 (Express vs. Next.js API-only) — low-stakes product/technical choice, left open per the Build Spec; not escalated further here since it doesn't block Phase 1 work starting.
- D4 (how the investigated issue reaches `PRACTICE_REPO` — copied by hand vs. app-created as an approved write) and D5 (`PRACTICE_REPO` name) — both genuinely open, Phase 2 only, explicitly not blocking Phase 1.
- D9 finalization — Firebase Auth + email allowlist is the working assumption; needs Ivaylo's explicit sign-off before Phase 1 is called done, since it is the mechanism enforcing both of Red-Alert's highest-severity findings (two-check auth, IDOR).
- Report-excerpt retention/deletion stance (Red-Alert finding #6) — no decision exists yet; owners must pick one before any deployment broader than the current closed allowlist.

---

## 12. Acceptance Criteria

Adopts the Build Spec's acceptance tests (§11) as the binding definition of done for Phase 1, plus the Red-Alert-driven requirements this PRD adds on top.

- [ ] T1-T4, T6, T8-T10 (Build Spec §11) all pass against frozen synthetic fixtures.
- [ ] `proposedActions` is an empty array in every Phase 1 report.
- [ ] A signed-in user who is not on the email allowlist is rejected by a check that is demonstrably separate from the "is signed in" check (e.g., a test that signs in a non-allowlisted account and confirms rejection, distinct from a test of an unauthenticated request).
- [ ] A signed-in, allowlisted user cannot retrieve another allowlisted user's run via `GET /api/runs/:id` (explicit IDOR test: user A's run ID requested under user B's session returns `unauthorized` or `not_found`, never the run).
- [ ] RLS policies exist and are defined on all seven Supabase tables (`runs`, `issues`, `tool_calls`, `reports`, `actions`, `approvals`, `eval_results`), independently of the service-role key bypass.
- [ ] `CORS_ALLOWED_ORIGINS` is configured as a non-wildcard allowlist and a request from a non-allowlisted origin is rejected server-side.
- [ ] A written retention/deletion stance for quoted third-party report excerpts exists before any deployment broader than the current closed allowlist (may be "retain indefinitely, allowlist-only access" if that's the owners' actual decision — but it must be a stated decision, not silence).
- [ ] `GITHUB_WRITE_TOKEN` is not created/provisioned anywhere in Phase 1 work; when it is provisioned for Phase 2, its scope is hand-verified against GitHub's token settings, not assumed.
- [ ] No secret (GitHub token, model API key, Supabase service-role key) appears in code, commit history, prompts, model context, logs, the README, or any browser-visible payload.
- [ ] Metric targets in §4 are measured at least once against the real or fixture set before Phase 1 is declared complete.

**Definition of done:** Phase 1 is complete when every acceptance criterion above passes, all P0 features in §6 are delivered, and D9 (auth mechanism) has Ivaylo's explicit confirmation rather than standing as a placeholder.
