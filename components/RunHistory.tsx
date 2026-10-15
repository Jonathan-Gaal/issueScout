"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiFailure, type RunRow } from "../lib/client/api";
import AccessGate from "./AccessGate";
export default function RunHistory({ demo = false }: { demo?: boolean }) {
  return demo ? <History demo /> : <AccessGate><History demo={false} /></AccessGate>;
}
function History({ demo }: { demo: boolean }) {
  const [runs, setRuns] = useState<RunRow[]>([]); const [loading, setLoading] = useState(!demo); const [error, setError] = useState(""); const [revision, setRevision] = useState(0); const router = useRouter();
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    api<{ runs: RunRow[] }>("/api/runs?limit=20", { signal: controller.signal }).then(data => setRuns(data.runs)).catch((e: unknown) => {
      if (controller.signal.aborted) return;
      if (e instanceof ApiFailure && e.code === "unauthorized") router.replace("/not-authorized");
      else setError(e instanceof Error ? e.message : "Could not load reports.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [demo, revision, router]);
  const statuses = {
    completed: { label: "Complete", symbol: "✓", help: "Research finished. Review the findings and their limits." },
    stopped: { label: "Stopped early", symbol: "!", help: "A limit stopped research. Open to check available findings and coverage." },
    failed: { label: "Failed", symbol: "!", help: "Research did not finish successfully. Open for the recorded error." },
    running: { label: "In progress", symbol: "…", help: "This run is still marked as running. Open to check its status." },
  };
  const shown = demo ? 1 : runs.length;
  return <div className="history-page"><header className="workspace-page-heading history-heading"><div><span className="workspace-kicker">YOUR RESEARCH LIBRARY</span><h1>Pick up where you left off.</h1><p>{demo ? "Preview how a saved report will appear. This example is not part of your personal history." : "Your 20 most recent runs, with their outcomes. Open one to review its findings or status."}</p></div><Link className="workspace-button" href={demo ? "/demo" : "/workspace"}>Start a report</Link></header>
  {loading && <div className="workspace-card" role="status">Loading your report history…</div>}
  {error && <div className="workspace-card"><h2>History could not load</h2><p role="alert">{error}</p><button className="workspace-button secondary" onClick={() => {setError("");setLoading(true);setRevision(revision + 1);}}>Try again</button></div>}
  {!loading && !error && <>
    <div className="history-metrics" aria-label={demo ? "Illustrative history counts" : "Counts for the displayed runs"}>
      {[{label:demo ? "Example report" : "Recent runs",value:shown,help:demo ? "Prepared, not saved" : "Up to 20 shown"},{label:"Completed",value:demo ? 1 : runs.filter(r=>r.status === "completed").length,help:"Research finished"},{label:"Stopped or failed",value:demo ? 0 : runs.filter(r=>r.status === "stopped" || r.status === "failed").length,help:"Check the run details"}].map(item=><div className="workspace-card history-metric" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.help}</small></div>)}
    </div>
    <div className="history-list-label"><h2>{demo ? "Sample report" : "Recent research"}</h2><span>{demo ? "Illustrative data" : "Only your account’s runs"}</span></div>
    {demo ? <Link className="workspace-card history-report-card" href="/demo/report"><div className="history-report-icon" aria-hidden="true">≠</div><div className="history-report-content"><span className="workspace-kicker">FICTIONAL BOOKING APP · ISSUE #128</span><h2>One lesson. Two different times.</h2><p>Booking shows 3 PM. Confirmation email shows 2 PM. Review the assessment and what to check next.</p><div className="history-card-meta"><span className="history-state state-completed">✓ Complete sample</span><span>Prepared example · no run date</span></div></div><span className="history-open">Open report</span></Link> : runs.length ? <div className="history-list">{runs.map(run => {
      const status = statuses[run.status];
      const date = new Date(run.created_at);
      return <Link key={run.id} className="workspace-card history-report-card" href={`/runs/${encodeURIComponent(run.id)}`}><div className={`history-report-icon state-${run.status}`} aria-hidden="true">{status.symbol}</div><div className="history-report-content"><span className="workspace-kicker">GITHUB ISSUE</span><h2>{run.issue_url.split("/").slice(-4).join(" / ")}</h2><p>{status.help}</p><div className="history-card-meta"><span className={`history-state state-${run.status}`}>{status.label}</span>{Number.isNaN(date.getTime()) ? <span>Date unavailable</span> : <time dateTime={run.created_at}>{date.toLocaleString()}</time>}</div></div><span className="history-open">{run.status === "completed" ? "Open report" : "View run"}</span></Link>;
    })}</div> : <div className="workspace-card empty-state"><h2>Your first report starts with one issue.</h2><p>No runs yet. Submit an issue to create your first report.</p><Link href="/workspace" className="workspace-button">Research an issue</Link></div>}
    <p className="history-footnote">{demo ? "The sample opens instantly. Real reports appear here after you start research in your account." : "Complete means the run finished—not that every related issue was found. Check the evidence before acting."}</p>
  </>}
  </div>;
}
