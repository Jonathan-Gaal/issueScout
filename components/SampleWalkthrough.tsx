"use client";

import { useEffect, useRef, useState } from "react";
import type { Report } from "../lib/contract";
import { sampleIssue } from "../lib/client/sample-report";
import "./sample-walkthrough.css";

const steps = ["Read", "Compare", "Classify", "Prioritize", "Recommend"];

export default function SampleWalkthrough({ report }: { report: Report }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!playing || step === steps.length - 1) return;
    const timer = window.setInterval(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.current?.closest(".motion-off")) return;
      setStep(previous => previous < steps.length - 1 ? previous + 1 : previous);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [playing, step]);

  const partial = report.coverage.stopReason !== "completed";
  return <section ref={root} className="sample-walkthrough" aria-label="Illustrated sample walkthrough">
    <header className="walk-masthead"><span><b>i</b> IssueScout <small>RESEARCH PASS</small></span><span>ILLUSTRATIVE WALKTHROUGH</span></header>
    <div className="walk-controls"><nav aria-label="Walkthrough steps">{steps.map((label, index) => <button key={label} aria-pressed={step === index} className={step >= index ? "walk-reached" : ""} onClick={() => { setStep(index); setPlaying(false); }}><span>{index + 1}</span>{label}</button>)}</nav><button className="walk-play" onClick={() => { if (step === 4) setStep(0); setPlaying(previous => step === 4 ? true : !previous); }}>{step === 4 ? "Replay" : playing ? "Pause" : "Play walkthrough"}</button></div>
    <div className="walk-body">
      <section className="walk-original"><div className="walk-eyebrow"><span>ORIGINAL ISSUE</span><span>#128</span></div><h1>{report.issue.title}</h1><p className="walk-quote">“{sampleIssue.description}”</p><div className={`walk-times ${step >= 1 ? "is-revealed" : ""}`}><div><small>BOOKING PAGE</small><strong>3:00 PM</strong></div><span aria-label="does not match">≠</span><div><small>EMAIL</small><strong>2:00 PM</strong></div></div><p className="walk-caption">{step >= 1 ? "One appointment. Two reported times. Cause unconfirmed." : "Start with what the reporter actually said."}</p><details className="walk-source"><summary>Steps to reproduce</summary><ol>{sampleIssue.steps.map(item => <li key={item}>{item}</li>)}</ol></details></section>
      <section className="walk-results" aria-label="Illustrated findings"><div className="walk-eyebrow"><span>SAMPLE ASSESSMENT</span><span>{partial ? "Partial report" : "Prepared example"}</span></div>
        <div className={`walk-result ${step >= 2 ? "is-revealed" : ""}`}><span className="walk-result-label">CATEGORY & LABELS</span>{step >= 2 ? <><strong>Bug report</strong><div className="walk-tags">{report.suggestedLabels.map(label => <span key={label.name}>{label.name}</span>)}</div><p>{report.categoryReason}</p></> : <p className="walk-placeholder">Revealed at Classify</p>}</div>
        <div className={`walk-result ${step >= 3 ? "is-revealed" : ""}`}><span className="walk-result-label">SUGGESTED PRIORITY</span>{step >= 3 ? <><strong className="walk-priority">Needs review</strong><p>{report.priorityEvidence}</p><small>Customer impact and cause are unverified.</small></> : <p className="walk-placeholder">Revealed at Prioritize</p>}</div>
        <div className={`walk-result walk-next ${step >= 4 ? "is-revealed" : ""}`}><span className="walk-result-label">RECOMMENDED NEXT STEP</span>{step >= 4 ? <><strong>Check the timezones.</strong><p>{report.recommendedNextStep}</p></> : <p className="walk-placeholder">Revealed at Recommend</p>}</div>
      </section>
    </div><footer className="walk-footer"><span>No live AI activity. No GitHub changes.</span><span>{step + 1} / 5 · {steps[step]}</span></footer>
  </section>;
}
