// GitHub-facing types + the GitHubClient interface (TRD §3.3). The
// interface exists so a fake implementation can back harness tests
// without a real network call (spec 008/014's test-mocking seam).

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
  retrievedAt: string;
}

export interface GitHubComment {
  body: string;
  url: string;
  createdAt: string;
}

export interface GitHubLabel {
  name: string;
  description: string | null;
}

export interface SearchCandidate {
  number: number;
  title: string;
  excerpt: string;
  state: string;
  url: string;
}

export interface GetIssueNotFound {
  notFound: true;
}

export interface GetCommentsResult {
  comments: GitHubComment[];
  truncated: boolean;
}

export interface SearchRateLimited {
  rateLimited: true;
}

export interface SearchError {
  error: true;
}

/**
 * The harness's only path to GitHub. All four operations are read-only;
 * no write operation exists on this interface in any phase (TRD §3.3).
 * Implementations bind owner/repo once at construction, from the
 * validated input URL — callers never pass owner/repo per call, which
 * is the architectural half of "the model never supplies owner/repo"
 * (spec 007 enforces the other half at the
 * tool-schema level).
 */
export interface GitHubClient {
  getIssue(number: number, signal?: AbortSignal): Promise<GitHubIssue | GetIssueNotFound>;
  getComments(number: number, max: number, signal?: AbortSignal): Promise<GetCommentsResult>;
  getLabels(signal?: AbortSignal): Promise<GitHubLabel[]>;
  searchIssues(
    query: string,
    maxResults: number,
    excludeIssueNumber: number,
    signal?: AbortSignal
  ): Promise<SearchCandidate[] | SearchRateLimited | SearchError>;
}
