"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiFailure, type CreatedRun } from "../lib/client/api";
import { clientConfig } from "../lib/client/config";
import AccessGate from "./AccessGate";
import { useSession } from "./WorkspaceShell";
export default function NewReport({ demo = false }: { demo?: boolean }) {
  return demo ? <Form demo /> : <AccessGate><Form demo={false} /></AccessGate>;
}
function Form({ demo }: { demo: boolean }) {
  const { user } = useSession();
  const router = useRouter(); const inFlight = useRef(false);
  const [url, setUrl] = useState(() => { try { return !demo && typeof window !== "undefined" ? sessionStorage.getItem("issuescout-issue-draft") || "" : ""; } catch { return ""; } }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current) return;
    if (demo) {
      try { sessionStorage.setItem("issuescout-issue-draft", url.trim()); }
      catch { setError("Your browser could not keep this link. Open the live workspace and paste it there."); return; }
      inFlight.current = true; setBusy(true); setError("");
      router.push(user ? "/workspace" : "/signin"); return;
    }
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await api<CreatedRun>("/api/runs", { method: "POST", body: JSON.stringify({ issueUrl: url.trim() }) });
      try { sessionStorage.removeItem("issuescout-issue-draft"); } catch { /* Report is already saved. */ }
      router.push(`/runs/${encodeURIComponent(result.runId)}`);
    } catch (e: unknown) {
      if (e instanceof ApiFailure && e.code === "unauthorized") router.push("/not-authorized");
      else setError(e instanceof Error ? e.message : "The request did not finish.");
      setBusy(false); inFlight.current = false;
    }
  }
  return <><div className="workspace-page-heading"><span className="workspace-kicker">{demo ? "START HERE" : "NEW REPORT"}</span><h1>{demo ? "Try a sample or bring your own issue." : "Paste a GitHub issue link."}</h1><p>{demo ? "Paste a GitHub issue URL to begin, or open the prepared sample to see how a report works." : "Copy the web address of a bug report on GitHub. IssueScout reads it and creates a research report for you."}</p></div>
    <div className="submission-grid"><section className="workspace-card submission-card">
    <form onSubmit={submit} aria-busy={busy}><label htmlFor="issue-url">Paste the GitHub link here</label><input id="issue-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={`https://github.com/${clientConfig.approvedRepo}/issues/123`} required maxLength={2048} disabled={busy} aria-describedby="issue-help issue-error" /><small id="issue-help">Supported repository: <code>{clientConfig.approvedRepo}</code>. Use an issue link, not a pull request.</small>{demo && <small>Your link is kept in this browser tab while you sign in. Research starts only when you choose Create report in your workspace.</small>}<p id="issue-error" className="workspace-error" role={error ? "alert" : undefined}>{error}</p><button className="workspace-button" disabled={busy || !url.trim()}>{busy ? (demo ? "Opening your next step…" : "Researching your issue…") : demo ? "Continue with this issue" : "Create report"}</button>{busy && !demo && <div className="workspace-loading" role="status"><span className="loading-orbit" /><div><strong>Reading and comparing evidence</strong><p>This can take a few minutes. Keep this page open. Your report will appear when the research finishes.</p></div></div>}{error && <p className="workspace-helper">If your connection was interrupted, check <Link href="/runs">report history</Link> before submitting again.</p>}</form>
    <div className="read-only-note">Read-only research. No comments, labels, or closures are applied.</div></section>
    <aside className="workspace-card sample-start-card"><span className="workspace-kicker">OR VIEW A REAL REPORT</span><h2>See a report first.</h2><p>See how IssueScout investigated calendar links that cut an event title short. This is a saved report from a real AI run.</p><div className="start-sample-times"><span>Event title<strong>Q&amp;A #1</strong></span><span>Calendar title<strong>Q</strong></span></div><Link className="workspace-button sample-report-cta" href="/demo/report">Open real report</Link><small>Saved live run · no sign-in or new AI request needed.</small></aside></div>
    <div className="workspace-bottom-note"><span>{demo ? "See how saved work is organized." : "Already researched an issue?"}</span><Link href={demo ? "/demo/history" : "/runs"}>Open report history</Link></div></>;
}
