# UI/UX Design Brief — IssueScout

**Author:** Starscream (PRD Writer)
**Date:** 2026-10-08
**Status:** Draft
**Companion to:** `PRD.md` §2 (Users & Personas), `.claude/skills/laws-of-ux/SKILL.md`

> Full-tier project. `laws-of-ux` is the universal heuristic checklist Ivaylo (frontend owner, not yet started) applies to every screen regardless of project; this brief is the IssueScout-specific complement — what this project should look and feel like, and the design-system choices specific to a triage report viewer, not general UX principles restated here.

---

## 1. Design Direction

IssueScout should feel like an internal developer tool, not a consumer product — closer to a GitHub Actions log viewer or a CI dashboard than a marketing site. The tone is utilitarian, dense-but-legible, and trustworthy: a maintainer reading a triage report needs to quickly tell what's solid (evidence-linked) from what's uncertain (`priorityUncertainty`, `missingInformation`) at a glance.

What it should feel like: plain text treated with care — monospace or near-monospace for issue titles/numbers/URLs, clear visual separation between "what the model found" and "what the model is unsure about," and a report layout that reads top-to-bottom the same way the Build Spec's OUTPUT section (§10) is ordered (issue → summary → category → priority → labels → evidence → missing info → related issues → next step → limitations) — the UI should not reorder what the system prompt already fixed as the report's structure.

What it should explicitly not feel like: a chat interface. This is not a conversation with an AI; it is a report viewer. There is no back-and-forth with the model in the product — a single submission produces a single report. The UI must not visually imply an open dialogue (no chat bubbles, no "type a reply" affordance) because that would misrepresent what the system does and could invite users to try the out-of-scope interactions the system prompt explicitly refuses (code fixes, acting outside the one issue).

## 2. Target Audience

Per `PRD.md` §2: the Maintainer persona (allowlisted operator) is a developer, comfortable reading GitHub issues and diffs natively — no need to explain GitHub conventions (labels, issue numbers, PR vs. issue) to this audience. Device/context: primarily desktop, at a keyboard, in a "working session" mindset (same context as reading a PR or triaging a backlog) — not a mobile/on-the-go use case. No additional audience detail beyond what PRD §2 already captures.

## 3. Design Requirements

| Element | Decision | Why |
|---|---|---|
| Color | Neutral base (grays/white or a dark-mode-first neutral palette) with a small, consistent semantic set: one color for priority=high/security-flagged, one for "needs review"/"needs clarification," one for success (written/approved), one for error/failed. No decorative color. | A triage tool's color use should carry meaning (severity, status), not branding. Overuse of color on a dense report reduces scanability, which is the entire value proposition of the report view. |
| Typography | A legible sans-serif for prose fields (`summary`, `categoryReason`, `recommendedNextStep`); monospace for identifiers (issue numbers, URLs, label names) | Matches how GitHub itself typesets these fields; keeps structured data visually distinct from the model's prose |
| Layout | Single-column report layout, generous vertical rhythm between report sections (summary / category / priority / labels / evidence / missing info / related issues / next step / limitations), matching Build Spec §10's OUTPUT ordering exactly | A triage report is read linearly, not scanned as a dashboard grid; preserving the system prompt's own section order means the UI never contradicts or reorders what the model was instructed to produce |
| Component inventory | Issue-URL submission form (single text input + submit, inline validation errors); run status badge (running/completed/stopped/failed, color-coded per the semantic set above); report section components (one per `ModelReport`/`Report` field, Feature Breakdown PRD §6); evidence citation component (`observation` + clickable `sourceUrl`, opens GitHub in a new tab); related-issue card (number, title, similarities, differences, assessment badge); coverage/limitations panel (separate visual treatment from the model's own content, since `coverage` is harness-written, never model-written — Build Spec §5); run history list item; action-review card (Phase 2: exact label/comment content + target issue, approve/reject buttons) | Each component maps directly to a PRD §6 P0/P1 feature; no component is invented beyond what the report shape (Build Spec §5) and the endpoint contract (Build Spec §6) already require |
| Rendering rule (non-negotiable, security-driven) | All model-derived text renders as plain escaped text — no HTML, no Markdown interpretation, no `dangerouslySetInnerHTML`-equivalent | PRD §9 Security / Build Spec §8.2: model text must never be rendered as HTML or Markdown that can load outside content, since it is derived from untrusted third-party GitHub text |

## 4. Accessibility Approach

No project-specific accessibility target beyond `laws-of-ux`'s baseline is currently known — this brief does not invent a stricter WCAG level or assistive-tech commitment the owners haven't discussed. The one project-specific note: the semantic color-coding in §3 (priority/status) must not be the only signal — pair every color-coded status with a text label (e.g., "High priority" text alongside the color swatch), since color-only status indication is exactly the kind of failure `laws-of-ux`'s accessibility heuristics already flag in general, and this project's status badges are a concrete place it would otherwise occur.

## 5. UX Research & Artifacts

None conducted for this project — no user interviews, competitor analysis, or existing design files exist beyond the Build Spec itself. This is an honest "none," not an omission: the Build Spec (human-authored, Build Spec intro) functions as the closest thing to user research available, since it was written jointly by the two people who are also this tool's initial users.

---

## What's deliberately not here

No Timeline section — `PRD.md` §10 already covers phases/timing. No Budget section — not applicable to a two-person bootcamp build with no external design spend.
