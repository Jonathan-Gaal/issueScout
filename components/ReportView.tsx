import type { ReactNode } from "react";
import type { Report, StopReason } from "../lib/contract";
import "./report-view.css";

const stopLabels: Record<StopReason, string> = {
  completed: "Research completed",
  search_limit: "Search limit reached",
  read_limit: "Reading limit reached",
  turn_limit: "Step limit reached",
  time_limit: "Time limit reached",
  tool_failure: "A research tool failed",
};

function GitHubLink({ url, children }: { url: string; children: ReactNode }) {
  let safe = false;
  try {
    const parsed = new URL(url);
    safe = parsed.protocol === "https:" && parsed.hostname === "github.com" && !parsed.username && !parsed.password && (!parsed.port || parsed.port === "443");
  } catch { /* Untrusted malformed links stay non-interactive. */ }
  return safe ? <a href={url} target="_blank" rel="noopener noreferrer">{children}<span className="rv-sr"> (opens GitHub in a new tab)</span></a> : <span>{children} <small>(link unavailable)</small></span>;
}

function Section({ title, children, accent = false, step }: { title: string; children: ReactNode; accent?: boolean; step?: string }) {
  return <section className={`rv-section${accent ? " rv-accent" : ""}${step ? " story-section" : ""}`}><h2>{step && <span className="story-step" aria-hidden="true">{step}</span>}{title}</h2>{children}</section>;
}

