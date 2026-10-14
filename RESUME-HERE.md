# IssueScout — resume here

Saved October 14, 2026.

## Current work

Checkout: `/Users/ivaylonanev/Documents/Codex/IssueScout-landing`
Branch: `feat/glass-landing`
Changes are committed locally. These changes have not been pushed or deployed during this work.

- Graphite-and-silver SaaS visual design, translucent cards, restrained blue accents, no arrows on buttons.
- Landing, Google signup/login UI, workspace, history, guide, and report pages.
- Public verified Google accounts accepted by the API; per-user report ownership remains enforced.
- Boarding-pass-style research report with expandable decision explanations.
- Simplified issue-link entry; removed numbered tutorial and fictional booking card from entry page.
- Real public GitHub issue calcom/cal.diy #30264 fetched and displayed at `/demo/issue` as a dated source snapshot.
- `/demo/report` remains a synthetic report layout, with complete/partial examples. It is not a live AI result.

## Resume with

1. Configure an Anthropic or Groq API key privately in a Git-ignored local environment file. Do not paste keys into chat or commit them.
2. Run the existing bounded research harness against https://github.com/calcom/cal.diy/issues/30264 with actual GitHub and model calls. A direct local harness test does not need Firebase or database setup; it does need a runner and model configuration.
3. Check the result and tool history before claiming live success or assigning evaluation scores.
4. Connect Firebase and database configuration for the complete browser signup and saved-report flow.

No model key was found in the process environment or local environment files in this checkout or the original Desktop IssueScout checkout. No live AI research has run in this work.

## Verification

Production build passed after the boarding-pass change. The later source-snapshot page passed TypeScript and targeted ESLint checks and was verified in the browser. Desktop and mobile report layouts, expandable reasons, and partial sample state were checked. Live authentication and live AI analysis remain unverified.

Local preview, when the development server is running: http://127.0.0.1:3015/
Page composition reference: `PAGE-COMPOSITION.md`.
