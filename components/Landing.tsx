"use client";

import Link from "next/link";
import { useState } from "react";
import { clientConfig } from "../lib/client/config";

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
  return <div className={`landing editorial studio-public ${home ? "discovery-home" : ""} ${motion ? "motion-on" : "motion-off"}`}>
    <a className="skip" href="#main">Skip to content</a>
    <header className="studio-nav">
      <Link href="/" className="brand"><span className="brand-icon" aria-hidden="true">i</span>IssueScout</Link>
      <nav aria-label="Main navigation"><Link href="/how-it-works" aria-current={view === "how" ? "page" : undefined}>How it works</Link><Link href="/signin" className="studio-login">Log in</Link></nav>
    </header>
    <main id="main">
      {home ? <><section className="studio-hero">
        <div className="studio-copy">
          <span className="studio-eyebrow"><span aria-hidden="true" /> FOR GITHUB PROJECT MAINTAINERS</span>
          <h1>Less noise.<br /><span>More next steps.</span></h1>
          <p>Paste one issue link. Review the findings, supporting evidence, and a suggested next step.</p>
          <div className="studio-actions"><Link href="/signup" className="studio-button">Create an account</Link><Link href="/demo/report" className="studio-button studio-secondary">See sample</Link></div>
          <small>Currently supports {clientConfig.approvedRepo}. Create an account with Google or see the sample without one.</small>
        </div>
        <div className="studio-stage" aria-label="Illustrative research report preview">
          <div className="studio-orbit" aria-hidden="true" /><div className="studio-orbit orbit-two" aria-hidden="true" />
          <div className="discovery-note"><span aria-hidden="true">⌕</span><div><strong>Context, connected.</strong><small>Evidence · related issues · open questions</small></div></div><div className="studio-preview">
            <div className="preview-top"><span className="preview-mark">i</span><span>ISSUE BRIEF</span><span className="preview-sample">Sample</span></div>
            <div className="preview-body"><span className="preview-label">FICTIONAL BOOKING APP · #128</span><h2>One lesson.<br />Two different times.</h2><p>The confirmation email shows a different time from the booking.</p>
              <div className="preview-time-comparison" aria-label="Booking shows 3 PM; email shows 2 PM"><div><span>Booking</span><strong>3:00 <small>PM</small></strong></div><span aria-label="different from">≠</span><div><span>Email</span><strong>2:00 <small>PM</small></strong></div></div><div className="preview-tags"><span>Bug report</span><span>Needs review</span></div>
              <div className="preview-insight"><span className="preview-label">WHAT’S MISSING</span><p>Booking date, customer timezone, and teacher timezone.</p></div>
              <div className="preview-next"><span className="preview-label">SUGGESTED NEXT STEP</span><p>Confirm timezone details before deciding severity.</p></div>
            </div>
            <div className="preview-bottom"><span className="preview-dot" /> Research first. You make the call.</div>
          </div>
          <div className="discovery-check"><span aria-hidden="true">✓</span> You make the final call.</div><span className="stage-caption">Illustrative report · no live analysis</span>
        </div>
      </section><section className="discovery-shelf" aria-labelledby="discovery-title"><div className="discovery-shelf-heading"><h2 id="discovery-title">Find your next step.</h2><span>ONE ISSUE. A CLEARER PICTURE.</span></div><div className="discovery-grid">{[
          ["/demo/report", "≠", "See the sample", "Explore the booking-time investigation."],
          ["/how-it-works", "01", "How it works", "From an issue link to a research report."],
          ["/trust", "✓", "Stay in control", "Understand the evidence and the limits."],
        ].map(([href,icon,title,copy])=><Link key={href} href={href} className="discovery-tile"><span className="discovery-cover" aria-hidden="true">{icon}</span><span><strong>{title}</strong><small>{copy}</small></span></Link>)}</div></section></> : <section className="studio-info">
        <span className="studio-eyebrow">{view === "how" ? "THE WORKFLOW" : "BUILT FOR YOUR JUDGMENT"}</span>
        <h1>{view === "how" ? <>From issue.<br /><span>To understanding.</span></> : <>Useful insight.<br /><span>Visible boundaries.</span></>}</h1>
        <p className="public-scope">Current research scope: <strong>{clientConfig.approvedRepo}</strong>. IssueScout compares a limited set of issues within this repository.</p><div className="studio-info-grid">{(view === "how" ? workflow : principles).map(([number, title, copy]) => <article key={number}><span className="preview-label">{number}</span><h2>{title}</h2><p>{copy}</p></article>)}</div>
        {view === "principles" && <section className="trust-data"><h2>Your data and this preview</h2><p>Issue text and selected discussion content are sent to the configured AI provider for analysis. Reports are stored for your account. The provider used by the deployed service, retention period, and deletion process have not yet been published.</p><p>Until those details are confirmed, use public GitHub issues only and do not submit secrets or private information. Read-only means no changes to GitHub; it does not mean no data is stored.</p><p>Questions about stored reports: contact the project maintainers, Ivaylo or Jonathan.</p></section>}
        <div className="studio-actions"><Link href="/demo/report" className="studio-button">See sample</Link><Link href="/signup" className="studio-button studio-secondary">Create an account</Link></div>
      </section>}
    </main>
    <footer className="studio-footer"><span>READ-ONLY BY DESIGN</span><div><Link href="/trust">Trust & safety</Link><button aria-pressed={!motion} onClick={() => setMotion(value => !value)}>{motion ? "Pause motion" : "Enable motion"}</button></div></footer>
  </div>;
}
