// Shared contract types — lifted verbatim from TRD.md §3.1 and §3.2.
// These types are the fixed boundary between backend and frontend (and
// between the harness and the model). Do not change without both
// owners' agreement per Build Spec §0.

export type Category =
  | "bug_report"
  | "feature_request"
  | "question"
  | "needs_clarification";

export type Priority =
  | "high"
  | "medium"
  | "low"
  | "needs_review"
  | "not_assigned";

export type Assessment = "possible_duplicate" | "related" | "unlikely_match";

export type ProposedAction =
  | { kind: "add_labels"; labels: string[] }
  | { kind: "post_comment"; body: string };

/**
 * The structure the model must return. Validated against the zod schema
 * in lib/server/schemas/modelReport.ts (spec 004) before being accepted.
 */
export interface ModelReport {
  summary: string; // at most three sentences
  category: Category;
  categoryReason: string;
  priority: Priority; // "not_assigned" for feature_request and question
  priorityEvidence: string;
  priorityUncertainty: string;
  suggestedLabels: { name: string; reason: string }[]; // names from the repo's real label list only
  evidence: { observation: string; sourceUrl: string }[];
  missingInformation: string[];
  relatedIssues: {
    // at most three
    number: number;
    title: string;
    url: string;
    similarities: string;
    differences: string;
    assessment: Assessment;
  }[];
  recommendedNextStep: string;
  proposedActions: ProposedAction[]; // Phase 2 shape; MUST be [] in every Phase 1 report, harness-forced
  containsEmbeddedInstructions: boolean;
  limitations: string[];
}

export type StopReason =
  | "completed"
  | "search_limit"
  | "read_limit"
  | "turn_limit"
  | "time_limit"
  | "tool_failure";

/**
 * The full report returned by the harness: ModelReport plus fields the
 * harness computes itself. The model never writes `issue` or `coverage` —
 * those are harness-authoritative (TRD §3.1 "Phase-1 invariant").
 */
export interface Report extends ModelReport {
  issue: {
    number: number;
    title: string;
    url: string;
    state: string;
    retrievedAt: string;
  };
  coverage: {
    // written by the harness, NEVER by the model
    searchesRun: number;
    searchesFailed: number;
    candidatesRead: number;
    commentsTruncated: boolean;
    stopReason: StopReason;
    removedByValidation: string[]; // items dropped in harness validation step
  };
}

/**
 * Every error code the backend can return, per TRD §3.2 / Build Spec §6.
 * This is the authoritative union — lib/server/errors.ts must provide a
 * mapping entry for every member, enforced via `satisfies Record<ErrorCode, ...>`.
 */
export type ErrorCode =
  | "invalid_url"
  | "repo_not_allowed"
  | "is_pull_request"
  | "not_found"
  | "issue_too_long"
  | "rate_limited"
  | "timeout"
  | "github_error"
  | "model_output_invalid"
  | "turn_limit"
  | "time_limit"
  | "unauthorized"
  | "run_rate_limited"
  | "write_failed";

/** The error shape returned by every endpoint, every phase (TRD §3.2). */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}
