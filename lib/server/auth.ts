// Two distinct, separately-enforced auth checks — PRD §9 finding #1,
// Red-Alert's highest-severity finding, TRD §5's explicit "never one
// combined isAuthorized()" rule. A signed-in-but-not-allowlisted user
// must be rejected by isAllowlisted explicitly, never allowed through
// because verifySession passed. Every route handler (spec 013) must
// call both, in this order, as two separate function calls — this
// file intentionally exposes no combined guard to call instead.

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "./config";

export interface VerifiedIdentity {
  uid: string;
  email: string;
}

// On Vercel there is no local file for GOOGLE_APPLICATION_CREDENTIALS to
// point to, so the service account must come in as JSON via env var.
// Falls back to Application Default Credentials (the GOOGLE_APPLICATION_
// CREDENTIALS file-path convention) for local dev, where that file exists.
function getFirebaseAuth() {
  if (getApps().length === 0) {
    if (config.firebaseServiceAccountKey) {
      initializeApp({ credential: cert(JSON.parse(config.firebaseServiceAccountKey)) });
    } else {
      initializeApp();
    }
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

/**
 * Check 2 of 2: is this verified identity's email on the allowlist?
 * Pure, synchronous, no I/O. Fails closed: an empty/unset allowlist
 * means every email is rejected, matching PRD §9's "MUST NOT be open
 * to the public" fixed constraint — never fail-open on a misconfigured
 * or empty ALLOWED_USER_EMAILS.
 *
 * Case-normalized (lowercase both sides) since email addresses are
 * commonly case-insensitive in practice.
 */
export function isAllowlisted(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return config.allowedUserEmails.some(
    (allowedEmail) => allowedEmail.trim().toLowerCase() === normalizedEmail
  );
}

