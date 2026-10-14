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
        <h2>The times don’t match.</h2><span className="walk-priority-badge">{report.priority.replaceAll("_", " ")}</span><p>The customer could arrive at the wrong time. We haven’t verified which time is correct.</p>
        <div className="scene-next"><span className="walk-result-label">NEXT STEP</span><h3>Confirm both timezones.</h3><p>Compare the booking and email settings before deciding whether the appointment itself is wrong.</p></div>
        <div className="scene-unknowns"><span className="walk-result-label">DETAILS TO CHECK</span><ul>{report.missingInformation.map(item => <li key={item}><span aria-hidden="true">?</span>{item}</li>)}</ul></div>
        <small className="scene-hypothesis">Timezone handling is a possible explanation, not a confirmed cause.</small>
      </aside>
    </div><footer className="walk-footer"><span>No live AI activity. No GitHub changes.</span><span>You decide what happens next.</span></footer>
    <details className="walk-explanation"><summary>See how this was assessed</summary>
    <div className="walk-controls"><nav aria-label="Walkthrough steps">{steps.map((label, index) => <button key={label} aria-pressed={step === index} className={step >= index ? "walk-reached" : ""} onClick={() => { setStep(index); setPlaying(false); }}><span>{index + 1}</span>{label}</button>)}</nav><button className="walk-play" onClick={() => { if (step === 4) setStep(0); setPlaying(previous => step === 4 ? true : !previous); }}>{step === 4 ? "Replay explanation" : playing ? "Pause" : "Play walkthrough"}</button></div>

      <div className="walk-explanation-content" aria-live="polite"><span className="walk-result-label">{step + 1} / 5 · {steps[step]}</span><p>{[sampleIssue.description, "Compare the reported booking time with the email: 3:00 PM and 2:00 PM differ.", report.categoryReason, report.priorityEvidence, report.recommendedNextStep][step]}</p>{step === 2 && <div className="walk-tags">{report.suggestedLabels.map(label => <span key={label.name}>{label.name}</span>)}</div>}</div>
    </details>
  </section>;
}
