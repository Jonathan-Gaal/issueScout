// POST /api/runs, GET /api/runs?limit= — TRD §3.2's active Phase-1
// collection endpoints. Thin handlers: CORS check -> two-check auth ->
// input validation -> delegate to runHarness/db -> map to HTTP
// response. Auth is checked before input validation (edge case per
// spec 013: an unauthenticated malformed request gets `unauthorized`,
// never a leaked `invalid_url` detail).

import { NextResponse } from "next/server";
import { z } from "zod";
import { buildApiErrorBody, getErrorStatus } from "../../../lib/server/errors";
import { isAllowlisted, verifySession } from "../../../lib/server/auth";
import { buildCorsHeaders, buildCorsRejectedResponse, checkCorsOrigin } from "../../../lib/server/cors";
import { runs } from "../../../lib/server/db/runs";
import { runHarness } from "../../../lib/server/harness/runHarness";
import { RestGitHubClient } from "../../../lib/server/github/client";
import { getModelProvider } from "../../../lib/server/model";

const DEFAULT_RUNS_LIST_LIMIT = 20;

const CreateRunRequestBodySchema = z.object({ issueUrl: z.string() }).strict();

export async function POST(req: Request): Promise<Response> {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return buildCorsRejectedResponse();
  }
  const corsHeaders = buildCorsHeaders(corsCheck.origin as string);

  const identity = await verifySession(req);
  if (!identity || !isAllowlisted(identity.email)) {
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

  const harnessResult = await runHarness(
    { issueUrl: parsedBody.data.issueUrl, userId: identity.uid },
    {
      githubClient: new RestGitHubClient(),
      modelProvider: getModelProvider(),
      countRunsInLastHour: runs.countInLastHour,
    }
  );

  if (harnessResult.status === "failed") {
    const errorCode = harnessResult.errorCode ?? "github_error";
    return NextResponse.json(buildApiErrorBody(errorCode), {
      status: getErrorStatus(errorCode),
      headers: corsHeaders,
    });
  }

  return NextResponse.json(
    { runId: crypto.randomUUID(), status: harnessResult.status, report: harnessResult.report },
    { status: 200, headers: corsHeaders }
  );
}

export async function GET(req: Request): Promise<Response> {
  const corsCheck = checkCorsOrigin(req);
  if (!corsCheck.allowed) {
    return buildCorsRejectedResponse();
  }
  const corsHeaders = buildCorsHeaders(corsCheck.origin as string);

  const identity = await verifySession(req);
  if (!identity || !isAllowlisted(identity.email)) {
    return NextResponse.json(buildApiErrorBody("unauthorized"), {
      status: getErrorStatus("unauthorized"),
      headers: corsHeaders,
    });
  }

  const requestUrl = new URL(req.url);
  const limitParam = requestUrl.searchParams.get("limit");
  const parsedLimit = limitParam ? Number(limitParam) : DEFAULT_RUNS_LIST_LIMIT;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_RUNS_LIST_LIMIT;

  const userRuns = await runs.list(identity.uid, limit);
  return NextResponse.json({ runs: userRuns }, { status: 200, headers: corsHeaders });
}
