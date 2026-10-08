// ErrorCode -> HTTP status + plain-language message map. This is the
// single place every error-producing code path draws its user-facing
// message from, so "never a raw error" (TRD §3.2) is mechanically
// enforced rather than a convention every route handler has to remember.

import type { ApiErrorBody, ErrorCode } from "../contract";

interface ErrorDescriptor {
  status: number;
  message: string;
}

// `satisfies Record<ErrorCode, ErrorDescriptor>` makes a missing entry
// a compile-time error, not a runtime surprise on first use of an
// uncovered code (spec 002 Edge Cases).
const ERROR_DESCRIPTORS = {
  invalid_url: {
    status: 400,
    message: "That does not look like a GitHub issue URL. Please check the link and try again.",
  },
  repo_not_allowed: {
    status: 400,
    message: "This tool only triages issues in the approved repository.",
  },
  is_pull_request: {
    status: 400,
    message: "That link points to a pull request, not an issue. Please provide an issue URL.",
  },
  not_found: {
    status: 404,
    message: "We could not find that issue or run.",
  },
  issue_too_long: {
    status: 400,
    message: "This issue is too long to process. Please choose a shorter issue.",
  },
  rate_limited: {
    status: 429,
    message: "GitHub rate limit was reached during this run. Please try again later.",
  },
  timeout: {
    status: 504,
    message: "The request took too long to complete. Please try again.",
  },
  github_error: {
    status: 502,
    message: "We could not reach GitHub right now. Please try again later.",
  },
  model_output_invalid: {
    status: 502,
    message: "The assistant could not produce a valid report for this issue. Please try again.",
  },
  turn_limit: {
    status: 200,
    message: "The run stopped after reaching its step limit. The report below is partial.",
  },
  time_limit: {
    status: 200,
    message: "The run stopped after reaching its time limit. The report below is partial.",
  },
  unauthorized: {
    status: 401,
    message: "You are not signed in or not authorized to use this app.",
  },
  run_rate_limited: {
    status: 429,
    message: "You have reached the hourly limit for runs. Please try again later.",
  },
  write_failed: {
    status: 502,
    message: "We could not save that change. Please try again.",
  },
} satisfies Record<ErrorCode, ErrorDescriptor>;

/** Look up the fixed status + plain message for a given error code. */
export function getErrorDescriptor(code: ErrorCode): ErrorDescriptor {
  return ERROR_DESCRIPTORS[code];
}

/** Build the full `{ error: { code, message } }` response body (TRD §3.2 error shape). */
export function buildApiErrorBody(code: ErrorCode): ApiErrorBody {
  return { error: { code, message: getErrorDescriptor(code).message } };
}

/** Convenience: the HTTP status to respond with for a given error code. */
export function getErrorStatus(code: ErrorCode): number {
  return getErrorDescriptor(code).status;
}
