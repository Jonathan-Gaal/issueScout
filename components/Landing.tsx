"use client";

import Link from "next/link";
import { useState } from "react";

const workflow = [
  ["01", "Bring one issue.", "Paste a GitHub issue link from the supported repository. Start with the problem you want to understand."],
  ["02", "Find the context.", "IssueScout reads the discussion and compares a limited set of related issues in the same project."],
  ["03", "Make your call.", "Review the evidence, missing details, and suggested next step. You decide what happens on GitHub."],
];
const principles = [
  ["01", "Evidence, not just answers.", "Follow source links back to GitHub and check the findings for yourself."],
  ["02", "Uncertainty stays visible.", "Partial reports show research limits. A related issue is a suggestion, not proof of a duplicate."],
  ["03", "Your repository stays yours.", "IssueScout is read-only. It does not post comments, change labels, or close issues. Your saved reports are tied to your account."],
];

export default function Landing({ view = "home" }: { view?: "home" | "how" | "principles" }) {
  const [motion, setMotion] = useState(true);
  const home = view === "home";
  return <div className={`landing editorial studio-public ${motion ? "motion-on" : "motion-off"}`}>
    <a className="skip" href="#main">Skip to content</a>
    <header className="studio-nav">
      <Link href="/" className="brand"><span className="brand-icon" aria-hidden="true">i</span>IssueScout</Link>
      <nav aria-label="Main navigation"><Link href="/how-it-works" aria-current={view === "how" ? "page" : undefined}>How it works</Link><Link href="/signin" className="studio-login">Log in</Link></nav>
    </header>
    <main id="main">
      {home ? <section className="studio-hero">
        <div className="studio-copy">
          <span className="studio-eyebrow"><span aria-hidden="true" /> A CLEARER FIRST PASS</span>
          <h1>Less noise.<br /><span>More insight.</span></h1>
          <p>One GitHub issue. The context you need to decide what comes next.</p>
          <div className="studio-actions"><Link href="/signup" className="studio-button">Get started</Link><Link href="/demo" className="studio-button studio-secondary">See sample</Link></div>
          <small>Create an account with Google. Or explore without one.</small>
        </div>
        <div className="studio-stage" aria-label="Illustrative research report preview">
          <div className="studio-orbit" aria-hidden="true" /><div className="studio-orbit orbit-two" aria-hidden="true" />
          <div className="studio-preview">
            <div className="preview-top"><span className="preview-mark">i</span><span>ISSUE BRIEF</span><span className="preview-sample">Sample</span></div>
            <div className="preview-body"><span className="preview-label">FICTIONAL BOOKING APP · #42</span><h2>Right booking.<br />Wrong time.</h2><p>The confirmation email shows a different time from the booking.</p>
              <div className="preview-tags"><span>Bug report</span><span>Needs review</span></div>
              <div className="preview-insight"><span className="preview-label">WHAT’S MISSING</span><p>The booking timezone and steps to reproduce.</p></div>
              <div className="preview-next"><span className="preview-label">SUGGESTED NEXT STEP</span><p>Confirm timezone details before deciding severity.</p></div>
            </div>
            <div className="preview-bottom"><span className="preview-dot" /> Research first. You make the call.</div>
          </div>
          <span className="stage-caption">A clearer picture, before your next decision.</span>
        </div>
      </section> : <section className="studio-info">
        <span className="studio-eyebrow">{view === "how" ? "THE WORKFLOW" : "BUILT FOR YOUR JUDGMENT"}</span>
        <h1>{view === "how" ? <>From issue.<br /><span>To understanding.</span></> : <>Useful insight.<br /><span>Visible boundaries.</span></>}</h1>
        <div className="studio-info-grid">{(view === "how" ? workflow : principles).map(([number, title, copy]) => <article key={number}><span className="preview-label">{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</div>
        <div className="studio-actions"><Link href="/demo" className="studio-button">See sample</Link><Link href="/signup" className="studio-button studio-secondary">Create an account</Link></div>
      </section>}
    </main>
    <footer className="studio-footer"><span>READ-ONLY BY DESIGN</span><div><Link href="/trust">Trust & safety</Link><button aria-pressed={!motion} onClick={() => setMotion(value => !value)}>{motion ? "Pause motion" : "Enable motion"}</button></div></footer>
  </div>;
}
