"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const examples = [
  { tag: "CALENDAR · SAMPLE ISSUE", title: "The right booking.\nThe wrong time.", description: "“My confirmation email shows 10am, but I booked for 11am.”", category: "Bug report", priority: "Needs review", summary: "The reported confirmation time differs from the selected booking time. A timezone mismatch is a possibility, not a confirmed cause.", missing: "Booking timezone, email screenshot, and steps to reproduce.", next: "Ask for timezone details before deciding severity.", related: "Compare timezone-related reports; confirm matching steps before calling this a duplicate." },
  { tag: "ACCESS · SAMPLE ISSUE", title: "Signed out.\nStill searching for answers.", description: "“The password reset link takes me back to the login screen.”", category: "Bug report", priority: "Needs review", summary: "The reporter cannot complete a password reset. The report does not establish whether other users are affected.", missing: "Browser version, link age, and the exact error message.", next: "Request reproduction details and check whether the link has expired.", related: "Similar login symptoms alone are not enough to establish a duplicate." },
  { tag: "PRODUCT · SAMPLE ISSUE", title: "A good idea.\nA different kind of issue.", description: "“Could we add a dark theme to the booking page?”", category: "Feature request", priority: "Not assigned", summary: "This asks for a new appearance option rather than reporting broken behavior.", missing: "Which booking screens need the theme, and the intended use case.", next: "Clarify the request and review existing theme discussions.", related: "Look for existing theme requests before opening a new discussion." },
];
type PageView = "home" | "how" | "explore" | "principles";
export default function Landing({ view = "home" }: { view?: PageView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [example, setExample] = useState(0);
  const [section, setSection] = useState(0);
  const [motion, setMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const item = examples[example];
  return <div className={`landing compact-site view-${view} ${motion ? "motion-on" : "motion-off"}`}>
    <a className="skip" href="#main">Skip to content</a>
    <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
    <nav className="nav glass" aria-label="Main navigation">
      <Link href="/" className="brand"><span className="brand-icon">i</span> IssueScout</Link>
      <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close menu" : "Menu"}</button>
      <div id="site-menu" className={`site-menu ${menuOpen ? "is-open" : ""}`}>
        {([["home", "/", "Home"], ["how", "/how-it-works", "How it works"], ["explore", "/sample-report", "Sample report"], ["principles", "/trust", "Trust & safety"]] as const).map(([key, href, label]) => <Link key={key} href={href} aria-current={view === key ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</Link>)}
      </div>
    </nav>
    <main id="main">
      {view === "home" && <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="status-dot" /> LESS SEARCHING. MORE UNDERSTANDING.</div><h1>Less noise.<br /><em>More next steps.</em></h1><p>Meet your first pass on GitHub issues. The context you need. The evidence behind it. The next step, yours to choose.</p><div className="hero-actions"><Link href="/sample-report" className="button primary">Explore a sample report</Link><Link href="/how-it-works" className="text-link">See how it works</Link></div><div className="hero-note"><span>◎</span> Built for maintainers. Decisions stay with you.</div></div>
        <div className="hero-art" aria-label="Illustration of an issue becoming a report"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orb" />
          <div className="floating-note glass"><span className="mini-icon">⌕</span><div><strong>Context, connected.</strong><small>Related issues · supporting evidence</small></div></div>
          <div className="hero-report glass"><div className="window-chrome" aria-hidden="true"><span /><span /><span /><b>IssueScout / workspace</b></div><div className="report-top"><span className="tiny">ISSUESCOUT / RESEARCH NOTE</span><span className="sample-badge">SAMPLE</span></div><div className="issue-id">◉ &nbsp; A reported booking problem</div><h2>A clearer view.<br />Before your next move.</h2><div className="pills"><span>Bug report</span><span className="peach">Needs review</span></div><div className="report-line" /><p>The confirmation time differs from the booking. Check the timezone before assuming the cause.</p><div className="insight"><div><small>SUGGESTED NEXT STEP</small><strong>Ask for the booking timezone.</strong></div></div><div className="report-foot"><span>Evidence before assumptions</span></div></div>
          <div className="floating-check glass"><span>✓</span> You make the final call.</div><p className="art-caption">Illustrative report · no live analysis</p>
        </div>
      </section>}
      {view === "how" && <section id="how" className="how section"><div className="section-heading"><div><span className="eyebrow">01 / FROM QUESTION TO CLARITY</span><h2>One link.<br /><em>A clearer next step.</em></h2></div><p>A focused workflow for the person<br />who has to decide what happens next.</p></div><div className="steps">{[
        ["01", "Bring the issue.", "Paste a GitHub issue link from the supported repository. One report starts with one problem.", "◎"],
        ["02", "Connect the context.", "IssueScout reads the discussion and searches a limited set of related issues in the same project.", "⌕"],
        ["03", "Make the call.", "Review the reasons, missing information, and recommended next step. Nothing changes on GitHub.", "✓"],
      ].map(([number,title,copy,icon]) => <article className="step glass" key={number}><div className="step-top"><span>{number}</span><span className="step-icon">{icon}</span></div><h3>{title}</h3><p>{copy}</p></article>)}</div></section>}
      {view === "explore" && <section id="explore" className="section explore"><div className="section-heading"><div><span className="eyebrow">02 / TAKE A CLOSER LOOK</span><h2>Less guessing.<br /><em>More to go on.</em></h2></div><p>Explore three illustrative reports.<br />Sample data only. No GitHub requests.</p></div><div className="example-choices" aria-label="Choose sample issue">{["Booking time", "Password reset", "Dark theme"].map((label,index)=><button key={label} aria-pressed={example===index} onClick={()=>{setExample(index);setSection(0);}}><span className={`cover cover-${index}`} aria-hidden="true">{["◷","⌘","◐"][index]}</span><span className="choice-label">{label}<small>{["Understand the mismatch","Find what’s missing","Recognize a request"][index]}</small></span></button>)}</div>
      <div className="explorer glass"><article className="original"><span className="tiny">{item.tag}</span><h3 key={item.title}>{item.title}</h3><blockquote>{item.description}</blockquote><div className="original-bottom"><span>THE STARTING POINT</span><p>A short report can leave<br />a lot unanswered.</p></div></article><div className="findings"><div className="findings-top"><span className="brand">IssueScout</span><span className="sample-badge">ILLUSTRATIVE FINDINGS</span></div><div className="pills"><span>{item.category}</span><span className="peach">{item.priority}</span></div><div className="report-tabs" aria-label="Choose report section">{["Overview", "Missing details", "Related issues"].map((label,index)=><button key={label} aria-pressed={section===index} onClick={()=>setSection(index)}>{label}</button>)}</div><div className="finding-content" aria-live="polite" key={`${example}-${section}`}><h4>{["What the report tells us", "What to ask the reporter", "What to compare"][section]}</h4><p>{[item.summary,item.missing,item.related][section]}</p></div><div className="next-step"><span className="tiny">RECOMMENDED NEXT STEP</span><p>{item.next}</p></div><small className="sample-disclaimer">In a live report, evidence links and coverage show what was actually checked.</small></div></div></section>}
      {view === "principles" && <section id="principles" className="section principles"><div><span className="eyebrow">03 / CONFIDENCE HAS BOUNDARIES</span><h2>Useful judgment.<br /><em>Visible limits.</em></h2><p>Designed to help you think, with a clear distinction between what was found and what still needs checking.</p></div><div className="principle-list">{[["01","Show the evidence.","Findings should point back to retrieved GitHub sources, so you can check the reasoning."],["02","Say what’s uncertain.","Partial research and missing details belong in the report. A possible duplicate is not a confirmed match."],["03","Keep you in control.","The first version is read-only. It suggests next steps; you decide what to change."]].map(([n,title,copy])=><article key={n}><span>{n}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>}

    </main><footer><Link href="/" className="brand">IssueScout</Link><span>Built by Ivaylo & Jonathan.</span><button className="motion-toggle" aria-pressed={motion} onClick={()=>setMotion(!motion)}>{motion ? "Pause" : "Enable"} animations</button></footer>
  </div>;
}
