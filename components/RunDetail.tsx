"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiFailure, type RunDetail as RunDetailData } from "../lib/client/api";
import AccessGate from "./AccessGate";
import ReportView from "./ReportView";
export default function RunDetail({ id }: { id: string }) { return <AccessGate><Detail key={id} id={id} /></AccessGate>; }
function Detail({ id }: { id: string }) {
  const [data, setData] = useState<RunDetailData | null>(null); const [error, setError] = useState(""); const [revision, setRevision] = useState(0); const [loading, setLoading] = useState(true); const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    api<RunDetailData>(`/api/runs/${encodeURIComponent(id)}`, { signal: controller.signal }).then(setData).catch((e: unknown) => {
      if (controller.signal.aborted) return;
      if (e instanceof ApiFailure && e.code === "unauthorized") router.replace("/not-authorized");
      else setError(e instanceof Error ? e.message : "Could not load this run.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, revision, router]);
  function refresh() { setLoading(true); setError(""); setRevision(revision + 1); }
  return <><div className="report-toolbar"><Link href="/runs">Report history</Link><Link className="workspace-button secondary" href="/workspace">New report</Link></div>{loading ? <p role="status">Loading report…</p> : error ? <div className="workspace-card"><h1>Report unavailable</h1><p role="alert">{error}</p><button className="workspace-button" onClick={refresh}>Try again</button></div> : data?.report ? <ReportView report={data.report} /> : <section className="workspace-card"><span className="workspace-badge">{data?.run.status === "running" ? "In progress" : "No report available"}</span><h1>{data?.run.status === "running" ? "This run hasn’t finished yet." : "This run did not produce a report."}</h1><p>{data?.run.status === "running" ? "Research may still be running. You can check the status again without starting another run." : "Return to your workspace to try again. No changes were made on GitHub."}</p>{data?.run.error_code && <p>Recorded error: <code>{data.run.error_code}</code></p>}<button className="workspace-button secondary" onClick={refresh}>Refresh status</button></section>}</>;
}
