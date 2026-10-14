"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "@firebase/auth";
import { clientAuth } from "../lib/client/firebase";
import { hasFirebaseConfig } from "../lib/client/config";
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
  return <div className="signin-layout"><div><span className="workspace-kicker">LESS SEARCHING. MORE CLARITY.</span><h1>Your next issue.<br />A clearer next step.</h1><p>Bring one GitHub issue. Get a structured research report with evidence, missing details, and a recommendation.</p><ul className="signin-benefits"><li>Read-only research</li><li>Evidence you can check</li><li>Your own report history</li></ul></div><section className="workspace-card"><span className="workspace-badge">Open to everyone</span><h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2><p>{mode === "signup" ? "Sign up with Google to start your own report history. No invitation needed." : "Sign in with your Google account to access your reports."}</p>{!hasFirebaseConfig && <div className="workspace-alert"><strong>Live sign-in is not configured.</strong><p>The sample workspace is ready to explore. The project owner needs to add the Firebase web configuration before live sign-in works.</p></div>}<button className="workspace-button" disabled={!hasFirebaseConfig || busy} onClick={login}>{busy ? "Checking access…" : user ? "Continue to workspace" : mode === "signup" ? "Sign up with Google" : "Sign in with Google"}</button>{error && <p role="alert" className="workspace-error">{error}</p>}<p>{mode === "signup" ? "Already have an account? " : "New to IssueScout? "}<Link href={mode === "signup" ? "/signin" : "/signup"}>{mode === "signup" ? "Sign in" : "Sign up"}</Link></p><div className="signin-divider">Want to look around first?</div><Link className="workspace-button secondary" href="/demo">Try the sample workspace</Link><small>No sign-in needed for the sample.</small></section></div>;
}
