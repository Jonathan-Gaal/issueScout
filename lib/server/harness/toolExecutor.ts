// The model-facing github_issue_research tool definition + the function
// that executes a validated tool call against a GitHubClient, enforcing
// MAX_SEARCHES/MAX_CANDIDATE_READS per-run counters (TRD §3.3, §5).
//
// The tool schema below has NO owner/repo property at any nesting level
// — this is the schema-level half of "the model never supplies
// owner/repo" (lib/server/github/client.ts hardcodes it from
// config.approvedRepo; this file is the other half of that enforcement).

import { z } from "zod";
import { BackendFailure } from "../failure";
import type { GitHubClient } from "../github/types";
import type { ToolDefinition } from "../model/types";
import { config } from "../config";

/**
 * The one tool exposed to the model. Two operations, both read-only.
 * No write operation exists here in any phase (TRD §3.3).
 */
export const GITHUB_ISSUE_RESEARCH_TOOL: ToolDefinition = {
  name: "github_issue_research",
  description:
    "Read or search issues in the approved repository. Use operation='read' with an issue number to retrieve an issue and its comments, or operation='search' with a query string to find related issues.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["read", "search"],
        description: "Which action to perform: 'read' an issue by number, or 'search' issues by query text.",
      },
      issueNumber: {
        type: "number",
        description: "The issue number to read. Required when operation is 'read'.",
      },
      query: {
        type: "string",
        description: "The search query text. Required when operation is 'search'.",
      },
    },
    required: ["operation"],
  },
};

export interface ToolCallRequest {
  operation: "read" | "search";
  issueNumber?: number;
  query?: string;
}

export type ToolCallOutcome = "ok" | "error" | "refused";

export interface ToolCallResult {
  outcome: ToolCallOutcome;
  /** Short, plain text for the model — never a raw error (TRD §3.2/§8.2). */
  content: string;
  /** Present only after an issue and its comments are read, for the harness's own retrieval-tracking (spec 008). */
  retrievedIssueNumbers?: number[];
  /** Present only on a successful read, for the harness's own retrieval-tracking (spec 008). */
  retrievedUrl?: string;
  commentUrls?: string[];
}

/**
 * Per-run counters the harness (spec 008) owns and passes in by
 * reference across calls within one run. Mutated by executeToolCall.
 */
export interface ToolCallRunState {
  searchesRun: number;
  searchesFailed: number;
  candidatesRead: number;
  githubRateLimited: boolean;
  toolFailed?: boolean;
  commentsTruncated?: boolean;
}

export function createInitialToolCallRunState(): ToolCallRunState {
  return { searchesRun: 0, searchesFailed: 0, candidatesRead: 0, githubRateLimited: false };
}

/**
 * Executes one validated tool call. Refuses (outcome: "refused") rather
 * than throwing once a limit is hit — this is what lets the harness
 * tell the model "finish with what you have" instead of crashing the
 * run, and keeps a harness-side refusal distinguishable from a real
 * GitHub failure (outcome: "error"), which matters for
 * coverage.searchesFailed's accuracy (PRD §4 failure-transparency metric).
 */
export async function executeToolCall(
  request: unknown,
  githubClient: GitHubClient,
  inputIssueNumber: number,
  runState: ToolCallRunState
): Promise<ToolCallResult> {
  const parsed = ToolRequestSchema.safeParse(request);
  if (!parsed.success) return { outcome: "refused", content: "Invalid tool arguments." };
  if (runState.githubRateLimited) {
    return { outcome: "refused", content: "GitHub is rate-limited for the rest of this run." };
  }

  try {
    if (parsed.data.operation === "read") return await executeReadOperation(parsed.data, githubClient, runState);
    return await executeSearchOperation(parsed.data, githubClient, inputIssueNumber, runState);
  } catch (error) {
    runState.toolFailed = true;
    if (parsed.data.operation === "search") runState.searchesFailed += 1;
    if (error instanceof BackendFailure && error.code === "rate_limited") runState.githubRateLimited = true;
    return { outcome: "error", content: "The request failed; evidence is incomplete." };
  }
}

async function executeReadOperation(
  request: ToolCallRequest,
  githubClient: GitHubClient,
  runState: ToolCallRunState
): Promise<ToolCallResult> {
  if (request.issueNumber === undefined) {
    return { outcome: "error", content: "A read operation requires an issue number." };
  }

  if (runState.candidatesRead >= config.maxCandidateReads) {
    return {
      outcome: "refused",
      content: "The candidate-read limit for this run has been reached. Finish with what you have.",
    };
  }

  runState.candidatesRead += 1;
  const issueResult = await githubClient.getIssue(request.issueNumber);
  if ("notFound" in issueResult) {
    return { outcome: "error", content: "That issue could not be found." };
  }

  if (issueResult.body.length > config.issueMaxChars) throw new BackendFailure("issue_too_long");
  const comments = await githubClient.getComments(request.issueNumber, config.maxCommentsPerIssue);
  runState.commentsTruncated ||= comments.truncated;
  return {
    outcome: "ok",
    content: JSON.stringify({ issue: issueResult, ...comments }),
    retrievedIssueNumbers: [issueResult.number],
    commentUrls: comments.comments.map(c => c.url),
    retrievedUrl: issueResult.url,
  };
}

async function executeSearchOperation(
  request: ToolCallRequest,
  githubClient: GitHubClient,
  inputIssueNumber: number,
  runState: ToolCallRunState
): Promise<ToolCallResult> {
  if (!request.query) {
    return { outcome: "error", content: "A search operation requires a query string." };
  }

  if (runState.searchesRun >= config.maxSearches) {
    return {
      outcome: "refused",
      content: "The search limit for this run has been reached. Finish with what you have.",
    };
  }

  runState.searchesRun += 1;
  const searchResult = await githubClient.searchIssues(
    request.query,
    config.maxSearchResults,
    inputIssueNumber
  );

  if ("rateLimited" in searchResult) {
    runState.searchesFailed += 1;
    runState.githubRateLimited = true;
    return {
      outcome: "error",
      content: "GitHub's rate limit was reached. No further searches will run this session.",
    };
  }

  if ("error" in searchResult) {
    runState.searchesFailed += 1;
    return { outcome: "error", content: "The search could not be completed." };
  }

  return {
    outcome: "ok",
    content: JSON.stringify(searchResult),
  };
}

const ToolRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("read"), issueNumber: z.number().int().positive().safe() }).strict(),
  z.object({ operation: z.literal("search"), query: z.string().trim().min(1).max(300) }).strict(),
]);
