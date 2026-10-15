"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "@firebase/auth";
import { clientAuth } from "../lib/client/firebase";
import { clientConfig, hasFirebaseConfig } from "../lib/client/config";
import { api, ApiFailure } from "../lib/client/api";
import { useSession } from "./WorkspaceShell";
export default function SignIn({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const { user } = useSession(); const router = useRouter();
  async function login() {
    setBusy(true); setError("");
    try {
      const auth = clientAuth(); if (!auth) return;
      if (!auth.currentUser) { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await signInWithPopup(auth, provider); }
      await api("/api/runs?limit=1"); router.push("/workspace");
    } catch (e: unknown) {
      if (e instanceof ApiFailure && e.code === "unauthorized") router.push("/not-authorized");
      else setError(e instanceof ApiFailure ? e.message : "Sign-in did not finish. Allow the sign-in window, then try again.");
    } finally { setBusy(false); }
  }
  const signup = mode === "signup";
  return <div className="signin-layout auth-gold-layout">
    <div className="auth-intro"><span className="workspace-kicker">ISSUESCOUT · YOUR RESEARCH WORKSPACE</span><h1>{signup ? <>Less guesswork.<br /><span>A clearer next step.</span></> : <>Your research.<br /><span>Ready to revisit.</span></>}</h1><p>Turn a GitHub issue into findings, supporting evidence, and a next step you can review.</p>
      <div className="auth-journey" aria-label="After signing in"><div><span>01</span><p>Paste an issue link</p></div><div><span>02</span><p>Review the report</p></div><div><span>03</span><p>Return to your history</p></div></div>
      <p className="auth-scope">Currently supports <strong>{clientConfig.approvedRepo}</strong>. Read-only: no comments, labels, or closures are applied.</p>
    </div>
    <section className="workspace-card auth-panel" aria-labelledby="auth-heading"><span className="workspace-badge">{user ? "Google account connected" : signup ? "No invitation needed" : "WELCOME BACK"}</span><h2 id="auth-heading">{user ? "Continue to IssueScout" : signup ? "Create your account" : "Sign in to IssueScout"}</h2><p>{user ? "Open your workspace to start a report or review your history." : signup ? "Use your Google account to get started. There’s no separate IssueScout password to create." : "Use the Google account you used before to access your saved reports."}</p>
      {!hasFirebaseConfig && <div className="workspace-alert"><strong>Sign-in is temporarily unavailable.</strong><p>You can still explore the sample below.</p></div>}
      <button className="workspace-button auth-google-button" disabled={!hasFirebaseConfig || busy} onClick={login} aria-describedby="auth-help">{!busy && !user && <span aria-hidden="true" className="auth-google-mark">G</span>}{busy ? "Opening your workspace…" : user ? "Continue to workspace" : signup ? "Sign up with Google" : "Sign in with Google"}</button>
      <small id="auth-help">{user ? "Your reports are associated with your signed-in account." : "A Google sign-in window opens. Choose an account to continue."}</small>
      {error && <p role="alert" className="workspace-error">{error}</p>}
      {!user && <p className="account-switch">{signup ? "Already have an account? " : "New to IssueScout? "}<Link href={signup ? "/signin" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>}
      <div className="signin-divider"><span>Just looking?</span></div><Link className="workspace-button secondary" href="/demo/report">Explore the sample report</Link><small>No account needed. Prepared example, not live research.</small>
      <Link href="/trust" className="auth-data-link">How IssueScout handles your data</Link>
    </section>
  </div>;
}
