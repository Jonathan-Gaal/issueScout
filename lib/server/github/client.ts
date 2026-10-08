// Real GitHubClient implementation: native fetch + AbortController only
// (dependency-triage: a wrapper around a few authenticated GETs does
// not meet the bar for a library). Owner/repo are hardcoded from
// config.approvedRepo — callers never pass them (TRD §3.3, §5).

import { config } from "../config";
import type {
  GetCommentsResult,
  GetIssueNotFound,
  GitHubClient,
  GitHubComment,
  GitHubIssue,
  GitHubLabel,
  SearchCandidate,
  SearchError,
  SearchRateLimited,
} from "./types";

const GITHUB_API_BASE_URL = "https://api.github.com";

interface FetchJsonResult {
  ok: boolean;
  status: number;
  json: unknown;
}

/**
 * One GitHub REST call wrapped in AbortController with the configured
 * timeout. Retries exactly once, and only on a network-level failure
 * (timeout/connection reset) — never on an HTTP 4xx, which is a
 * validation/auth fact a retry cannot fix.
 */
async function fetchGitHubJson(path: string, searchParams?: URLSearchParams): Promise<FetchJsonResult> {
  const url = new URL(`${GITHUB_API_BASE_URL}${path}`);
  if (searchParams) {
    for (const [key, value] of searchParams) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (config.githubReadToken) {
    headers.Authorization = `Bearer ${config.githubReadToken}`;
  }

  let attempt = 0;
  const maxAttempts = 1 + config.maxRetriesPerRequest;

  while (attempt < maxAttempts) {
    attempt += 1;
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(
      () => abortController.abort(),
      config.requestTimeoutSeconds * 1000
    );

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: abortController.signal,
      });
      clearTimeout(timeoutHandle);

      let parsedJson: unknown;
      try {
        parsedJson = await response.json();
      } catch {
        // Malformed/non-JSON body — a typed error result, never an
        // uncaught exception bubbling as a raw stack trace (T8).
        return { ok: false, status: response.status, json: null };
      }

      return { ok: response.ok, status: response.status, json: parsedJson };
    } catch (networkError) {
      clearTimeout(timeoutHandle);
      const isLastAttempt = attempt >= maxAttempts;
      if (isLastAttempt) {
        throw networkError;
      }
      // One retry on network failure only; loop continues.
    }
  }

  // Unreachable in practice (the loop always returns or throws), but
  // keeps the function's return type total rather than relying on
  // control-flow analysis across the retry loop.
  throw new Error("fetchGitHubJson: exhausted retries without a response");
}

function isRateLimitStatus(status: number): boolean {
  return status === 403 || status === 429;
}

function isPullRequestItem(item: unknown): boolean {
  return (
    typeof item === "object" &&
    item !== null &&
    "pull_request" in item &&
    (item as { pull_request?: unknown }).pull_request !== undefined
  );
}

export class RestGitHubClient implements GitHubClient {
  async getIssue(number: number): Promise<GitHubIssue | GetIssueNotFound> {
    const { owner, repo } = this.getApprovedOwnerRepo();
    const result = await fetchGitHubJson(`/repos/${owner}/${repo}/issues/${number}`);

    if (result.status === 404) {
      return { notFound: true };
    }
    if (!result.ok || result.json === null || typeof result.json !== "object") {
      return { notFound: true };
    }

    const issueJson = result.json as Record<string, unknown>;
    const labels = Array.isArray(issueJson.labels)
      ? (issueJson.labels as Array<{ name?: string }>).map((label) => label.name ?? "").filter(Boolean)
      : [];

    return {
      number: Number(issueJson.number),
      title: String(issueJson.title ?? ""),
      body: String(issueJson.body ?? ""),
      state: String(issueJson.state ?? "unknown"),
      labels,
      url: String(issueJson.html_url ?? ""),
      createdAt: String(issueJson.created_at ?? ""),
      updatedAt: String(issueJson.updated_at ?? ""),
      retrievedAt: new Date().toISOString(),
    };
  }

  async getComments(number: number, max: number): Promise<GetCommentsResult> {
    const { owner, repo } = this.getApprovedOwnerRepo();
    const searchParams = new URLSearchParams({ per_page: String(max + 1) });
    const result = await fetchGitHubJson(`/repos/${owner}/${repo}/issues/${number}/comments`, searchParams);

    if (!result.ok || !Array.isArray(result.json)) {
      return { comments: [], truncated: false };
    }

    const rawComments = result.json as Array<Record<string, unknown>>;
    const truncated = rawComments.length > max;
    const comments: GitHubComment[] = rawComments.slice(0, max).map((commentJson) => ({
      body: String(commentJson.body ?? ""),
      url: String(commentJson.html_url ?? ""),
      createdAt: String(commentJson.created_at ?? ""),
    }));

    return { comments, truncated };
  }

  async getLabels(): Promise<GitHubLabel[]> {
    const { owner, repo } = this.getApprovedOwnerRepo();
    const result = await fetchGitHubJson(`/repos/${owner}/${repo}/labels`);

    if (!result.ok || !Array.isArray(result.json)) {
      return [];
    }

    return (result.json as Array<Record<string, unknown>>).map((labelJson) => ({
      name: String(labelJson.name ?? ""),
      description: labelJson.description === null || labelJson.description === undefined
        ? null
        : String(labelJson.description),
    }));
  }

  async searchIssues(
    query: string,
    maxResults: number,
    excludeIssueNumber: number
  ): Promise<SearchCandidate[] | SearchRateLimited | SearchError> {
    const { owner, repo } = this.getApprovedOwnerRepo();
    const searchParams = new URLSearchParams({
      q: `repo:${owner}/${repo} is:issue ${query}`,
      per_page: String(maxResults),
    });

    let result: FetchJsonResult;
    try {
      result = await fetchGitHubJson("/search/issues", searchParams);
    } catch {
      return { error: true };
    }

    if (isRateLimitStatus(result.status)) {
      return { rateLimited: true };
    }
    if (!result.ok || result.json === null || typeof result.json !== "object") {
      return { error: true };
    }

    const searchJson = result.json as { items?: unknown[] };
    const items = Array.isArray(searchJson.items) ? searchJson.items : [];

    return items
      .filter((item) => !isPullRequestItem(item))
      .map((item) => item as Record<string, unknown>)
      .filter((item) => Number(item.number) !== excludeIssueNumber)
      .slice(0, maxResults)
      .map((item) => ({
        number: Number(item.number),
        title: String(item.title ?? ""),
        excerpt: String(item.body ?? "").slice(0, 280),
        state: String(item.state ?? "unknown"),
        url: String(item.html_url ?? ""),
      }));
  }

  private getApprovedOwnerRepo(): { owner: string; repo: string } {
    const [owner, repo] = config.approvedRepo.split("/");
    return { owner, repo };
  }
}
