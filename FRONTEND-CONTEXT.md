# Frontend Build Context — IssueScout

## For Ivaylo

The backend's done and merged to `main` — API routes, auth, DB, all tested. This file is what to paste into your LLM's context before you start building the frontend. It's not a spec and won't build the app for you; it just keeps your LLM from guessing at things that are already fixed (API shapes, auth flow, the no-CORS-needed setup, the plain-text rendering rule) so your half plugs into mine without rework. The "Required reading" docs (`APPFLOW.md`, `DESIGN-BRIEF.md`, `USER-STORIES.md`) have the actual screens/flows/UX criteria — worth skimming yourself too, not just handing to the LLM.

If your LLM hits one of the "flag to the user" items at the bottom, that's a real decision for us to make together, not something to let it guess on.

---

## Instructions for the assistant building this frontend

Backend is already built and merged to `main`. Treat the rules below as fixed constraints, not suggestions — do not re-derive, re-negotiate, or "improve" them without flagging it to the user first.

### Scope
- One Next.js app, not two. Backend owns `app/api/`, `lib/server/` — never edit these.
- Frontend owns `app/` (non-api), `components/`, `lib/client/`.
- Setup: `npm install && cp .env.example .env && npm run dev`. Real `.env` values come from the backend owner, not invented.

### Types
- Import `Report`, `ErrorCode`, `ApiErrorBody`, etc. from `lib/contract.ts`. Never redeclare these types locally, even partially.

### Endpoints (fixed, do not assume a different shape)
```
POST /api/runs  { issueUrl } -> { runId, status, report } | ApiErrorBody
GET  /api/runs?limit=20 -> { runs }
GET  /api/runs/:id -> { run, report, actions: [] }
```
- `GET /api/runs/:id` returns the same 404 for "doesn't exist" and "not yours." Never build logic that tries to tell these apart — there is no signal to tell them apart with.
- Every error response is `{ error: { code, message } }`. Render `message` directly; do not write per-code custom copy.
- `turn_limit` and `time_limit` return HTTP 200 with a partial `report`. This requires a third UI state distinct from "complete" and "failed" — do not collapse it into either.

### Auth
- Attach `Authorization: Bearer <firebase-id-token>` to every `/api/*` call. Implement this once, in a shared fetch wrapper — not per call site.
- Two server-side checks exist: signed-in, then allowlisted. A response of `unauthorized` can mean either. Build a distinct "not authorized" screen separate from "not signed in" — do not merge them.
- Do not implement any client-side allowlist check. The allowlist is server-only and invisible to the frontend.
- Auth provider (Firebase) is a placeholder pending sign-off. If asked to swap providers, that's expected — the backend's auth module is isolated for exactly this.

### CORS
- Frontend and backend are same-origin. Always call relative paths (`/api/runs`). Never introduce `API_BASE_URL` or an absolute-origin fetch for this API.

### Rendering (hard constraint, security-relevant)
- Render all model-derived and GitHub-derived text (summary, evidence, limitations, etc.) as plain escaped text only.
- Never use Markdown rendering or `dangerouslySetInnerHTML` on any of this text.
- Do not build a chat-style UI (no message bubbles, no reply input). This is a single-submission report viewer.

### Required reading before generating screens
- `APPFLOW.md` — binding screen/branch logic. Route names are flexible; branches are not.
- `DESIGN-BRIEF.md` — fixed report section order; status must always pair a text label with any color coding, never color alone.
- `USER-STORIES.md` — acceptance criteria per feature, if a concrete test is needed.

### Code style to match
- Strict TypeScript, no `any`.
- Switch exhaustively over `ErrorCode` (let the type system flag missing cases).
- One module for frontend env/config reads, not scattered `process.env` access.
- Do not add a dependency for anything implementable in ~10 lines (Markdown renderer, HTTP client, etc.) — match the backend's existing minimal-dependency bar.

### Do not decide silently — flag these to the user instead
- Final auth provider choice.
- Retention/deletion policy for stored third-party GitHub text.
- `POST /api/runs` is synchronous today (no polling needed). If building a polling/loading flow anyway, confirm that's actually wanted first — the endpoint doesn't require it.
