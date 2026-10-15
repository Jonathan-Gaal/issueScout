import type { Report } from "../contract";
// Saved live output revalidated with the effort-label guard. Original trace retained.
export const recordedReport: Report = {
  "summary": "The reporter describes a URL-encoding bug in add-to-calendar links where event names containing reserved characters like `&`, `#`, `+`, and `=` are truncated. The reporter identifies the affected code in `packages/features/bookings/lib/getCalendarLinks.ts` and reports that a unit test demonstrates the problem and validates that applying `encodeURIComponent` fixes it. A commenter reports that PR #30289 has been opened with a fix and unit tests.",
  "category": "bug_report",
  "categoryReason": "The reporter describes a functional defect with specific symptoms (event name truncation), reproduction steps, affected code locations, and reports having written a failing unit test that demonstrates the issue.",
  "priority": "medium",
  "priorityEvidence": "The reporter describes a functional impairment affecting add-to-calendar links when event names contain special characters. The issue impacts a specific workflow (adding events to calendar with certain characters in the name) but does not block all booking functionality. The reporter identifies the specific functions and reports that other fields (description, location) are already correctly encoded, suggesting a localized fix area.",
  "priorityUncertainty": "The actual frequency of event names containing these special characters is unknown. The reporter provides clear reproduction steps and technical analysis including the specific code location and a proposed solution, but IssueScout has not verified the bug in a live environment or inspected the proposed fix in PR #30289.",
  "suggestedLabels": [
    {
      "name": "🐛 bug",
      "reason": "The reporter describes a functional defect where add-to-calendar links fail to properly encode event names containing reserved URL characters, causing truncation."
    },
    {
      "name": "bookings",
      "reason": "The reporter states the issue occurs on the booking success page when generating add-to-calendar links after booking an event."
    }
  ],
  "evidence": [
    {
      "observation": "The reporter describes that add-to-calendar links do not URI-encode event names for Google Calendar and Microsoft Office, and use `encodeURI` (which preserves reserved characters) instead of `encodeURIComponent` for Microsoft Outlook.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264"
    },
    {
      "observation": "The reporter provides reproduction steps: create an event type with name `Q&A #1` and description containing `a&b=c`, book the event, then select Google Calendar, Microsoft Office, or Microsoft Outlook.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264"
    },
    {
      "observation": "The reporter claims the Google Calendar link contains `text=Q&A #1`, causing the title to be truncated to `Q` with `A` becoming a separate unknown parameter.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264"
    },
    {
      "observation": "The reporter identifies the affected code as `packages/features/bookings/lib/getCalendarLinks.ts`, specifically functions `buildGoogleCalendarLink`, `buildMicrosoftOfficeLink`, and `buildMicrosoftOutlookLink`.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264"
    },
    {
      "observation": "The reporter states that description and location are already correctly encoded with `encodeURIComponent` in the Google Calendar and Microsoft Office links.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264"
    },
    {
      "observation": "The reporter claims to have written a unit test that parses each generated link with `URLSearchParams`, which fails on current `main` for the event name `Q&A #1 + 100% é` and passes with `encodeURIComponent` applied.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264"
    },
    {
      "observation": "A commenter reports that PR #30289 has been opened with the fix and accompanying unit tests verifying special character and URL encoding across Google, Office, and Outlook.",
      "sourceUrl": "https://github.com/calcom/cal.diy/issues/30264#issuecomment-5981767531"
    }
  ],
  "missingInformation": [
    "What version or commit of the codebase exhibits this bug?",
    "Has the bug been independently reproduced by anyone other than the reporter?",
    "Are there any existing workarounds for users encountering this issue?"
  ],
  "relatedIssues": [],
  "recommendedNextStep": "Review PR #30289 to verify that it correctly applies `encodeURIComponent` to event names in the affected calendar link functions, confirm the unit tests cover the reported special characters (`&`, `#`, `+`, `=`), and validate that the fix does not introduce regressions in other calendar integrations.",
  "proposedActions": [],
  "containsEmbeddedInstructions": false,
  "limitations": [
    "IssueScout retrieved the issue and 3 comments. No truncation occurred.",
    "Three searches were performed for related issues: 'calendar links encode special characters &', 'add to calendar event name truncate', and 'getCalendarLinks Google Calendar Outlook encodeURIComponent'. All searches returned zero results. No duplicate or related issues were identified within the completed search coverage.",
    "IssueScout did not inspect the pull request or verify its status, code changes, or tests. The presence of PR #30289 and its claimed contents are based solely on a comment report.",
    "IssueScout has not run the reporter's unit test, reproduced the bug in a live environment, or verified that `encodeURIComponent` fully resolves the issue across all affected calendar providers.",
    "Effort-based label suggestions were withheld: IssueScout has not inspected the implementation or verified how much work the fix requires."
  ],
  "issue": {
    "number": 30264,
    "title": "Add-to-calendar links truncate event names containing & or #",
    "url": "https://github.com/calcom/cal.diy/issues/30264",
    "state": "open",
    "retrievedAt": "2026-10-15T18:51:16.667Z"
  },
  "coverage": {
    "searchesRun": 3,
    "searchesFailed": 0,
    "candidatesRead": 1,
    "commentsTruncated": false,
    "stopReason": "completed",
    "removedByValidation": [
      "unsupportedEffortLabel:⚡ Quick Wins"
    ]
  }
};
