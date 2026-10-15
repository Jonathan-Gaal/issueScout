"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@firebase/auth";
import { clientAuth } from "../../../lib/client/firebase";
export default function Page() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function retrySignIn() {
    setBusy(true); setError("");
    try {
      const auth = clientAuth();
      if (auth) await signOut(auth);
      router.push("/signin");
    } catch {
      setError("Could not sign out. Please try again.");
      setBusy(false);
    }
  }
  return <section className="workspace-card access-card"><span className="workspace-badge">Session could not be verified</span><h1>Let’s reconnect your account.</h1><p>Your session may have expired or your email may not be verified. Sign in again with a verified Google account.</p><button className="workspace-button" disabled={busy} onClick={retrySignIn}>{busy ? "Signing out…" : "Sign out and try again"}</button>{error && <p role="alert">{error}</p>}<p>If the problem continues, contact the project maintainers, Ivaylo or Jonathan.</p><Link className="workspace-text-link" href="/demo/report">See sample</Link></section>;
}
