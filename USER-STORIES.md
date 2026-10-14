# User Stories — IssueScout

> **Current frontend decisions (October 14, 2026):** See [PAGE-COMPOSITION.md](PAGE-COMPOSITION.md) for the page contract. Public Google signup replaces invitation-only access. Submission is synchronous, not a polling flow. The current build is read-only; future write-back screens are not implemented. The white/silver translucent design follows the user’s updated direction. These decisions supersede conflicting statements below.


**Author:** Starscream (PRD Writer)
**Date:** 2026-10-08
**Status:** Draft
**Companion to:** `PRD.md` §6 (Feature Breakdown), §12 (Acceptance Criteria)

> Full-tier project. One story per P0/P1 feature row in `PRD.md` §6. Acceptance criteria in EARS notation; every story with Crucial-Juncture or edge-case surface (per `~/.claude/skills/edge-case-triage/SKILL.md` — auth and data-integrity code skip the cheap-sweep gate and go straight to deeper enumeration) carries at least one Unwanted Behavior (IF/THEN) criterion.

---

### US-1: Sign in and be verified against the allowlist

**As a** Maintainer (allowlisted operator)
**I want** to sign in with Firebase and have the system separately verify my email is on the allowlist
**So that** the app stays closed to the public per the fixed D9 constraint, with no ambiguity about which check failed

**INVEST check:** Independent (auth gating doesn't depend on any other feature shipping first) / Negotiable (Firebase specifics are a placeholder pending Ivaylo's confirmation, but the two-check shape is fixed) / Valuable (this is the entire reason the project is Full-tier) / Estimable (a known, bounded auth integration) / Small (one gate, two checks) / Testable (both checks independently verifiable).

**Acceptance criteria (EARS notation):**
- WHEN a user successfully signs in via Firebase THE SYSTEM SHALL check whether the signed-in email is present on the configured allowlist, as a step distinct from the sign-in check itself.
- WHEN a user is signed in and their email is on the allowlist THE SYSTEM SHALL grant access to the submission form and all authenticated routes.
- IF a request has no valid Firebase session THEN THE SYSTEM SHALL reject it before any allowlist check runs, returning an unauthenticated response.
- IF a request has a valid Firebase session but the email is not on the allowlist THEN THE SYSTEM SHALL reject it with a response distinguishable from the "not signed in" case (e.g., a distinct error code or the Not-authorized screen per `APPFLOW.md`), never silently treating "allowed" as implied by "signed in."

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-2: Submit a GitHub issue URL and receive a triage run

**As a** Maintainer
**I want** to submit one GitHub issue URL from the approved repository and have the system create a run
**So that** I get a triage report without manually reading, classifying, and searching the repo myself

**INVEST check:** Independent / Negotiable (D1 framework choice doesn't affect this story's behavior) / Valuable (the core product action) / Estimable / Small (one endpoint, bounded input validation) / Testable (Build Spec T10 fixtures already define pass conditions).

**Acceptance criteria (EARS notation):**
- WHEN a signed-in, allowlisted user submits a valid issue URL within `APPROVED_REPO` THE SYSTEM SHALL create a run with status `running` and begin the harness loop.
- WHEN the user's run count in the past hour is below `RUNS_PER_USER_PER_HOUR` (10) THE SYSTEM SHALL accept the new run request.
- IF the submitted URL is not an issue URL in `APPROVED_REPO` THEN THE SYSTEM SHALL return `invalid_url` or `repo_not_allowed` and create no run.
- IF the submitted URL points to a pull request THEN THE SYSTEM SHALL return `is_pull_request` and create no run.
- IF the issue body exceeds `ISSUE_MAX_CHARS` (20000) THEN THE SYSTEM SHALL return `issue_too_long` and create no run, and MUST NOT call the model with a truncated body.
- IF the user has reached `RUNS_PER_USER_PER_HOUR` THEN THE SYSTEM SHALL return `rate_limited` and create no run.

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-3: Bounded, evidence-grounded GitHub research

**As a** Maintainer
**I want** the model's research limited to read-only operations on the approved repository, with hard numeric limits enforced in code
**So that** I can trust the report didn't fabricate evidence, run away in cost, or touch any repository it shouldn't

**INVEST check:** Independent (the tool contract is fixed regardless of UI) / Negotiable (limit values like `MAX_SEARCHES` are configurable constants, not the behavior itself) / Valuable (this is the trust foundation of the whole report) / Estimable / Small (two operations, one tool) / Testable (Build Spec T1, T3, T6, T9 already define pass conditions).

