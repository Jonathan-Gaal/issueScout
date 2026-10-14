"use client";
import Link from "next/link";
import { useState } from "react";
import type { Report } from "../lib/contract";
import { sampleReport, sampleIssue } from "../lib/client/sample-report";
import ReportView from "./ReportView";
export default function DemoReport() {
  const [partial, setPartial] = useState(false);
  const report: Report = partial ? { ...sampleReport, coverage: { ...sampleReport.coverage, stopReason: "time_limit", searchesRun: 1, candidatesRead: 1 }, limitations: [...sampleReport.limitations, "In this partial example, the time limit stopped further comparison of related issues."] } : sampleReport;
  return <><div className="report-toolbar"><Link href="/demo/history">Sample history</Link><Link href="/workspace" className="workspace-button">Create your own report</Link></div><div className="demo-outcomes" aria-label="Sample report outcome"><span>Explore an outcome:</span><button aria-pressed={!partial} onClick={() => setPartial(false)}>Complete report</button><button aria-pressed={partial} onClick={() => setPartial(true)}>Partial report</button></div><details className="workspace-card sample-source"><summary>Sample GitHub issue #128 · View original description</summary><div><h2>{sampleReport.issue.title}</h2><p>{sampleIssue.description}</p><h3>Steps to reproduce</h3><ol>{sampleIssue.steps.map(step => <li key={step}>{step}</li>)}</ol><p><strong>Expected:</strong> {sampleIssue.expected}</p><p><strong>Actual:</strong> {sampleIssue.actual}</p><small>Frontend design sample only. No issue was created on GitHub; the findings below are prepared sample content.</small></div></details><ReportView report={report} sample /></>;
}
