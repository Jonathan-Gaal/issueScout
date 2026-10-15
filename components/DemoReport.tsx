"use client";
import Link from "next/link";
import { useState } from "react";
import type { Report } from "../lib/contract";
import { sampleReport } from "../lib/client/sample-report";
import ReportView from "./ReportView";
import SampleIllustration from "./SampleIllustration";
export default function DemoReport() {
  const [partial, setPartial] = useState(false);
  const report: Report = partial ? { ...sampleReport, coverage: { ...sampleReport.coverage, stopReason: "time_limit", searchesRun: 1, candidatesRead: 1 }, limitations: [...sampleReport.limitations, "In this partial example, the time limit stopped further comparison of related issues."] } : sampleReport;
  return <><header className="sample-intro"><span className="workspace-kicker">PREPARED EXAMPLE · NO LIVE AI ANALYSIS</span><h1>One lesson. Two different times.</h1><p>See the mismatch, understand what it means, then decide what to check.</p></header><ReportView report={report} sample illustration={<SampleIllustration />} /><details className="sample-outcome-options"><summary>See what happens when research stops early</summary>
    <div className="partial-explainer">
      <header><span className="workspace-kicker">COMPARE THE OUTCOMES</span><h2>What changes if research stops?</h2><p>Try both examples. A partial report preserves findings but leaves some research unfinished.</p></header>
      <div className="demo-outcomes" aria-label="Sample report outcome"><button aria-pressed={!partial} onClick={() => setPartial(false)}>Complete example</button><button aria-pressed={partial} onClick={() => setPartial(true)}>Partial example</button></div>
      <div className={`outcome-summary ${partial ? "is-partial" : "is-complete"}`} role="status"><span className="outcome-symbol" aria-hidden="true">{partial ? "!" : "i"}</span><div><strong>{partial ? "Time limit reached. The report is partial." : "Research finished within its limits."}</strong><p>{partial ? "Related-issue comparison stopped early. Findings remain available." : "The run finished. That does not mean every relevant issue was found."}</p></div></div>
      <div className="outcome-columns">
        <section className="outcome-available"><span className="outcome-mini-label">AVAILABLE TO REVIEW</span><h3>Your findings stay visible</h3><ul className="outcome-retained"><li><span aria-hidden="true">✓</span> Reported time mismatch</li><li><span aria-hidden="true">✓</span> Initial assessment</li><li><span aria-hidden="true">✓</span> Suggested next steps</li></ul></section>
        <section className="outcome-research"><span className="outcome-mini-label">{partial ? "NOT COMPLETED" : "RESEARCH COVERAGE"}</span><h3>{partial ? "Comparison stopped early" : "Comparison finished"}</h3><dl><div><dt>Searches run</dt><dd>{report.coverage.searchesRun}</dd></div><div><dt>Candidates read</dt><dd>{report.coverage.candidatesRead}</dd></div></dl><p>{partial ? "More related issues may remain unchecked." : "A limited search—not the entire repository."}</p><small>Illustrative counts—not a completion percentage.</small></section>
      </div>
      <div className="partial-user-action"><span className="outcome-mini-label">WHAT YOU SHOULD DO</span><h3>{partial ? "Check what is missing." : "Verify before taking action."}</h3><p>{partial ? "Verify timezone details and check related issues before deciding this is new or a duplicate." : "Verify the evidence and timezone details before deciding the cause or urgency."}</p><a href="#report-assessment">Review the {partial ? "partial" : "complete"} report above</a></div>
      <p className="outcome-footnote">Switching examples updates the report above. No AI request is made, and no GitHub issue is changed.</p>
    </div>
    </details><div className="report-toolbar"><Link href="/demo/history">Sample history</Link></div></>;
}
