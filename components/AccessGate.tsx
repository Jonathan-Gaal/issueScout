"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiFailure, isAccessError } from "../lib/client/api";
import { hasFirebaseConfig } from "../lib/client/config";
import { useSession } from "./WorkspaceShell";
export default function AccessGate({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  if (!hasFirebaseConfig) return <section className="workspace-card access-card"><span className="workspace-kicker">LIVE WORKSPACE</span><h1>Live sign-in isn’t connected yet.</h1><p>You can explore the complete sample workflow now. Live analysis will be available after the project’s Firebase and backend configuration is connected.</p><Link className="workspace-button" href="/demo/report">See sample</Link><Link className="workspace-text-link" href="/signin">View sign-in setup status</Link></section>;
  if (loading) return <p role="status">Checking your session…</p>;
  if (!user) return <section className="workspace-card access-card"><h1>Sign in to research an issue.</h1><p>Your reports belong to your account. Anyone can create an account with Google.</p><Link className="workspace-button" href="/signin">Sign in</Link><Link className="workspace-text-link" href="/signup">Create an account</Link></section>;
  return <VerifiedAccess key={user.uid}>{children}</VerifiedAccess>;
}
function VerifiedAccess({ children }: { children: ReactNode }) {
  const router = useRouter(); const [verified, setVerified] = useState(false);
  const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    api("/api/runs?limit=1", { signal: abort.signal }).then(() => { if (!abort.signal.aborted) { setError(""); setVerified(true); } }).catch((e: unknown) => {
      if (abort.signal.aborted) return;
      if (e instanceof ApiFailure && isAccessError(e.code)) router.replace("/not-authorized");
      else setError(e instanceof Error ? e.message : "Could not check access.");
    });
    return () => abort.abort();
  }, [router, retry]);
  if (error) return <section className="workspace-card"><h1>We couldn’t open your workspace.</h1><p role="alert">{error}</p><button className="workspace-button" onClick={() => { setError(""); setRetry(retry + 1); }}>Try again</button></section>;
  if (!verified) return <p role="status">Checking workspace access…</p>;
  return children;
}
