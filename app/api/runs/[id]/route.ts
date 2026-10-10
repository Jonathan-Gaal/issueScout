import { reports } from "../../../../lib/server/db/reports";
export { handlePreflight as OPTIONS } from "../../../../lib/server/cors";
// GET /api/runs/:id — TRD §3.2's per-resource endpoint. The IDOR-
// critical path: a run that doesn't exist OR exists but isn't the
// requester's returns the SAME response shape (not_found), via
// db.runs.getOwned's collapsed null return — never a response that
// hints "this exists but isn't yours."

import { NextResponse } from "next/server";
import { buildApiErrorBody, getErrorStatus } from "../../../../lib/server/errors";
import { isAllowlisted, verifySession } from "../../../../lib/server/auth";
import { buildCorsHeaders, buildCorsRejectedResponse, checkCorsOrigin } from "../../../../lib/server/cors";
import { runs } from "../../../../lib/server/db/runs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams): Promise<Response> {
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

  const { id } = await params;

  // The ownership check is the query predicate itself (db.runs.getOwned
  // filters on id AND user_id) — never an unscoped fetch followed by a
  // comparison. getOwned returns null for both "doesn't exist" and
  // "exists but belongs to someone else," so this handler cannot leak
  // the distinction even if it wanted to.
  try {
  const run = await runs.getOwned(id, identity.uid);
  if (!run) {
    return NextResponse.json(buildApiErrorBody("not_found"), {
      status: getErrorStatus("not_found"),
      headers: corsHeaders,
    });
  }

  const report = await reports.getOwned(id, identity.uid);
  return NextResponse.json({ run, report, actions: [] }, { status: 200, headers: corsHeaders });
  } catch { return NextResponse.json(buildApiErrorBody("write_failed"), { status: getErrorStatus("write_failed"), headers: corsHeaders }); }
}