**Acceptance criteria (EARS notation):**
- WHILE a run is active THE SYSTEM SHALL restrict the model to the `github_issue_research` tool's `read` and `search` operations only, with no write operation ever exposed.
- WHEN the model requests a tool call THE SYSTEM SHALL validate the call, enforce `MAX_SEARCHES`/`MAX_CANDIDATE_READS`/`MAX_COMMENTS_PER_ISSUE` limits, and run it with a `REQUEST_TIMEOUT_SECONDS` timeout.
- IF the model reaches `MAX_SEARCHES` or `MAX_CANDIDATE_READS` THEN THE SYSTEM SHALL refuse further calls of that kind and instruct the model to finish with what it has.
- IF the model exceeds `MAX_MODEL_TURNS` or `MAX_RUN_SECONDS` THEN THE SYSTEM SHALL stop the run and return a partial report naming the limit reached and what remained unchecked — never a blank result.
- IF a GitHub call hits a rate limit THEN THE SYSTEM SHALL stop making further GitHub calls for that run and record the failure in `coverage.searchesFailed`, never reporting it as zero matches.
- IF the issue text contains embedded instructions directed at the model THEN THE SYSTEM SHALL have the model ignore them, set `containsEmbeddedInstructions=true`, and continue — relying on the model's lack of write capability as the actual defense, not the prompt alone.

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-4: Receive a structured, validated triage report

**As a** Maintainer
**I want** the report checked against the `ModelReport` schema and against the repo's real label list and retrieved data before I see it
**So that** I never see an invented label, a fabricated related-issue, or a URL the system never actually retrieved

**INVEST check:** Independent / Negotiable (validation rules are fixed by Build Spec §8.1 step 7, not open to builder discretion) / Valuable (the report is worthless if untrustworthy) / Estimable / Small / Testable (Build Spec T9 defines the exact pass condition).

**Acceptance criteria (EARS notation):**
- WHEN the model returns a final answer THE SYSTEM SHALL validate it against the `ModelReport` schema before accepting it.
- IF schema validation fails once THEN THE SYSTEM SHALL send the validation error back to the model exactly once for a retry.
- IF schema validation fails a second time THEN THE SYSTEM SHALL stop the run with `model_output_invalid`.
- WHEN a validated report contains a suggested/proposed label not in the repository's real label list, a related-issue number not retrieved in this run, or a URL not sourced from retrieved data THEN THE SYSTEM SHALL remove that item and record it in `coverage.removedByValidation`.
- WHEN the report is saved THE SYSTEM SHALL fill `coverage` entirely from the harness's own counters, never from model-reported values.

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-5: View run history and retrieve only my own runs

**As a** Maintainer
**I want** to see a list of my past runs and open any one of them, without being able to open another user's run
**So that** I can revisit past triage work, and so that another allowlisted user's data stays private from me and vice versa

**INVEST check:** Independent (ownership enforcement is a backend concern separable from the UI) / Negotiable (list pagination/limit shape is flexible) / Valuable (both the feature and its security property matter) / Estimable / Small / Testable (an IDOR check is directly testable with two user sessions).

**Acceptance criteria (EARS notation):**
- WHEN a signed-in, allowlisted user requests `GET /api/runs?limit=` THE SYSTEM SHALL return only that user's runs, newest first.
- WHEN a signed-in, allowlisted user requests `GET /api/runs/:id` for a run they own THE SYSTEM SHALL return that run, its report, and its actions.
- IF a signed-in, allowlisted user requests `GET /api/runs/:id` for a run they do not own THEN THE SYSTEM SHALL reject the request (`unauthorized` or `not_found`) and MUST NOT return any part of that run's content — this check MUST be explicit and separate from the "is signed in and allowed" check (PRD §9, Red-Alert finding #2).

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-6: CORS enforcement restricts callers to the approved frontend

**As a** Maintainer (indirectly — this protects the system I depend on)
**I want** the backend to reject requests from any origin not explicitly allowlisted
**So that** no other site can call the backend API on a signed-in user's behalf

