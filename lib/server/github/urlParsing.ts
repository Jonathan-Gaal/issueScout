// Pure URL-parsing: classifies a submitted issueUrl before any
// model/GitHub call (Build Spec §8.1 step 1). No I/O here — fully
// covered by unit tests with no mocking needed.

import type { ErrorCode } from "../../contract";

export interface ParsedIssueUrl {
  owner: string;
  repo: string;
  number: number;
}

export type UrlParseResult =
  | { ok: true; value: ParsedIssueUrl }
  | { ok: false; code: Extract<ErrorCode, "invalid_url" | "repo_not_allowed" | "is_pull_request"> };

const GITHUB_ISSUE_URL_PATTERN =
  /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(issues|pull)\/(\d+)\/?(?:[?#].*)?$/i;

/**
 * Parses and classifies a GitHub issue URL against the approved repo.
 * Returns a typed result rather than throwing — every branch is a
 * tested, expected outcome (valid, wrong-repo, is-a-PR, malformed),
 * never an exception for the caller to catch.
 */
export function parseIssueUrl(rawUrl: string, approvedRepo: string): UrlParseResult {
  if (typeof rawUrl !== "string" || rawUrl.trim().length === 0) {
    return { ok: false, code: "invalid_url" };
  }

  const match = GITHUB_ISSUE_URL_PATTERN.exec(rawUrl.trim());
  if (!match) {
    return { ok: false, code: "invalid_url" };
  }

  const [, owner, repo, urlKind, numberText] = match;
  const number = Number(numberText);
  if (!Number.isSafeInteger(number) || number <= 0) {
    return { ok: false, code: "invalid_url" };
  }

  const candidateRepo = `${owner}/${repo}`;
  if (candidateRepo.toLowerCase() !== approvedRepo.toLowerCase()) {
    return { ok: false, code: "repo_not_allowed" };
  }

  if (urlKind.toLowerCase() === "pull") {
    return { ok: false, code: "is_pull_request" };
  }

  return { ok: true, value: { owner, repo, number } };
}
