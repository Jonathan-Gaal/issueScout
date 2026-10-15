import { config } from "../../../lib/server/config";
import { parseIssueUrl } from "../../../lib/server/github/urlParsing";
import { logRunEvent } from "../../../lib/server/logger";
export { handlePreflight as OPTIONS } from "../../../lib/server/cors";
// POST /api/runs, GET /api/runs?limit= — TRD §3.2's active Phase-1
// collection endpoints. Thin handlers: CORS check -> two-check auth ->
// input validation -> delegate to runHarness/db -> map to HTTP
// response. Auth is checked before input validation (edge case per
// spec 013: an unauthenticated malformed request gets `unauthorized`,
// never a leaked `invalid_url` detail).

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildApiErrorBody, getErrorStatus } from "../../../lib/server/errors";
import { verifySession, isAllowlisted } from "../../../lib/server/auth";
import { buildCorsHeaders, buildCorsRejectedResponse, checkCorsOrigin } from "../../../lib/server/cors";
import { runs } from "../../../lib/server/db/runs";
import { runHarness } from "../../../lib/server/harness/runHarness";
import { RestGitHubClient } from "../../../lib/server/github/client";
import { getModelProvider } from "../../../lib/server/model";

const DEFAULT_RUNS_LIST_LIMIT = 20;

const CreateRunRequestBodySchema = z.object({ issueUrl: z.string().max(2048) }).strict();

export async function POST(req: Request): Promise<Response> {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return buildCorsRejectedResponse();
  }
  const corsHeaders = buildCorsHeaders(corsCheck.origin as string);

  const identity = await verifySession(req);
  if (!identity) {
    return NextResponse.json(buildApiErrorBody("unauthorized"), {
      status: getErrorStatus("unauthorized"),
      headers: corsHeaders,
    });
  }
  if (!isAllowlisted(identity.email)) {
    return NextResponse.json(buildApiErrorBody("unauthorized"), {
      status: getErrorStatus("unauthorized"),
      headers: corsHeaders,
    });
  }

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json(buildApiErrorBody("invalid_url"), {
      status: getErrorStatus("invalid_url"),
      headers: corsHeaders,
    });
  }

  const parsedBody = CreateRunRequestBodySchema.safeParse(requestBody);
  if (!parsedBody.success) {
    return NextResponse.json(buildApiErrorBody("invalid_url"), {
      status: getErrorStatus("invalid_url"),
      headers: corsHeaders,
    });
  }

  const parsedUrl = parseIssueUrl(parsedBody.data.issueUrl, config.approvedRepo);
  if (!parsedUrl.ok) return NextResponse.json(buildApiErrorBody(parsedUrl.code), { status: getErrorStatus(parsedUrl.code), headers: corsHeaders });
  // Store a canonical URL, not arbitrary query parameters/fragments supplied by the caller.
  const issueUrl = `https://github.com/${config.approvedRepo}/issues/${parsedUrl.value.number}`;
  let runId: string | undefined;
  const startedAt = Date.now();
  try {
    const run = await runs.admit({ userId: identity.uid, issueUrl }, config.runsPerUserPerHour);
    if (!run) return NextResponse.json(buildApiErrorBody("run_rate_limited"), { status: getErrorStatus("run_rate_limited"), headers: corsHeaders });
    runId = run.id;
    logRunEvent(runId, "run_started");
    const harnessResult = await runHarness({ issueUrl, userId: identity.uid }, {
      githubClient: new RestGitHubClient(), modelProvider: getModelProvider(),
      // Admission has already atomically reserved this run against the limit.
      countRunsInLastHour: async () => 0,
      persistRun: async outcome => {
        for (const call of outcome.toolCalls) logRunEvent(run.id, "tool_call", { operation: call.operation, outcome: call.outcome });
        await runs.finish(run.id, identity.uid, config.approvedRepo, outcome, Date.now() - startedAt);
      },
    });
    logRunEvent(runId, `run_${harnessResult.status}`, { durationMs: Date.now() - startedAt, errorCode: harnessResult.errorCode });
    if (harnessResult.status === "failed") {
      const code = harnessResult.errorCode ?? "github_error";
      if (code === "write_failed") {
        try { await runs.finish(run.id, identity.uid, config.approvedRepo, { status: "failed", errorCode: code, toolCalls: [] }, Date.now() - startedAt); } catch { /* Do not return a false success. */ }
      }
      return NextResponse.json(buildApiErrorBody(code), { status: getErrorStatus(code), headers: corsHeaders });
    }
    return NextResponse.json({ runId, status: harnessResult.status, report: harnessResult.report }, { status: 200, headers: corsHeaders });
  } catch {
    if (runId) {
      try { await runs.finish(runId, identity.uid, config.approvedRepo, { status: "failed", errorCode: "write_failed", toolCalls: [] }, Date.now() - startedAt); } catch { /* Database unavailable: never claim persistence succeeded. */ }
      logRunEvent(runId, "run_failed", { errorCode: "write_failed" });
    }
    return NextResponse.json(buildApiErrorBody("write_failed"), { status: getErrorStatus("write_failed"), headers: corsHeaders });
  }
}

export async function GET(req: Request): Promise<Response> {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return buildCorsRejectedResponse();
  }
  const corsHeaders = buildCorsHeaders(corsCheck.origin as string);

  const identity = await verifySession(req);
  if (!identity) {
    return NextResponse.json(buildApiErrorBody("unauthorized"), {
      status: getErrorStatus("unauthorized"),
      headers: corsHeaders,
    });
  }
  if (!isAllowlisted(identity.email)) {
    return NextResponse.json(buildApiErrorBody("unauthorized"), {
      status: getErrorStatus("unauthorized"),
      headers: corsHeaders,
    });
  }

  const requestUrl = new URL(req.url);
  const limitParam = requestUrl.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : DEFAULT_RUNS_LIST_LIMIT;
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : DEFAULT_RUNS_LIST_LIMIT;

  try {
    const userRuns = await runs.list(identity.uid, limit);
    return NextResponse.json({ runs: userRuns }, { status: 200, headers: corsHeaders });
  } catch { return NextResponse.json(buildApiErrorBody("write_failed"), { status: getErrorStatus("write_failed"), headers: corsHeaders }); }
}
