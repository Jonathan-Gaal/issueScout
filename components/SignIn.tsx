"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, reload, signOut } from "@firebase/auth";
import { clientAuth } from "../lib/client/firebase";
import { clientConfig, hasFirebaseConfig } from "../lib/client/config";
import { api, ApiFailure } from "../lib/client/api";
import { useSession } from "./WorkspaceShell";
export default function SignIn({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const { user } = useSession(); const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  async function enterWorkspace() {
    const auth = clientAuth();
    if (!auth?.currentUser) return;
    await reload(auth.currentUser);
    if (!auth.currentUser.emailVerified) {
      setNotice("Check your inbox and verify your email, then select Continue to workspace.");
      return;
    }
    await auth.currentUser.getIdToken(true);
    await api("/api/runs?limit=1"); router.push("/workspace");
  }
  function showError(e: unknown) {
    if (e instanceof ApiFailure) {
      if (e.code === "unauthorized") router.push("/not-authorized");
      else setError(e.message);
      return;
    }
    const code = typeof e === "object" && e !== null && "code" in e ? e.code : "";
    const messages: Record<string, string> = {
      "auth/invalid-credential": "Email or password is incorrect. Try again or reset your password.",
      "auth/wrong-password": "Email or password is incorrect. Try again or reset your password.",
      "auth/user-not-found": "Email or password is incorrect. Try again or reset your password.",
      "auth/email-already-in-use": "Unable to create this account. Try signing in or resetting your password.",
      "auth/weak-password": "Choose a stronger password with at least 6 characters.",
      "auth/password-does-not-meet-requirements": "This password does not meet the account security requirements. Try a longer password with uppercase, lowercase, numbers and symbols.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/operation-not-allowed": "Email sign-in is not available yet. Please use Google for now.",
      "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
      "auth/network-request-failed": "Could not connect. Check your connection and try again.",
      "auth/popup-closed-by-user": "Sign-in was cancelled. You can try again.",
    };
    setError(typeof code === "string" && messages[code] ? messages[code] : "Sign-in did not finish. Please try again.");
  }
  async function emailAction(action: "submit" | "reset" | "resend") {
    setBusy(true); setError(""); setNotice("");
    try {
      const auth = clientAuth(); if (!auth) return;
      if (action === "reset") {
        if (!email.trim()) { setError("Enter your email address above first."); return; }
        await sendPasswordResetEmail(auth, email.trim());
        setNotice("If an account uses this email, you’ll receive a password reset link.");
      } else if (action === "resend") {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
        setNotice("Verification email sent. Check your inbox and spam folder.");
      } else if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        setPassword("");
        await sendEmailVerification(credential.user);
        setNotice("Account created. Check your inbox to verify your email before continuing.");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setPassword(""); await enterWorkspace();
      }
    } catch (e: unknown) { showError(e); }
    finally { setBusy(false); }
  }
  async function login() {
    setBusy(true); setError("");
    try {
      const auth = clientAuth(); if (!auth) return;
      if (!auth.currentUser) { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await signInWithPopup(auth, provider); }
      await enterWorkspace();
    } catch (e: unknown) {
      showError(e);
    } finally { setBusy(false); }
  }
  const signup = mode === "signup";
  return <div className="signin-layout auth-gold-layout">
    <div className="auth-intro"><span className="workspace-kicker">ISSUESCOUT · YOUR RESEARCH WORKSPACE</span><h1>{signup ? <>Less guesswork.<br /><span>A clearer next step.</span></> : <>Your research.<br /><span>Ready to revisit.</span></>}</h1><p>Turn a GitHub issue into findings, supporting evidence, and a next step you can review.</p>
      <div className="auth-journey" aria-label="After signing in"><div><span>01</span><p>Paste an issue link</p></div><div><span>02</span><p>Review the report</p></div><div><span>03</span><p>Return to your history</p></div></div>
      <p className="auth-scope">Currently supports <strong>{clientConfig.approvedRepo}</strong>. Read-only: no comments, labels, or closures are applied.</p>
    </div>
    <section className="workspace-card auth-panel" aria-labelledby="auth-heading"><span className="workspace-badge">{user ? "Account connected" : signup ? "Invite-only access" : "WELCOME BACK"}</span><h2 id="auth-heading">{user ? "Continue to IssueScout" : signup ? "Create your account" : "Sign in to IssueScout"}</h2><p>{user ? "Open your workspace to start a report or review your history." : signup ? "Create an account with your email, or continue with Google." : "Sign in with your email and password, or use Google."}</p>
      {!hasFirebaseConfig && <div className="workspace-alert"><strong>Sign-in is temporarily unavailable.</strong><p>You can still explore the sample below.</p></div>}
      {!user && <form className="auth-email-form" onSubmit={e => { e.preventDefault(); void emailAction("submit"); }}>
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy || !hasFirebaseConfig} placeholder="you@example.com" />
        <label htmlFor="auth-password">Password</label>
        <input id="auth-password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 6 : undefined} value={password} onChange={e => setPassword(e.target.value)} disabled={busy || !hasFirebaseConfig} aria-describedby={signup ? "password-help" : undefined} />
        {signup && <small id="password-help">At least 6 characters. You’ll verify your email before opening your workspace.</small>}
        <button className="workspace-button" disabled={busy || !hasFirebaseConfig}>{busy ? "Please wait…" : signup ? "Create account with email" : "Sign in with email"}</button>
        {!signup && <button type="button" className="auth-text-button" disabled={busy || !hasFirebaseConfig} onClick={() => void emailAction("reset")}>Forgot password?</button>}
        <div className="signin-divider"><span>or continue with Google</span></div>
      </form>}
      {user && !user.emailVerified && <div className="workspace-alert"><strong>Verify your email</strong><p>Open the verification link sent to {user.email}, then continue below.</p><button className="auth-text-button" disabled={busy} onClick={() => void emailAction("resend")}>Resend verification email</button></div>}
      <button className="workspace-button auth-google-button" disabled={!hasFirebaseConfig || busy} onClick={login} aria-describedby="auth-help">{!busy && !user && <span aria-hidden="true" className="auth-google-mark">G</span>}{busy ? "Opening your workspace…" : user ? "Continue to workspace" : signup ? "Sign up with Google" : "Sign in with Google"}</button>
      <small id="auth-help">{user ? "Your reports are associated with your signed-in account." : "A Google sign-in window opens. Choose an account to continue."}</small>
      {user && <button className="auth-text-button" disabled={busy} onClick={async () => { setBusy(true); try { const auth = clientAuth(); if (auth) await signOut(auth); setNotice(""); } catch (e) { showError(e); } finally { setBusy(false); } }}>Use another account</button>}
      {notice && <p role="status" className="auth-notice">{notice}</p>}
      {error && <p role="alert" className="workspace-error">{error}</p>}
      {!user && <p className="account-switch">{signup ? "Already have an account? " : "New to IssueScout? "}<Link href={signup ? "/signin" : "/signup"}>{signup ? "Sign in" : "Create an account"}</Link></p>}
      <div className="signin-divider"><span>Just looking?</span></div><Link className="workspace-button secondary" href="/demo/report">Explore the sample report</Link><small>No account needed. Prepared example, not live research.</small>
      <Link href="/trust" className="auth-data-link">How IssueScout handles your data</Link>
    </section>
  </div>;
}
