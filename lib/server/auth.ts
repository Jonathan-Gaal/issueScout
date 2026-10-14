// Public registration approved by Ivaylo on October 14, 2026.
// Require a verified Firebase identity; ownership is enforced by each data query.

import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export interface VerifiedIdentity {
  uid: string;
  email: string;
}

function getFirebaseAuth() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getAuth();
}

function extractBearerToken(req: Request): string | null {
  const authorizationHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authorizationHeader) {
    return null;
  }
  const [scheme, token, extra] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token || extra !== undefined) {
    return null;
  }
  return token;
}

// Invalid, revoked, expired, or unverified sessions fail closed.
export async function verifySession(req: Request): Promise<VerifiedIdentity | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  try {
    const decodedToken = await getFirebaseAuth().verifyIdToken(token, true);
    if (!decodedToken.email || decodedToken.email_verified !== true) {
      return null;
    }
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch {
    // Expired, malformed, or otherwise invalid token — treated
    // identically to "no token" (spec 011 Edge Cases).
    return null;
  }
}

