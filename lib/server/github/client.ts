// All requests are read-only and pinned to the repo bound at construction.
import { z } from "zod";
import { config } from "../config";
import { BackendFailure } from "../failure";
import { parseIssueUrl } from "./urlParsing";
import type { GitHubClient, GitHubIssue, GetIssueNotFound, GetCommentsResult, GitHubLabel, SearchCandidate, SearchError, SearchRateLimited } from "./types";

const candidateSchema = z.object({ number: z.number().int().positive().safe(), title: z.string(), body: z.string().nullable().optional(), state: z.enum(["open", "closed"]), html_url: z.string() });
const issueSchema = candidateSchema.extend({ created_at: z.string(), updated_at: z.string(), labels: z.array(z.object({ name: z.string() })) });
const commentSchema = z.object({ body: z.string(), html_url: z.string(), created_at: z.string() });
const labelSchema = z.object({ name: z.string(), description: z.string().nullable().optional() });

function checkNumber(number: number) {
  if (!Number.isSafeInteger(number) || number < 1) throw new BackendFailure("invalid_url");
}
async function getJson(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<{ status: number; json: unknown }> {
  const url = new URL(`https://api.github.com${path}`);
  if (params) url.search = params.toString();
  for (let attempt = 0; attempt <= config.maxRetriesPerRequest; attempt++) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeoutSeconds * 1000);
    try {
      const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", ...(config.githubReadToken ? { Authorization: `Bearer ${config.githubReadToken}` } : {}) }, signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal });
      // Keep the deadline alive until the body is read, too.
      const json: unknown = await response.json();
      const message = typeof json === "object" && json !== null && "message" in json ? String(json.message) : "";
      if (response.status === 429 || (response.status === 403 && (response.headers.get("x-ratelimit-remaining") === "0" || response.headers.has("retry-after") || /rate limit/i.test(message)))) throw new BackendFailure("rate_limited");
      if (!response.ok && response.status !== 404) throw new BackendFailure("github_error");
      return { status: response.status, json };
    } catch (error) {
      if (error instanceof BackendFailure) throw error;
      if (signal?.aborted || controller.signal.aborted) throw new BackendFailure("timeout");
      if (error instanceof SyntaxError || attempt === config.maxRetriesPerRequest) throw new BackendFailure("github_error");
    } finally { clearTimeout(timer); }
  }
  throw new BackendFailure("github_error");
}
export class RestGitHubClient implements GitHubClient {
  constructor(private readonly repo: string) {}

  private checkIssueUrl(url: string, number: number) {
    const parsed = parseIssueUrl(url);
    if (!parsed.ok || parsed.value.number !== number) throw new BackendFailure("github_error");
    if (`${parsed.value.owner}/${parsed.value.repo}`.toLowerCase() !== this.repo.toLowerCase()) {
      throw new BackendFailure("github_error");
    }
  }

  async getIssue(number: number, signal?: AbortSignal): Promise<GitHubIssue | GetIssueNotFound> {
    checkNumber(number);
    const result = await getJson(`/repos/${this.repo}/issues/${number}`, undefined, signal);
    if (result.status === 404) return { notFound: true };
    if (typeof result.json === "object" && result.json !== null && "pull_request" in result.json) throw new BackendFailure("is_pull_request");
    const parsed = issueSchema.safeParse(result.json);
    if (!parsed.success || parsed.data.number !== number) throw new BackendFailure("github_error");
    const issue = parsed.data;
    this.checkIssueUrl(issue.html_url, number);
    return { number, title: issue.title, body: issue.body ?? "", state: issue.state, labels: issue.labels.map(l => l.name), url: issue.html_url, createdAt: issue.created_at, updatedAt: issue.updated_at, retrievedAt: new Date().toISOString() };
  }
  async getComments(number: number, max: number, signal?: AbortSignal): Promise<GetCommentsResult> {
    checkNumber(number);
    const result = await getJson(`/repos/${this.repo}/issues/${number}/comments`, new URLSearchParams({ per_page: String(max + 1) }), signal);
    const parsed = z.array(commentSchema).safeParse(result.json);
    if (result.status !== 200 || !parsed.success) throw new BackendFailure("github_error");
    for (const comment of parsed.data) this.checkIssueUrl(comment.html_url, number);
    // Do not silently cut a comment's text; stop rather than claim complete evidence.
    if (parsed.data.some(c => c.body.length > config.issueMaxChars)) throw new BackendFailure("issue_too_long");
    return { comments: parsed.data.slice(0, max).map(c => ({ body: c.body, url: c.html_url, createdAt: c.created_at })), truncated: parsed.data.length > max };
  }
  async getLabels(signal?: AbortSignal): Promise<GitHubLabel[]> {
    const labels: GitHubLabel[] = [];
    // Bounded pagination: fail visibly if the full vocabulary exceeds this budget.
    for (let page = 1; page <= 10; page++) {
      const result = await getJson(`/repos/${this.repo}/labels`, new URLSearchParams({ per_page: "100", page: String(page) }), signal);
      const parsed = z.array(labelSchema).safeParse(result.json);
      if (result.status !== 200 || !parsed.success) throw new BackendFailure("github_error");
      labels.push(...parsed.data.map(l => ({ name: l.name, description: l.description ?? null })));
      if (parsed.data.length < 100) return labels;
    }
    throw new BackendFailure("github_error");
  }
  async searchIssues(query: string, maxResults: number, excludeIssueNumber: number, signal?: AbortSignal): Promise<SearchCandidate[] | SearchError | SearchRateLimited> {
    // Model text cannot replace the scope or inject Boolean query operators.
    if (!query.trim() || query.length > 300 || /(?:repo|org|user|is|type):|\b(?:OR|NOT)\b/i.test(query)) return { error: true };
    try {
      const result = await getJson("/search/issues", new URLSearchParams({ q: `repo:${this.repo} is:issue ${query}`, per_page: String(maxResults) }), signal);
      const parsed = z.object({ items: z.array(z.unknown()), incomplete_results: z.boolean().optional() }).safeParse(result.json);
      if (result.status !== 200 || !parsed.success || parsed.data.incomplete_results) return { error: true };
      const candidates: SearchCandidate[] = [];
      for (const item of parsed.data.items) {
        if (typeof item === "object" && item !== null && "pull_request" in item) continue;
        const candidate = candidateSchema.safeParse(item);
        if (!candidate.success) return { error: true };
        const c = candidate.data;
        this.checkIssueUrl(c.html_url, c.number);
        if (c.number !== excludeIssueNumber) candidates.push({ number: c.number, title: c.title, excerpt: (c.body ?? "").slice(0, 280), state: c.state, url: c.html_url });
      }
      return candidates.slice(0, maxResults);
    } catch (error) {
      if (signal?.aborted) throw error;
      return error instanceof BackendFailure && error.code === "rate_limited" ? { rateLimited: true } : { error: true };
    }
  }
}
