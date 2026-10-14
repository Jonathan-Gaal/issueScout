# IssueScout page composition

This is the current frontend composition contract, based on the existing endpoints and the user's public-signup decision. It describes a read-only research product, not the later approval/write-back product.

## Decisions that supersede older documents

- Anyone may create an account or sign in with Google. Firebase verifies the session and verified email; there is no invited-user allowlist. Report ownership remains enforced by the backend. Older allowlist branches in APPFLOW.md and USER-STORIES.md no longer apply.
- Account availability does not mean all GitHub repositories are supported. The deployment currently researches one configured repository. Show its name before the user starts a live report.
- `POST /api/runs` is synchronous. Show a waiting state on submission, then navigate to the returned report. Do not add a polling workflow from the older APPFLOW diagram.
- A complete report, a partial report, and a failed run are distinct outcomes. A partial report is usable evidence with stated limits, not a successful exhaustive investigation.
- The app cannot post comments, apply labels, close issues, fix code, or connect an arbitrary repository. Do not show controls or promises for those future capabilities.
- Live authentication requires project configuration. Sample mode is immediately explorable and must never imply that live research occurred.

## Shared navigation and visual rules

Public pages help visitors understand and enter the product. Authentication pages help visitors create or access their account. Workspace pages help authenticated users research and revisit issues. Keep these three contexts visually distinct.

- Public navigation: brand/home, How it works, Trust & safety; clear access to Sign up, Sign in, and Try demo.
- Authentication: compact brand/home header and a demo exit; no workspace sidebar before entry.
- Workspace navigation: New report, Report history, How to use IssueScout. Show current location, account identity, and Sign out.
- Demo navigation: equivalent sample routes, a persistent Sample mode label, and an explicit sign-up/sign-in transition to live work. Guide and history navigation stay inside demo until that explicit transition.
- Use the user's polished SaaS and bold visual direction: graphite public pages and navigation, silver reading surfaces, translucent cards, restrained blue, no arrow icons in calls to action, readable contrast, reduced-motion support, and a pause animation control where animation is present.
- Render GitHub and model content as escaped text. Status always includes words, not color alone.

## Page-by-page contract

| Page | User's question | Required content | Main action | Secondary action and states |
|---|---|---|---|---|
| `/` Home | Is this for me, and where do I start? | Audience: GitHub project maintainers. One-sentence value: one issue link becomes an evidence-backed research report. Keep one short explanatory sentence. Repository scope remains on the submission page. | Get started (signup) | Log in; See sample. Keep this short, without repeating the full report or adding a long feature grid. |
| `/how-it-works` | What happens after I submit a link? | Three concrete steps: paste one supported issue link; IssueScout reads and compares evidence; review the report and decide on GitHub. Clarify bounded research rather than a search of all GitHub. | Try demo | Sign up. Use the same names as the actual workspace controls. |
| `/trust` | What can the agent change, and what can I trust? | Read-only access, source-backed findings, visible uncertainty and research limits. State that history is account-specific. Do not invent a retention period or guarantee injection detection. | Try demo | Sign up. Explain that related issues are suggestions, not proven duplicates. |
| `/signup` | How do I get an account? | Create your account; Google signup; no invitation required; report history belongs to the account. | Sign up with Google | Existing account: Sign in. Try demo. Show busy, cancelled/failed sign-in, and unavailable-configuration states honestly. |
| `/signin` | How do I return to my reports? | Welcome back; Google sign-in; short explanation of account access. | Sign in with Google | New user: Sign up. Try demo. Signed-in user: Continue to workspace. Same error and configuration states as signup. |
| `/workspace` New report | What exactly should I paste? | Labelled GitHub issue URL input, supported repository, an example URL format, issue-not-pull-request hint, concise description of report output, read-only note. | Research this issue | Report history. Disable duplicate submission while busy. Show synchronous loading, exact backend errors, and history recovery after connection interruption. |
| `/runs` History | Where is the work I already did? | Latest 20 own runs; recognizable repository/issue identifier; creation time; text status. Explain list limit. | Open a report | New report. Loading, empty, retryable error, complete, partial, failed, and in-progress entries. Do not imply pagination or search exists. |
| `/runs/[id]` Report | What was found, how reliable is it, and what do I do next? | Issue identity and source, status, report sections in the fixed order below, research coverage, clear review guidance. | Review evidence and recommended next step | View original issue on GitHub; New report; Report history. Missing and non-owned IDs share the same unavailable state. In-progress runs offer manual refresh. |
| `/guide` Guide | How should I use this responsibly? | Where to get an issue link, how to read findings, how to evaluate a partial result, and where to perform changes manually. | Start a live report | Try a sample first. Do not describe write-back approval controls that do not exist. |
| `/not-authorized` Session/access problem | Why can't I enter, and how do I recover? | Session could not be verified; no claim that the user needs an invitation. | Sign in again | Switch account through sign-out; Try demo. Do not expose private resource existence. |
| `/demo` Sample entry | Can I understand the product without an account? | One fictional issue, a short problem statement, prepared-example disclosure. | Open sample report | Sample history; explicit create-account transition. No editable live analysis submission. |
| `/demo/report` Sample report | What would a finished or incomplete report look like? | Prepared report, visible sample disclosure, complete/partial outcome toggle. | Explore the report | Sample history; explicit signup/sign-in for a real report. No live requests or saved-run claims. |
| `/demo/history` Sample history | What will saved work look like? | Clearly illustrative single history item, not saved or live data. | Open sample report | Return to sample entry. |
| `/demo/guide` Sample guide | How does this example map to real use? | Same reading guidance as the live guide, with sample-context introduction. | Open sample report | Explicit Sign up for live research. Ordinary guide navigation remains in the demo. |

## Fixed report composition

Preserve this order: issue, summary, category, suggested priority, suggested labels, supporting evidence, missing information, related issues, recommended next step, limitations. Show system-recorded research coverage separately from model-authored findings.

Above the report, give a short reading instruction: check the summary, verify linked evidence, then use the next-step recommendation. This is orientation, not a second generated summary or reordered report.

A partial result must explain what stopped the run. Empty related issues means none were included in the limited research, not that none exist. Suggested labels and recommendations must remain visibly unapplied. The actual action happens on GitHub outside IssueScout.

## Prioritized review findings

1. **Remove workspace navigation from signup/signin.** It implies the visitor is already inside an account and competes with the one task on those pages.
2. **Expose repository scope before signup or submission.** Public accounts plus a generic GitHub promise otherwise suggests any repository will work.
3. **Keep demo navigation consistent.** The reused live guide currently sends visitors to a live workspace unexpectedly; use sample-specific actions and an explicit transition.
4. **Make public informational pages actionable.** How it works and Trust & safety need a clear demo/signup route, without forcing visitors back home.
5. **Add report reading guidance.** The existing field order is correct; a short introduction helps users understand how to turn the report into a decision.
6. **Repair stale source documents.** APPFLOW.md, DESIGN-BRIEF.md, and USER-STORIES.md still contain invitation-only and polling assumptions. This contract supersedes those aspects; update them before handing the work to another builder.

No pricing, team administration, billing, integrations marketplace, bulk triage, auto-labeling, or repository setup screens are required for the current build. Adding them would suggest capabilities the backend does not provide.

## Visual rebuild — October 14

Replaced the accumulated public styles with the Studio design system. The short homepage pairs a clear signup/sample choice with one explicitly fictional report preview. Public informational pages, authentication, the workspace, history and reports share typography, glass surfaces and color tokens. Motion is limited to entrances and a floating preview, with pause and reduced-motion support. Authentication and API behavior are unchanged.
