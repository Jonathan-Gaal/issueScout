"use client";

import { useState } from "react";
import type { Report } from "../lib/contract";
import { sampleIssue } from "../lib/client/sample-report";
import "./sample-walkthrough.css";

const steps = ["Read", "Compare", "Classify", "Prioritize", "Recommend"];

export default function SampleWalkthrough({ report }: { report: Report }) {
  const [step, setStep] = useState(4);
  const partial = report.coverage.stopReason !== "completed";
  return <section className="sample-walkthrough" aria-label="Illustrated sample walkthrough">
    <header className="walk-masthead"><span><b>i</b> IssueScout <small>RESEARCH PASS</small></span><span>{partial ? "PARTIAL SAMPLE REPORT" : "SAMPLE REPORT"}</span></header>
    <div className="walk-issue-heading"><span className="walk-result-label">ISSUE #{report.issue.number}</span><h1>{report.issue.title}</h1></div>
    {partial && <div className="walk-partial" role="status"><strong>Partial: related-issue comparison stopped early.</strong><p>The reported time mismatch is available to review. Further comparison was not completed, so other related reports may be missing.</p></div>}
    <div className="scene-layout">
      <section className="scene-evidence" aria-label="Illustrated booking and confirmation email">
        <div className="walk-eyebrow"><span>WHAT THE REPORTER SAW</span><span>ILLUSTRATED FROM SAMPLE TEXT</span></div>
        <div className="scene-pair">
          <article className="scene-window booking-window" aria-label="Illustrated booking screen showing 3 PM">
            <div className="scene-chrome"><span className="scene-dots" aria-hidden="true">● ● ●</span><span>Booking page</span></div>
            <div className="scene-window-body"><span className="scene-app-icon" aria-hidden="true">♫</span><p className="scene-overline">YOUR APPOINTMENT</p><h2>Piano lesson</h2><span className="scene-status">Booking confirmed</span><div className="scene-time booking-time"><span>SELECTED TIME</span><strong>3:00 <small>PM</small></strong><span className="scene-time-note">On the booking page</span></div><div className="scene-detail"><span>Timezone</span><span>Not provided</span></div></div>
          </article>
          <article className="scene-window email-window" aria-label="Illustrated confirmation email showing 2 PM">
            <div className="scene-chrome"><svg width="17" height="15" viewBox="0 0 20 16" fill="none" aria-hidden="true"><rect x="1" y="1" width="18" height="14" rx="3" stroke="currentColor"/><path d="m2 3 8 6 8-6" stroke="currentColor"/></svg><span>Confirmation email</span></div>
            <div className="scene-window-body"><div className="scene-email-meta"><span>SUBJECT</span><strong>Your lesson is booked</strong></div><p className="scene-email-greeting">See you at your<br/>piano lesson.</p><div className="scene-time email-time"><span>CONFIRMED TIME</span><strong>2:00 <small>PM</small></strong><span className="scene-time-note">In the email</span></div><div className="scene-detail"><span>Timezone</span><span>Not provided</span></div></div>
          </article>
        </div>
        <div className="scene-mismatch"><span aria-hidden="true">≠</span><div><strong>Same lesson. Different displayed times.</strong><p>A one-hour difference in the report. The cause is still unknown.</p></div></div>
        <details className="walk-source"><summary>Read the original sample description</summary><p>{sampleIssue.description}</p><ol>{sampleIssue.steps.map(item => <li key={item}>{item}</li>)}</ol></details>
      </section>
      <aside className="scene-assessment" aria-label="IssueScout assessment and next step">
        <div className="walk-eyebrow"><span>ISSUESCOUT’S ASSESSMENT</span></div>
        <h2>{report.category.replaceAll("_", " ")}</h2><span className="walk-priority-badge">{report.priority.replaceAll("_", " ")}</span><p>{report.priorityEvidence}</p>
        <details className="assessment-detail"><summary>Why this classification</summary><p>{report.categoryReason}</p></details>
        <div className="output-labels" aria-label="Suggested sample labels">{report.suggestedLabels.map(label => <details key={label.name}><summary>{label.name}</summary><p>{label.reason}</p></details>)}</div>
        <div className="scene-next"><span className="walk-result-label">RECOMMENDED NEXT STEP</span><p>{report.recommendedNextStep}</p></div>
        <div className="scene-unknowns"><span className="walk-result-label">DETAILS TO CHECK</span><ul>{report.missingInformation.map(item => <li key={item}><span aria-hidden="true">?</span>{item}</li>)}</ul></div>
        <small className="scene-hypothesis">{report.priorityUncertainty}</small>
      </aside>
    </div>
    <section className="research-overview" aria-label="Research evidence and coverage">
      <header><span className="walk-result-label">BEHIND THE ASSESSMENT</span><h2>What supports this report?</h2><p>Prepared sample evidence and counts. No research was performed for this example.</p></header>
      <div className="research-pair">
        <section className="research-evidence"><h3>Source evidence</h3>{report.evidence.length ? report.evidence.map((item,index)=><blockquote key={index}><span className="output-source">OBSERVATION {index+1} · SAMPLE ISSUE #{report.issue.number}</span><p>{item.observation}</p></blockquote>) : <p>No supporting observations were included.</p>}<small>Illustrative source text. Live evidence links to retrieved GitHub content.</small></section>
        <section className="research-related"><h3>Related-issue comparison</h3>{report.relatedIssues.length ? report.relatedIssues.map(item=><article key={item.number}><span className="walk-priority-badge">{item.assessment.replaceAll("_"," ")}</span><h4>#{item.number} · {item.title}</h4><dl><dt>Similarities</dt><dd>{item.similarities}</dd><dt>Differences</dt><dd>{item.differences}</dd></dl></article>) : <><div className="related-empty"><strong>0</strong><span>related issues included</span></div><p>No matches are presented in this sample report. This does not establish that no related issues exist.</p></>}<small>Reading a candidate does not automatically make it a duplicate.</small></section>
      </div>
      <section className="research-chart" aria-label="Illustrative research counts"><div className="chart-heading"><div><span className="walk-result-label">ILLUSTRATIVE COUNTS</span><h3>Research activity</h3></div><span className="walk-priority-badge">{report.coverage.stopReason.replaceAll("_", " ")}</span></div><p>Bar length represents a count—not confidence, accuracy, or percentage complete.</p><div className="count-bars">{[{label:"Searches run",value:report.coverage.searchesRun},{label:"Searches failed",value:report.coverage.searchesFailed},{label:"Candidates read",value:report.coverage.candidatesRead},{label:"Related issues included",value:report.relatedIssues.length}].map(item=><div className="count-row" key={item.label}><span>{item.label}</span><div className="count-track" aria-hidden="true"><span style={{width:`${item.value / Math.max(3,report.coverage.searchesRun,report.coverage.searchesFailed,report.coverage.candidatesRead,report.relatedIssues.length)*100}%`}} /></div><strong>{item.value}</strong></div>)}</div><div className="chart-context"><span>{report.coverage.commentsTruncated ? "Some comments were omitted." : "No comment truncation recorded."}</span><span>{partial ? "Further research stopped before completion." : "Completed does not mean exhaustive."}</span></div></section>
      <details className="research-disclosure"><summary>Summary and limitations</summary><p>{report.summary}</p><ul>{report.limitations.map(item=><li key={item}>{item}</li>)}</ul>{report.coverage.removedByValidation.length > 0 && <><h3>Removed during validation</h3><ul>{report.coverage.removedByValidation.map(item=><li key={item}>{item}</li>)}</ul></>}{report.containsEmbeddedInstructions && <p>Embedded instructions were detected in the issue text and must be treated as content, not trusted instructions.</p>}</details>
    </section><footer className="walk-footer"><span>No live AI activity. No GitHub changes.</span><span>You decide what happens next.</span></footer>
    <details className="walk-explanation"><summary>Illustrative walkthrough · choose a step</summary>
      <div className="walk-controls"><nav aria-label="Illustrative walkthrough steps">{steps.map((label,index)=><button key={label} aria-pressed={step===index} onClick={()=>setStep(index)}><span>{index+1}</span>{label}</button>)}</nav></div>
      <div className="walk-explanation-content" aria-live="polite"><span className="walk-result-label">{step+1} / 5 · {steps[step]}</span><p>{[sampleIssue.description,"Compare the displayed times. Their difference alone does not establish a cause.",report.categoryReason,report.priorityEvidence,report.recommendedNextStep][step]}</p><small>This explains the sample. It is not a recorded model or tool trace.</small></div>
    </details>
  </section>;
}
