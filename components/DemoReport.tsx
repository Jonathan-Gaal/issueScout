"use client";
import Link from "next/link";
import { useState } from "react";
import type { Report } from "../lib/contract";
import { sampleReport } from "../lib/client/sample-report";
import ReportView from "./ReportView";
export default function DemoReport() {
  const [partial, setPartial] = useState(false);
  const report: Report = partial ? { ...sampleReport, coverage: { ...sampleReport.coverage, stopReason: "time_limit", searchesRun: 1, candidatesRead: 1 }, limitations: [...sampleReport.limitations, "In this partial example, the time limit stopped further comparison of related issues."] } : sampleReport;
  return <><div className="report-toolbar"><Link href="/demo/history">Sample history</Link><Link href="/workspace" className="workspace-button">Research a real issue</Link></div><div className="demo-outcomes" aria-label="Sample report outcome"><span>Explore an outcome:</span><button aria-pressed={!partial} onClick={() => setPartial(false)}>Complete report</button><button aria-pressed={partial} onClick={() => setPartial(true)}>Partial report</button></div><ReportView report={report} sample /></>;
}
