import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createRequestWithBearerToken(token: string | null): Request {
  const headers = new Headers();
  if (token !== null) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request("https://example.com/api/runs", { headers });
}

describe("verifySession", () => {
  const originalAllowedUserEmails = process.env.ALLOWED_USER_EMAILS;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.ALLOWED_USER_EMAILS = originalAllowedUserEmails;
    vi.doUnmock("firebase-admin/app");
    vi.doUnmock("firebase-admin/auth");
  });

  it("(a) returns null for a request with no Firebase session token at all", async () => {
    vi.doMock("firebase-admin/app", () => ({ getApps: () => [], initializeApp: vi.fn() }));
    vi.doMock("firebase-admin/auth", () => ({
      getAuth: () => ({ verifyIdToken: vi.fn() }),
    }));

    const { verifySession } = await import("../../lib/server/auth");
    const requestWithNoToken = createRequestWithBearerToken(null);

    const result = await verifySession(requestWithNoToken);
    expect(result).toBeNull();
  });

  it("returns null for an expired/malformed token, never throwing", async () => {
    const verifyIdTokenMock = vi.fn().mockRejectedValue(new Error("Firebase ID token has expired"));
    vi.doMock("firebase-admin/app", () => ({ getApps: () => [], initializeApp: vi.fn() }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: verifyIdTokenMock }) }));

    const { verifySession } = await import("../../lib/server/auth");
    const requestWithExpiredToken = createRequestWithBearerToken("expired-token");

    await expect(verifySession(requestWithExpiredToken)).resolves.toBeNull();
  });

  it("returns the decoded identity for a valid Firebase session token", async () => {
    const verifyIdTokenMock = vi.fn().mockResolvedValue({ uid: "uid-123", email: "maintainer@example.com", email_verified: true });
    vi.doMock("firebase-admin/app", () => ({ getApps: () => [], initializeApp: vi.fn() }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: verifyIdTokenMock }) }));

    const { verifySession } = await import("../../lib/server/auth");
    const requestWithValidToken = createRequestWithBearerToken("valid-token");

    const result = await verifySession(requestWithValidToken);
    expect(verifyIdTokenMock).toHaveBeenCalledWith("valid-token", true);
    expect(result).toEqual({ uid: "uid-123", email: "maintainer@example.com" });
  });

  it("rejects an unverified email even when the token is otherwise valid", async () => {
    const verifyIdTokenMock = vi.fn().mockResolvedValue({ uid: "uid-123", email: "maintainer@example.com", email_verified: false });
    vi.doMock("firebase-admin/app", () => ({ getApps: () => [], initializeApp: vi.fn() }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: verifyIdTokenMock }) }));
    const { verifySession } = await import("../../lib/server/auth");
    expect(await verifySession(createRequestWithBearerToken("unverified"))).toBeNull();
  });

  it("returns null for a decoded token that has no email claim", async () => {
    const verifyIdTokenMock = vi.fn().mockResolvedValue({ uid: "uid-123" });
    vi.doMock("firebase-admin/app", () => ({ getApps: () => [], initializeApp: vi.fn() }));
    vi.doMock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: verifyIdTokenMock }) }));

    const { verifySession } = await import("../../lib/server/auth");
    const result = await verifySession(createRequestWithBearerToken("valid-token-no-email"));
    expect(result).toBeNull();
  });
});

