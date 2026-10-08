// Shared CORS-check helper, called identically by every route handler
// (PRD §9 finding #5, US-6) — non-wildcard explicit allowlist, checked
// against the request Origin on every request. Written once here so
// "strict, every request" stays a structural fact, not something a
// future per-handler edit could silently regress.

const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export interface CorsCheckResult {
  allowed: boolean;
  origin: string | null;
}

/**
 * Checks the request's Origin header against the explicit allowlist.
 * No wildcard, no default-allow — an Origin not on the list (including
 * a missing Origin header) is rejected.
 */
export function checkCorsOrigin(req: Request): CorsCheckResult {
  const origin = req.headers.get("origin");
  if (!origin) {
    return { allowed: false, origin: null };
  }
  return { allowed: corsAllowedOrigins.includes(origin), origin };
}

/** Builds the CORS response headers for an allowed origin. Call only when checkCorsOrigin returned allowed: true. */
export function buildCorsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

/** The canned 403 response for a rejected origin — no CORS headers, per spec. */
export function buildCorsRejectedResponse(): Response {
  return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Origin not allowed." } }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