**INVEST check:** Independent / Negotiable (the allowlist's actual origin values are config, not behavior) / Valuable / Estimable / Small / Testable (a request from a non-listed origin is a direct test case).

**Acceptance criteria (EARS notation):**
- THE SYSTEM SHALL enforce `CORS_ALLOWED_ORIGINS` as a non-wildcard, explicit allowlist, checked on every request.
- IF a request's origin is not in `CORS_ALLOWED_ORIGINS` THEN THE SYSTEM SHALL reject the request.

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-7: RLS policies exist as defense-in-depth on every table

**As a** the system's future self (eval tooling, an admin script, anyone not using the service-role key)
**I want** Row Level Security policies defined on every Supabase table even though today's only caller bypasses them
**So that** a future non-service-key caller cannot read or write data it shouldn't, without anyone having to remember to add RLS later under time pressure

**INVEST check:** Independent (RLS definition doesn't depend on any feature being built first) / Negotiable (policy specifics per table are an implementation detail) / Valuable (defense-in-depth has real value even if unused today) / Estimable / Small (standard Postgres/Supabase RLS authoring) / Testable (attempt a read/write as a non-service-role role and confirm it's denied).

**Acceptance criteria (EARS notation):**
- THE SYSTEM SHALL have Row Level Security policies defined on `runs`, `issues`, `tool_calls`, `reports`, `actions`, `approvals`, and `eval_results`.
- IF a non-service-role caller attempts to read or write any of these tables without matching an RLS policy THEN THE DATABASE SHALL deny the operation.
- WHILE the backend uses the service-role key THE SYSTEM SHALL continue to rely on application-level ownership checks (US-5) as the enforced control for today's traffic — RLS existing does not replace those checks, it backs them up for callers that bypass the app layer entirely.

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-8: Stored report excerpts have a stated retention stance

**As a** Maintainer (and, indirectly, the real GitHub commenters whose text is quoted)
**I want** a documented decision about how long quoted third-party GitHub text persists in the `reports` table
**So that** the project doesn't silently retain real people's comments indefinitely by default, without anyone having decided that on purpose

**INVEST check:** Independent (a policy decision, not a feature with its own UI) / Negotiable (the actual retention period/stance is an open product decision — PRD §11) / Valuable (required before any broader-than-allowlist deployment) / Estimable (writing the stance down is small; enforcing deletion, if chosen, is a separate follow-up) / Testable (the stance either exists in writing or it doesn't).

**Acceptance criteria (EARS notation):**
- THE SYSTEM documentation SHALL state an explicit retention/deletion stance for quoted third-party text stored in `reports.report`'s evidence fields before any deployment broader than the current closed allowlist.
- IF no retention/deletion stance has been written down THEN THE PROJECT SHALL treat this as an open blocker for broader deployment, not as a default-acceptable silence (PRD §11).

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

### US-9 (Phase 2): `GITHUB_WRITE_TOKEN` provisioned only after `PRACTICE_REPO` is finalized

**As a** Jonathan (backend owner, token provisioner)
**I want** the write token created only after D5 (`PRACTICE_REPO`) is finalized, and its actual GitHub-side scope hand-verified
**So that** a write-capable credential never exists scoped more broadly than documented, and never exists before there's a confirmed safe place for it to write

**INVEST check:** Independent (a provisioning-order rule, not a feature) / Negotiable (not negotiable on the ordering — PRD §9 makes this a MUST — but the exact verification steps are implementation detail) / Valuable (prevents a real credential-scope mistake) / Estimable / Small / Testable (check token creation timestamp against D5 resolution; check token's actual scopes on GitHub against documentation).

**Acceptance criteria (EARS notation):**
- IF `PRACTICE_REPO` (D5) is not yet finalized THEN THE PROJECT SHALL NOT create or provision `GITHUB_WRITE_TOKEN`.
- WHEN `GITHUB_WRITE_TOKEN` is provisioned THE OWNER SHALL hand-verify its actual scope on GitHub's token settings page matches the documented scope (limited to `PRACTICE_REPO`, issue read/write only) before it is used in any write call.
- IF the token's actual scope does not match what's documented THEN THE OWNER SHALL correct the token's scope before first use, not after.

**Maps to:** `specs/NNN-slug.md`'s Verification Oracle (filled in by Shockwave once the spec exists — blank until then)

---

## Coverage check

Every P0 feature in PRD §6 has a story: US-1 (auth two-check), US-2 (submission/run creation), US-3 (bounded GitHub tool), US-4 (structured/validated report), US-5 (run history + ownership/IDOR). Every P1 feature carried forward from the Red-Alert findings has a story: US-6 (CORS), US-7 (RLS), US-8 (retention stance), US-9 (write-token provisioning gate, Phase 2). Rate limiting (P1) is covered inside US-2's acceptance criteria rather than as a separate story, since it's one clause of the same submission flow, not an independently valuable capability. Phase 2's broader approval workflow and Phase 3's eval harness are intentionally not expanded into their own stories yet — both are blocked/deferred per PRD §10, and inventing detailed EARS criteria for a workflow whose D4/D5 inputs are still open would be speculation rather than a real spec input.

Every story with Crucial-Juncture surface (auth: US-1; data-integrity/IDOR: US-5; credential provisioning: US-9) carries at least one Unwanted Behavior (IF/THEN) criterion, consistent with `edge-case-triage`'s rule that these categories skip the cheap-sweep gate and go straight to deeper enumeration.
