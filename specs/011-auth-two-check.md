# 011 — Auth: two distinct, separately-enforced checks

## [SPEC]

This is a Crucial Juncture spec (auth) per the global shared definition — edge-case-triage's skip-the-gate rule applies: deeper enumeration from the start, no cheap-sweep-first gate. **Soundwave (post-GREEN risk assessment) must run against this spec's diff** per CLAUDE.md's conditional-inclusion rule — this is exactly the "auth/ownership/RLS work" CLAUDE.md names as soundwave's trigger.

## [SPEC] (continued)

- **Objective**: Build `lib/server/auth.ts` exposing `verifySession(req)` and `isAllowlisted(email)` as two separate, sequentially-called functions — PRD §9 finding #1, Red-Alert's highest-severity finding, US-1's binding acceptance criteria, TRD §5's explicit "never one combined `isAuthorized()`" rule. This is the single interface every route handler (spec 013) calls; a Firebase provider sits behind it (D9 placeholder, pending Ivaylo's sign-off per PRD §11/§12 — build against the interface, do not treat D9 as finalized).
- **Inputs/Outputs**: `verifySession(req: Request): Promise<{ uid: string; email: string } | null>` — verifies a Firebase ID token via `firebase-admin`, returns the decoded identity or `null` (never throws for "no token"/"invalid token," so callers can't accidentally skip the null-check via an uncaught exception path). `isAllowlisted(email: string): boolean` — checks `config.allowedUserEmails` (spec 002), a pure synchronous function with no I/O. No TRD §3 API-shape citation applies here (this is the internal auth seam, not an external endpoint) — but every spec-013 route handler's auth preamble is fixed by this spec's two function signatures, not invented per-route.
- **Design Pattern**: Two-function interface, not a class, not a combined guard — the "two distinct, separately enforced checks" requirement is a design pattern in itself here, explicitly named and explicitly not collapsible for convenience.
- **Bounded-AI boundary**: Entirely deterministic. No model involvement in auth decisions.
- **Verification Oracle**: `npx vitest run tests/unit/auth.test.ts` — new unit tests, each proving the two checks are independently testable and independently failing: (a) a request with no valid Firebase session token → `verifySession` returns `null`, and this is asserted as a distinct test case from (b); (b) a request with a *valid* Firebase session but an email not present in `config.allowedUserEmails` → `verifySession` returns the decoded identity (succeeds), but `isAllowlisted(email)` returns `false` — asserted as two separate function calls with two separate results, never as one combined boolean; (c) a valid session + allowlisted email → both checks pass. This directly satisfies PRD §12's acceptance criterion: "a test that signs in a non-allowlisted account and confirms rejection, distinct from a test of an unauthenticated request" — tests (a) and (b) are that exact distinction, written as two separate test cases, not one parameterized case that blurs them.
- **Intellectual Control**: The two-function signature is what makes "conflating signed-in with allowed" a compile-time-visible mistake at every call site — a route handler that calls only `verifySession` and treats its non-null result as "authorized" is visibly incomplete code (missing the `isAllowlisted` call), rather than a logic bug hidden inside one opaque `isAuthorized()` implementation. This is PRD §9 finding #1 enforced by interface shape, the same mechanism TRD §4/§5 already prescribes — this spec is where that design decision actually gets built, not just stated.
- **Constraints**: `firebase-admin` only (pre-authorized). No route-handler code in this file — `auth.ts` exports the two check functions only; wiring them into route handlers in the correct order (verifySession, then isAllowlisted, both required, neither standing in for the other) is spec 013's job, referencing this spec's exports.
- **Edge Cases**: An expired or malformed Firebase token is treated identically to "no token" by `verifySession` — returns `null`, never throws, never partially succeeds. An allowlist read as an empty array (`ALLOWED_USER_EMAILS` unset) means `isAllowlisted` returns `false` for every email — fail-closed, not fail-open, matching PRD §9's "the app MUST NOT be open to the public" fixed constraint. Email comparison in `isAllowlisted` should be case-normalized (lowercase both sides) since email addresses are commonly case-insensitive in practice and a case-mismatch false-rejection (or worse, a false-acceptance if normalization is inconsistent) is exactly the kind of auth edge case the deeper-enumeration pass is meant to catch.
- **UI States**: N/A — no UI files (the Not-authorized screen per APPFLOW.md is Ivaylo's frontend slice, out of scope this cycle).
- **Files** (≤5):
  1. `lib/server/auth.ts` — new.
  2. `tests/unit/auth.test.ts` — new.
  3. (reserve slot — not expected to be needed)
  4. (reserve slot — not expected to be needed)
  5. (reserve slot — not expected to be needed)

**References (≤3):** `lib/server/config.ts` (spec 002, `config.allowedUserEmails`), TRD.md §5 (the two-check model this spec implements), PRD.md §9 finding #1 / US-1 (the binding requirement and acceptance criteria).

[FORCES]
1. Two separate functions, both required at every call site > one combined guard — this is non-negotiable per PRD §9 finding #1, not a style preference Shockwave is overriding Simplicity for.
2. Simplicity > Pattern purity (otherwise always present; no override needed here since the two-function shape *is* the simple, correct shape — a combined guard would be simpler-looking but wrong).
