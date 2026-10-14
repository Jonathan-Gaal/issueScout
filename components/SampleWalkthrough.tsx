"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "../lib/contract";
import { sampleIssue } from "../lib/client/sample-report";
import "./sample-walkthrough.css";

const steps = ["Read", "Compare", "Classify", "Prioritize", "Recommend"];

export default function SampleWalkthrough({ report }: { report: Report }) {
  const [step, setStep] = useState(4);
  const [playing, setPlaying] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!playing || step === steps.length - 1) return;
    const timer = window.setInterval(() => {

      setStep(previous => previous < steps.length - 1 ? previous + 1 : previous);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [playing, step]);

  const partial = report.coverage.stopReason !== "completed";
  return <section ref={root} className="sample-walkthrough" aria-label="Illustrated sample walkthrough">
    <header className="walk-masthead"><span><b>i</b> IssueScout <small>RESEARCH PASS</small></span><span>{partial ? "PARTIAL SAMPLE REPORT" : "SAMPLE REPORT"}</span></header>
    <div className="walk-issue-heading"><span className="walk-result-label">ISSUE #{report.issue.number}</span><h1>{report.issue.title}</h1></div>
    {partial && <div className="walk-partial" role="status"><strong>Partial: related-issue comparison stopped early.</strong><p>The reported time mismatch is available to review. Further comparison was not completed, so other related reports may be missing.</p></div>}
    <section className="walk-decision"><span className="walk-result-label">SUGGESTED NEXT STEP</span><h2>Check the timezones.</h2><p>{report.recommendedNextStep}</p><div><span className="walk-priority-badge">{report.priority.replaceAll("_", " ")}</span><small>Cause and customer impact remain unverified.</small></div></section>
    <div className="walk-body answer-first">
      <section className="walk-original"><div className="walk-eyebrow"><span>ORIGINAL ISSUE</span><span>#128</span></div><h2 className="walk-source-title">What the reporter saw</h2><p className="walk-quote">“{sampleIssue.description}”</p><figure className="time-visual" aria-label="Reported display difference: email 2 PM, booking page 3 PM. One hour apart; timezone context unknown."><div className="time-visual-heading"><span>REPORTED DISPLAY GAP</span><strong>1 <small>hour</small></strong></div><svg viewBox="0 0 400 100" role="img" aria-label="Timeline showing email at 2 PM and booking page at 3 PM"><line x1="30" y1="45" x2="370" y2="45" stroke="currentColor" opacity=".15" strokeWidth="2"/><path className="time-gap-line" d="M143 45H257" fill="none" stroke="#c18b42" strokeWidth="5" strokeLinecap="round"/>{[30,143,257,370].map((x,i)=><g key={x}><line x1={x} y1="39" x2={x} y2="51" stroke="currentColor" opacity=".25"/><text x={x} y="83" textAnchor="middle" fill="currentColor" fontSize="11">{i+1} PM</text></g>)}<circle className="time-email-dot" cx="143" cy="45" r="8" fill="#b67a31"/><circle cx="257" cy="45" r="8" fill="#467caa"/><text x="143" y="20" textAnchor="middle" fill="#8b5b24" fontSize="11">Email</text><text x="257" y="20" textAnchor="middle" fill="#365e87" fontSize="11">Booking</text></svg><figcaption>Difference between displayed times, not a confirmed scheduling error.</figcaption></figure><div className="walk-times is-revealed"><div><small>BOOKING PAGE</small><strong>3:00 PM</strong></div><span aria-label="does not match">≠</span><div><small>EMAIL</small><strong>2:00 PM</strong></div></div><p className="walk-caption">One appointment. Two reported times. Cause unconfirmed.</p><details className="walk-source"><summary>Steps to reproduce</summary><ol>{sampleIssue.steps.map(item => <li key={item}>{item}</li>)}</ol></details></section>
      <section className="walk-results" aria-label="Evidence and missing information"><div className="walk-eyebrow"><span>BEFORE YOU DECIDE</span></div>
        <div className="walk-result signal-observed"><span className="walk-result-label">WHAT WE KNOW</span><strong>Two reported times.</strong><p>The booking page shows 3:00 PM. The confirmation email shows 2:00 PM. These are the reporter’s observations, not independently verified.</p></div>
        <div className="walk-result signal-hypothesis"><span className="walk-result-label">POSSIBLE EXPLANATION</span><strong>Timezone handling.</strong><p>This is a hypothesis. The issue does not establish whether the stored appointment or only its displayed time is wrong.</p></div>
        <div className="walk-result walk-next signal-missing"><span className="walk-result-label">WHAT’S MISSING · {report.missingInformation.length} DETAILS</span><ul className="walk-missing">{report.missingInformation.map(item => <li key={item}>{item}</li>)}</ul></div>
      </section>
    </div><footer className="walk-footer"><span>No live AI activity. No GitHub changes.</span><span>You decide what happens next.</span></footer>
    <details className="walk-explanation"><summary>See how this was assessed</summary>
    <div className="walk-controls"><nav aria-label="Walkthrough steps">{steps.map((label, index) => <button key={label} aria-pressed={step === index} className={step >= index ? "walk-reached" : ""} onClick={() => { setStep(index); setPlaying(false); }}><span>{index + 1}</span>{label}</button>)}</nav><button className="walk-play" onClick={() => { if (step === 4) setStep(0); setPlaying(previous => step === 4 ? true : !previous); }}>{step === 4 ? "Replay explanation" : playing ? "Pause" : "Play walkthrough"}</button></div>

      <div className="walk-explanation-content" aria-live="polite"><span className="walk-result-label">{step + 1} / 5 · {steps[step]}</span><p>{[sampleIssue.description, "Compare the reported booking time with the email: 3:00 PM and 2:00 PM differ.", report.categoryReason, report.priorityEvidence, report.recommendedNextStep][step]}</p>{step === 2 && <div className="walk-tags">{report.suggestedLabels.map(label => <span key={label.name}>{label.name}</span>)}</div>}</div>
    </details>
  </section>;
}
