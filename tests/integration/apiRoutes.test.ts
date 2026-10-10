import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ALLOWED_ORIGIN = "https://issuescout.example.com";
const DISALLOWED_ORIGIN = "https://evil.example.com";

interface FakeUser {
  uid: string;
  email: string;
}

const USER_A: FakeUser = { uid: "user-a", email: "maintainer-a@example.com" };
const USER_B: FakeUser = { uid: "user-b", email: "maintainer-b@example.com" };
const NOT_ALLOWLISTED_USER: FakeUser = { uid: "user-c", email: "not-allowed@example.com" };

const FAKE_RUN_OWNED_BY_A = {
  id: "run-owned-by-a",
  user_id: USER_A.uid,
  issue_url: "https://github.com/calcom/cal.diy/issues/1",
  status: "completed",
};

function createRequest(options: {
  method: string;
  url: string;
  origin?: string;
  bearerToken?: string;
  body?: unknown;
}): Request {
  const headers = new Headers();
  if (options.origin !== undefined) {
    headers.set("origin", options.origin);
  }
  if (options.bearerToken) {
    headers.set("authorization", `Bearer ${options.bearerToken}`);
  }
  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new Request(options.url, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

/** Maps a bearer token to a fake decoded identity for the mocked verifySession. */
const TOKEN_TO_USER: Record<string, FakeUser> = {
  "token-user-a": USER_A,
  "token-user-b": USER_B,
  "token-not-allowlisted": NOT_ALLOWLISTED_USER,
};

async function setUpMocks(options: { allowedEmails: string[] }) {
  process.env.CORS_ALLOWED_ORIGINS = ALLOWED_ORIGIN;

  vi.doMock("../../lib/server/auth", () => ({
    verifySession: vi.fn(async (req: Request) => {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.split(" ")[1];
      return token ? TOKEN_TO_USER[token] ?? null : null;
    }),
    isAllowlisted: vi.fn((email: string) => options.allowedEmails.includes(email)),
  }));

  vi.doMock("../../lib/server/db/runs", () => ({
    runs: {
      getOwned: vi.fn(async (id: string, userId: string) => {
        if (id === FAKE_RUN_OWNED_BY_A.id && userId === FAKE_RUN_OWNED_BY_A.user_id) {
          return FAKE_RUN_OWNED_BY_A;
        }
        return null;
      }),
      list: vi.fn(async (userId: string) => (userId === USER_A.uid ? [FAKE_RUN_OWNED_BY_A] : [])),
      countInLastHour: vi.fn(async () => 0),
      create: vi.fn(async () => ({ id: "new-run", user_id: USER_A.uid, issue_url: "u" })),
    },
  }));

  vi.doMock("../../lib/server/db/reports", () => ({ reports: { getOwned: vi.fn(async () => ({ summary: "saved report" })) } }));
  vi.doMock("../../lib/server/harness/runHarness", () => ({
    runHarness: vi.fn(async () => ({
      status: "completed",
      report: { summary: "test" },
    })),
  }));

  vi.doMock("../../lib/server/github/client", () => ({
    RestGitHubClient: class {},
  }));

  vi.doMock("../../lib/server/model", () => ({
    getModelProvider: vi.fn(() => ({ complete: vi.fn() })),
  }));
}

describe("API routes — IDOR, auth, and CORS enforcement", () => {
  const originalCorsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = originalCorsAllowedOrigins;
    vi.doUnmock("../../lib/server/auth");
    vi.doUnmock("../../lib/server/db/runs");
    vi.doUnmock("../../lib/server/harness/runHarness");
    vi.doUnmock("../../lib/server/github/client");
    vi.doUnmock("../../lib/server/model");
  });

  it("(a) IDOR test: user A's run requested under user B's session returns not_found, never the run's content", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email, USER_B.email] });
    const { GET } = await import("../../app/api/runs/[id]/route");

    const request = createRequest({
      method: "GET",
      url: `https://api.example.com/api/runs/${FAKE_RUN_OWNED_BY_A.id}`,
      origin: ALLOWED_ORIGIN,
      bearerToken: "token-user-b",
    });

    const response = await GET(request, { params: Promise.resolve({ id: FAKE_RUN_OWNED_BY_A.id }) });
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ error: { code: "not_found", message: expect.any(String) } });
    expect(JSON.stringify(responseBody)).not.toContain(FAKE_RUN_OWNED_BY_A.issue_url);
  });

  it("(b) the same run, requested by its actual owner (user A), returns successfully", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email, USER_B.email] });
    const { GET } = await import("../../app/api/runs/[id]/route");

    const request = createRequest({
      method: "GET",
      url: `https://api.example.com/api/runs/${FAKE_RUN_OWNED_BY_A.id}`,
      origin: ALLOWED_ORIGIN,
      bearerToken: "token-user-a",
    });

    const response = await GET(request, { params: Promise.resolve({ id: FAKE_RUN_OWNED_BY_A.id }) });
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.run).toEqual(FAKE_RUN_OWNED_BY_A);
  });

  it("(c) a request from a disallowed Origin is rejected on GET /api/runs/:id, with no Access-Control-Allow-Origin header for that origin", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email] });
    const { GET } = await import("../../app/api/runs/[id]/route");

    const request = createRequest({
      method: "GET",
      url: `https://api.example.com/api/runs/${FAKE_RUN_OWNED_BY_A.id}`,
      origin: DISALLOWED_ORIGIN,
      bearerToken: "token-user-a",
    });

    const response = await GET(request, { params: Promise.resolve({ id: FAKE_RUN_OWNED_BY_A.id }) });

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe(DISALLOWED_ORIGIN);
  });

  it("(c) a request from a disallowed Origin is rejected on GET /api/runs", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email] });
    const { GET } = await import("../../app/api/runs/route");

    const request = createRequest({
      method: "GET",
      url: "https://api.example.com/api/runs",
      origin: DISALLOWED_ORIGIN,
      bearerToken: "token-user-a",
    });

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe(DISALLOWED_ORIGIN);
  });

  it("(c) a request from a disallowed Origin is rejected on POST /api/runs", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email] });
    const { POST } = await import("../../app/api/runs/route");

    const request = createRequest({
      method: "POST",
      url: "https://api.example.com/api/runs",
      origin: DISALLOWED_ORIGIN,
      bearerToken: "token-user-a",
      body: { issueUrl: "https://github.com/calcom/cal.diy/issues/1" },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe(DISALLOWED_ORIGIN);
  });

  it("(d) a signed-in-but-not-allowlisted request is rejected distinctly from an unauthenticated request", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email] });
    const { GET } = await import("../../app/api/runs/[id]/route");

    const notAllowlistedResponse = await GET(
      createRequest({
        method: "GET",
        url: `https://api.example.com/api/runs/${FAKE_RUN_OWNED_BY_A.id}`,
        origin: ALLOWED_ORIGIN,
        bearerToken: "token-not-allowlisted",
      }),
      { params: Promise.resolve({ id: FAKE_RUN_OWNED_BY_A.id }) }
    );

    const unauthenticatedResponse = await GET(
      createRequest({
        method: "GET",
        url: `https://api.example.com/api/runs/${FAKE_RUN_OWNED_BY_A.id}`,
        origin: ALLOWED_ORIGIN,
      }),
      { params: Promise.resolve({ id: FAKE_RUN_OWNED_BY_A.id }) }
    );

    // Both are rejected (401 unauthorized in this spec's mapping), but
    // confirmed as two *separate* code paths — both verifySession and
    // isAllowlisted are actually invoked, not short-circuited after
    // only one check.
    expect(notAllowlistedResponse.status).toBe(401);
    expect(unauthenticatedResponse.status).toBe(401);

    const { verifySession, isAllowlisted } = await import("../../lib/server/auth");
    expect(verifySession).toHaveBeenCalled();
    expect(isAllowlisted).toHaveBeenCalledWith(NOT_ALLOWLISTED_USER.email);
  });

  it("GET /api/runs?limit= returns only the requesting user's own runs", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email, USER_B.email] });
    const { GET } = await import("../../app/api/runs/route");

    const response = await GET(
      createRequest({
        method: "GET",
        url: "https://api.example.com/api/runs?limit=10",
        origin: ALLOWED_ORIGIN,
        bearerToken: "token-user-b",
      })
    );
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.runs).toEqual([]);
  });

  it("an unauthenticated malformed POST body returns unauthorized, not invalid_url (auth checked before input validation)", async () => {
    await setUpMocks({ allowedEmails: [USER_A.email] });
    const { POST } = await import("../../app/api/runs/route");

    const response = await POST(
      createRequest({
        method: "POST",
        url: "https://api.example.com/api/runs",
        origin: ALLOWED_ORIGIN,
        body: { notTheRightField: 123 },
      })
    );
    const responseBody = await response.json();

    expect(response.status).toBe(401);
    expect(responseBody.error.code).toBe("unauthorized");
  });
});
