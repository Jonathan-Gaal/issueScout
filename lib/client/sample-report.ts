import type { Report } from "../contract";

/** Synthetic walkthrough content. This is not a saved run or a real issue assessment. */
export const sampleReport: Report = {
  issue: {
    number: 42,
    title: "Booking confirmation shows a different time",
    url: "",
    state: "open (illustrative)",
    retrievedAt: "",
  },
  summary: "In this fictional example, a customer selects 11:00 AM but receives a confirmation showing 10:00 AM. A timezone mismatch could explain the difference, but the report does not establish a cause.",
  category: "bug_report",
  categoryReason: "The reporter describes an unexpected result in an existing booking flow, rather than requesting a new feature.",
  priority: "needs_review",
  priorityEvidence: "The incorrect time may affect whether the customer attends the appointment. The number of affected customers is unknown.",
  priorityUncertainty: "We do not know whether the stored appointment is wrong or only its displayed time, or whether this affects more than one customer.",
  suggestedLabels: [{ name: "bug", reason: "A proposed label in this fictional repository. Live reports use only labels retrieved from the approved repository." }],
  evidence: [{ observation: "The fictional reporter states: ‘I booked for 11 AM, but the confirmation email says 10 AM.’ A live report links each observation to a GitHub source.", sourceUrl: "" }],
  missingInformation: ["The customer’s timezone and the booking page’s timezone.", "The selected date and a screenshot of the confirmation, with personal information removed.", "Steps to reproduce and whether the calendar event also has the wrong time."],
  relatedIssues: [],
  recommendedNextStep: "Ask the reporter for timezone details and a redacted screenshot. Compare the confirmation with the stored appointment before changing the issue’s priority.",
  proposedActions: [],
  containsEmbeddedInstructions: false,
  limitations: ["This is synthetic sample content, not a live analysis.", "The cause and customer impact have not been verified.", "The coverage counts below are illustrative and were not produced by a live run."],
  coverage: { searchesRun: 2, searchesFailed: 0, candidatesRead: 3, commentsTruncated: false, stopReason: "completed", removedByValidation: [] },
};
