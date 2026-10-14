"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiFailure, type CreatedRun } from "../lib/client/api";
import { clientConfig } from "../lib/client/config";
import AccessGate from "./AccessGate";
export default function NewReport({ demo = false }: { demo?: boolean }) {
  return demo ? <Form demo /> : <AccessGate><Form demo={false} /></AccessGate>;
}
function Form({ demo }: { demo: boolean }) {
  const router = useRouter(); const inFlight = useRef(false);
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); if (inFlight.current || demo) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await api<CreatedRun>("/api/runs", { method: "POST", body: JSON.stringify({ issueUrl: url.trim() }) });
      router.push(`/runs/${encodeURIComponent(result.runId)}`);
    } catch (e: unknown) {
      if (e instanceof ApiFailure && e.code === "unauthorized") router.push("/not-authorized");
      else setError(e instanceof Error ? e.message : "The request did not finish.");
      setBusy(false); inFlight.current = false;
    }
  }
  return <><div className="workspace-page-heading"><span className="workspace-kicker">YOUR FIRST PASS, SIMPLIFIED</span><h1>One issue. A clearer next step.</h1><p>Understand the problem before deciding what to do about it.</p></div>
    <div className="submission-grid"><section className="workspace-card submission-card"><div className="card-step">01 <span>{demo ? "Explore an example" : "Bring the issue"}</span></div><h2>{demo ? "See what a useful report looks like." : "Paste a GitHub issue link"}</h2><p>{demo ? "Walk through a fictional booking-time report. You’ll see the evidence, what’s missing, and a suggested next step." : "Choose one issue from the supported repository. IssueScout reads it and researches related issues in that same project."}</p>
    {demo ? <><div className="sample-issue-card"><span className="workspace-kicker">FICTIONAL BOOKING ISSUE</span><h3>The booking is at 11am. The email says 10am.</h3><p>What should the maintainer check first?</p></div><Link className="workspace-button" href="/demo/report">Open sample report</Link><small>This opens a prepared example, not a live analysis.</small></> : <form onSubmit={submit} aria-busy={busy}><label htmlFor="issue-url">GitHub issue URL</label><input id="issue-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder={`https://github.com/${clientConfig.approvedRepo}/issues/123`} required maxLength={2048} disabled={busy} aria-describedby="issue-help issue-error" /><small id="issue-help">Supported repository: <code>{clientConfig.approvedRepo}</code>. Use an issue link, not a pull request.</small><p id="issue-error" className="workspace-error" role={error ? "alert" : undefined}>{error}</p><button className="workspace-button" disabled={busy || !url.trim()}>{busy ? "Researching your issue…" : "Research this issue"}</button>{busy && <div className="workspace-loading" role="status"><span className="loading-orbit" /><div><strong>Reading and comparing evidence</strong><p>This can take a few minutes. Keep this page open. Your report will appear when the research finishes.</p></div></div>}{error && <p className="workspace-helper">If your connection was interrupted, check <Link href="/runs">report history</Link> before submitting again.</p>}</form>}
    <div className="read-only-note">Read-only research. No comments, labels, or closures are applied.</div></section>
    <aside className="workspace-card expectation-card"><span className="workspace-kicker">WHAT YOU’LL GET</span><h2>Less to sort through.<br />More to act on.</h2><ol><li><strong>A clear summary</strong><span>What is reported and how it is classified.</span></li><li><strong>Evidence and open questions</strong><span>What supports the findings—and what still needs checking.</span></li><li><strong>A recommended next step</strong><span>A starting point for your decision, with research limits visible.</span></li></ol><p>You stay in control of what happens on GitHub.</p></aside></div>
    <div className="workspace-bottom-note"><span>Already researched an issue?</span><Link href={demo ? "/demo/history" : "/runs"}>Open report history</Link></div></>;
}
