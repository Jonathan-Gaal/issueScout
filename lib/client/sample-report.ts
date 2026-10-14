import type { Report } from "../contract";

/** Synthetic walkthrough content. This is not a saved run or a real issue assessment. */
export const sampleReport: Report = {
  issue: {
    number: 128,
    title: "Booking confirmation email shows the wrong time",
    url: "",
    state: "open (illustrative)",
    retrievedAt: "",
  },
  summary: "In this fictional example, a customer books a piano lesson for 3:00 PM but receives a confirmation showing 2:00 PM. A timezone mismatch could explain the difference, but the report does not establish a cause.",
  category: "bug_report",
  categoryReason: "The reporter describes an unexpected result in an existing booking flow, rather than requesting a new feature.",
  priority: "needs_review",
  priorityEvidence: "The incorrect time may affect whether the customer attends the appointment. The number of affected customers is unknown.",
  priorityUncertainty: "We do not know whether the stored appointment is wrong or only its displayed time, or whether this affects more than one customer.",
  suggestedLabels: [{ name: "bug", reason: "The confirmation differs from the selected booking time." }, { name: "booking", reason: "The reported problem occurs in the booking confirmation flow." }, { name: "timezone", reason: "A timezone mismatch is a possible cause, not a verified diagnosis." }],
  evidence: [{ observation: "The fictional reporter states: ‘I booked a piano lesson for 3:00 PM, but the confirmation email says 2:00 PM. The booking page still shows 3:00 PM.’ A live report links each observation to a GitHub source.", sourceUrl: "" }],
  missingInformation: ["Booking date.", "Customer timezone.", "Teacher timezone."],
  relatedIssues: [],
  recommendedNextStep: "Compare the booking’s timezone with the email’s timezone. Confirm the customer and teacher timezones before deciding whether either displayed time is wrong.",
  proposedActions: [],
  containsEmbeddedInstructions: false,
  limitations: ["This is synthetic sample content, not a live analysis.", "The cause and customer impact have not been verified.", "The coverage counts below are illustrative and were not produced by a live run."],
  coverage: { searchesRun: 2, searchesFailed: 0, candidatesRead: 3, commentsTruncated: false, stopReason: "completed", removedByValidation: [] },
};

/** Original synthetic issue, shown beside the prepared report for frontend design. */
export const sampleIssue = {
  comparison: { before: "3:00 PM", after: "2:00 PM", beforeLabel: "Booking page", afterLabel: "Confirmation email", caption: "Two different times for the same piano lesson. The cause is not confirmed." },
  description: "I booked a piano lesson for 3:00 PM, but the confirmation email says 2:00 PM. The booking page still shows 3:00 PM.",
  steps: ["Choose a piano lesson.", "Select 3:00 PM and confirm the booking.", "Open the confirmation email."],
  expected: "The booking page and confirmation email both show 3:00 PM.",
  actual: "The confirmation email shows 2:00 PM.",
};