export default function ReportView({ report, sample = false, comparison }: { report: Report; sample?: boolean; comparison?: { before: string; after: string; beforeLabel: string; afterLabel: string; caption: string } }) {
  const partial = report.coverage.stopReason !== "completed";
  const readAt = new Date(report.issue.retrievedAt);
  return <article className="report-view" aria-label={sample ? "Sample issue report" : "Issue report"}>
    {sample && <p className="rv-sample-note">Sample report · Illustrative data, not live research.</p>}
    {partial && <div className="rv-notice" role="status"><strong>{stopLabels[report.coverage.stopReason]}</strong><p>Research stopped before completion. Review the limitations and coverage before relying on these findings.</p></div>}
    <div className="research-pass">
      <div className="pass-masthead"><span><span className="pass-logo" aria-hidden="true">i</span> IssueScout <span className="pass-edition">RESEARCH PASS</span></span><span className={`rv-status ${partial ? "rv-partial" : ""}`}>{partial ? "Partial report" : "Complete report"}</span></div>
      <div className="pass-identity">
        <header className="pass-title"><p className="rv-kicker">{sample ? "FICTIONAL BOOKING APP" : "GITHUB ISSUE RESEARCH"}</p><h1>{report.issue.title}</h1><div className="rv-source">{sample ? <span>Illustrative issue · no live source</span> : <GitHubLink url={report.issue.url}>View original issue</GitHubLink>}</div></header>
        <aside className="pass-stub" aria-label="Issue identity"><span className="pass-label">ISSUE NO.</span><strong className="pass-number">#{report.issue.number}</strong><span className="pass-label">ISSUE STATE</span><span className="pass-state">{report.issue.state}</span><span className="pass-bars" aria-hidden="true" /></aside>
      </div>
      <section className="pass-summary story-opening"><h2><span className="story-step" aria-hidden="true">01</span> What happened?</h2>{comparison && <div className="story-comparison"><div><span>{comparison.beforeLabel}</span><strong>{comparison.before}</strong><small>Reported selection</small></div><span className="story-mismatch" aria-label="does not match">≠</span><div><span>{comparison.afterLabel}</span><strong>{comparison.after}</strong><small>Reported confirmation</small></div><p>{comparison.caption}</p></div>}{comparison ? <details className="story-summary-detail"><summary>Read the full summary</summary><p>{report.summary || "No summary was available for this run."}</p></details> : <p>{report.summary || "No summary was available for this run."}</p>}</section>
      <div className="pass-perforation" aria-hidden="true"><span /></div>
      <div className="pass-decisions">
        <section className="pass-field"><h2>Category</h2><strong className="pass-value">{report.category.replaceAll("_", " ")}</strong><details><summary>Why this category</summary><p>{report.categoryReason}</p></details></section>
        <section className="pass-field"><h2>Suggested priority</h2><strong className={`pass-value priority-${report.priority}`}>{report.priority.replaceAll("_", " ")}</strong><small className="pass-caution">Assessment and uncertainty below</small></section>
        <section className="pass-field"><h2>Suggested labels</h2>{report.suggestedLabels.length ? <><div className="pass-labels">{report.suggestedLabels.map((label,index) => <code key={`${label.name}-${index}`}>{label.name}</code>)}</div><details><summary>Why these labels</summary>{report.suggestedLabels.map((label,index) => <p key={`${label.name}-${index}`}><strong>{label.name}:</strong> {label.reason}</p>)}</details></> : <p className="rv-muted">None suggested.</p>}</section>
      </div>
      <section className="story-impact"><div><span className="story-step" aria-hidden="true">02</span><h2>Why does it matter?</h2><span className="story-provenance">MODEL ASSESSMENT{sample ? " · SAMPLE" : ""}</span></div><p>{report.priorityEvidence || "Impact has not been established. Review the source before assigning urgency."}</p>{report.priorityUncertainty && <p className="story-uncertainty"><strong>Still uncertain</strong> {report.priorityUncertainty}</p>}</section>
      <div className="pass-footer"><span>READ-ONLY · NO CHANGES APPLIED</span><span>{!Number.isNaN(readAt.getTime()) ? `Read ${readAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : sample ? "ILLUSTRATIVE EXAMPLE" : "Read time unavailable"}</span></div>
    </div>
    <div className="report-detail-heading"><span className="pass-label">BEHIND THE RECOMMENDATION</span><p>Check the evidence. Review the gaps. Make your call.</p></div>
    <Section title="What supports this?" step="03">{report.evidence.length ? <ol className="rv-items rv-evidence">{report.evidence.map((evidence, index) => <li key={index}><span className="story-source-label">{sample ? "SAMPLE REPORTER’S ACCOUNT" : "SOURCE OBSERVATION"}</span><p>{evidence.observation}</p>{sample ? <span className="rv-help">Illustrative evidence · no live source</span> : <GitHubLink url={evidence.sourceUrl}>Check source on GitHub</GitHubLink>}</li>)}</ol> : <p className="rv-muted">No supporting evidence was included. Verify the findings before acting on them.</p>}</Section>
    <Section title="What’s still missing?" step="04">{report.missingInformation.length ? <ul className="story-gaps">{report.missingInformation.map((information, index) => <li key={index}><span aria-hidden="true">?</span><div><small>TO CONFIRM</small><p>{information}</p></div></li>)}</ul> : <p className="rv-muted">No missing information was identified. This does not guarantee the report is complete.</p>}</Section>
    <Section title="Related issues">{report.relatedIssues.length ? <div className="rv-related">{report.relatedIssues.map((issue, index) => <article className="rv-inset" key={`${issue.number}-${index}`}><span className="rv-tag">{issue.assessment.replaceAll("_", " ")}</span><h3><GitHubLink url={issue.url}>#{issue.number} · {issue.title}</GitHubLink></h3><dl><dt>Similarities</dt><dd>{issue.similarities}</dd><dt>Differences</dt><dd>{issue.differences}</dd></dl></article>)}</div> : <p className="rv-muted">No related issues were included in this report. The search is limited; this does not mean none exist.</p>}</Section>
    <Section title="What should you do next?" step="05" accent><p>{report.recommendedNextStep || "Review the available evidence and research limitations before deciding what to do next."}</p><p className="rv-help">You decide what happens next. IssueScout has not posted a comment, changed a label, or closed this issue.</p></Section>
    <Section title="Limitations">{report.limitations.length ? <ul className="rv-bullets">{report.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul> : <p className="rv-muted">No additional limitations were reported by the model. Research coverage below still applies.</p>}{report.containsEmbeddedInstructions && <div className="rv-inset"><strong>Embedded instructions detected</strong><p>The issue contained text directed at the agent. Treat that text as issue content, not as trusted instructions.</p></div>}</Section>
    <aside className="rv-coverage coverage-stub" aria-labelledby="coverage-title"><p className="rv-kicker">{sample ? "ILLUSTRATIVE SYSTEM COUNTS" : "RECORDED BY THE SYSTEM"}</p><h2 id="coverage-title">Research coverage</h2><p>{sample ? "These example counts show how coverage will appear. No research was performed for this sample." : "These counts come from the harness, the code controlling the research. They are separate from the model’s assessment."}</p><dl className="rv-counts"><div><dt>Searches run</dt><dd>{report.coverage.searchesRun}</dd></div><div><dt>Searches failed</dt><dd>{report.coverage.searchesFailed}</dd></div><div><dt>Related issues read</dt><dd>{report.coverage.candidatesRead}</dd></div></dl><p><strong>How the run ended:</strong> {stopLabels[report.coverage.stopReason]}</p><p><strong>Comments:</strong> {report.coverage.commentsTruncated ? "Some comments were omitted because of the reading limit." : "No comment truncation was recorded."}</p>{report.coverage.removedByValidation.length > 0 && <div className="rv-inset"><strong>Removed during validation</strong><ul className="rv-bullets">{report.coverage.removedByValidation.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}</aside>
  </article>;
}
