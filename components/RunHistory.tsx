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
  return <><div className="workspace-page-heading"><span className="workspace-kicker">PICK UP WHERE YOU LEFT OFF</span><h1>Report history</h1><p>{demo ? "An example of how your previous research will appear." : "Your 20 most recent runs. Open any report to review the findings."}</p><Link className="workspace-button" href={demo ? "/demo" : "/workspace"}>New report</Link></div>
  {loading && <p role="status">Loading your report history…</p>}
  {error && <div className="workspace-card"><p role="alert">{error}</p><button className="workspace-button secondary" onClick={() => {setError("");setLoading(true);setRevision(revision + 1);}}>Try again</button></div>}
  {demo ? <Link className="workspace-card history-item" href="/demo/report"><div><span className="workspace-kicker">ILLUSTRATIVE REPORT · NOT SAVED</span><h2>Booking confirmation email shows the wrong time</h2><p>Sample issue #128 · See the full report</p></div><span className="workspace-badge">Complete sample</span></Link> : !loading && !error && (runs.length ? <div className="history-list">{runs.map(run => <Link key={run.id} className="workspace-card history-item" href={`/runs/${encodeURIComponent(run.id)}`}><div><span className="workspace-kicker">{new Date(run.created_at).toLocaleString()}</span><h2>{run.issue_url.split("/").slice(-4).join(" / ")}</h2><p>{run.status === "failed" ? "Open to review the run status." : "Open report and research coverage."}</p></div><span className="workspace-badge">{({completed:"Complete",stopped:"Partial report",failed:"Failed",running:"In progress"})[run.status]}</span></Link>)}</div> : <div className="workspace-card empty-state"><h2>Your first report starts with one issue.</h2><p>No runs yet. Submit an issue to create your first report.</p><Link href="/workspace" className="workspace-button">Research an issue</Link></div>)}
  </>;
}
