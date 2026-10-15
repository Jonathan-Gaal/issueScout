import Link from "next/link";
import issue from "../../../../lib/client/real-issue.json";
import "../../../../components/report-view.css";

export default function Page() {
  return <><div className="report-toolbar"><Link className="workspace-button" href="/demo/report">See separate fictional sample</Link><a className="workspace-button secondary" href={issue.html_url} target="_blank" rel="noopener noreferrer">Open on GitHub</a></div>
    <article className="report-view" aria-label="Real GitHub issue">
      <p className="rv-sample-note">Real GitHub data · Retrieved {new Date(issue.retrievedAt).toLocaleString("en-US", {dateStyle:"medium", timeStyle:"short", timeZone:"UTC"})} UTC · Saved snapshot</p>
      <div className="research-pass"><div className="pass-masthead"><span><span className="pass-logo" aria-hidden="true">i</span> IssueScout <span className="pass-edition">SOURCE ISSUE</span></span><span className="rv-status">GitHub · {issue.state}</span></div>
      <div className="pass-identity"><header className="pass-title"><p className="rv-kicker">CALCOM / CAL.DIY</p><h1>{issue.title}</h1><div className="rv-source"><a href={issue.html_url} target="_blank" rel="noopener noreferrer">View original issue</a></div></header><aside className="pass-stub" aria-label="Issue identity"><span className="pass-label">ISSUE NO.</span><strong className="pass-number">#{issue.number}</strong><span className="pass-label">SOURCE</span><span className="pass-state">GitHub</span></aside></div>
      <div className="pass-perforation" aria-hidden="true"><span /></div><section className="pass-summary"><h2>Original issue description</h2><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{issue.body}</p></section><div className="pass-footer"><span>READ-ONLY · NO CHANGES APPLIED</span><span>ORIGINAL SOURCE · NOT AN AI REPORT</span></div></div>
      <section className="rv-notice"><h2>Saved source example—not an AI report.</h2><p>This saved calcom/cal.diy issue is separate from the fictional booking-time sample. No AI assessment has been generated for this snapshot.</p><Link className="workspace-text-link" href="/demo/report">See the separate fictional sample</Link></section>
    </article></>;
}
