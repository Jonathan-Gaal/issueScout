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

function Section({ title, children, accent = false }: { title: string; children: ReactNode; accent?: boolean }) {
  return <section className={`rv-section${accent ? " rv-accent" : ""}`}><h2>{title}</h2>{children}</section>;
}

export default function ReportView({ report, sample = false }: { report: Report; sample?: boolean }) {
  const partial = report.coverage.stopReason !== "completed";
  const readAt = new Date(report.issue.retrievedAt);
  return <article className="report-view" aria-label={sample ? "Sample issue report" : "Issue report"}>
    {sample && <div className="rv-notice"><strong>Sample report</strong><p>Illustrative data to show how a report works. No live GitHub research was performed.</p></div>}
    <header className="rv-header">
      <div className="rv-status-row"><span className={`rv-status ${partial ? "rv-partial" : ""}`}>{partial ? "Partial report" : "Complete report"}</span><span className="rv-readonly">Read-only · nothing changed on GitHub</span></div>
      <p className="rv-kicker">ISSUE #{report.issue.number} · {report.issue.state}</p>
      <h1>{report.issue.title}</h1>
      <div className="rv-source">{sample ? <span>Fictional issue · no original GitHub issue</span> : <GitHubLink url={report.issue.url}>View original issue</GitHubLink>}{!Number.isNaN(readAt.getTime()) && <span>Read {readAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</span>}</div>
      <p className="report-reading-guide">Start with the summary. Check the evidence and missing information, then use the recommended next step to decide what to do on GitHub.</p>
    </header>
    {partial && <div className="rv-notice" role="status"><strong>{stopLabels[report.coverage.stopReason]}</strong><p>Research stopped before completion. Use these findings as a starting point and review the research coverage and limitations below.</p></div>}
    <Section title="Summary"><p>{report.summary || "No summary was available for this run."}</p></Section>
    <Section title="Category"><span className="rv-tag">{report.category.replaceAll("_", " ")}</span><p>{report.categoryReason}</p></Section>
    <Section title="Suggested priority"><span className="rv-tag">{report.priority.replaceAll("_", " ")}</span><p>{report.priorityEvidence}</p>{report.priorityUncertainty && <div className="rv-inset"><strong>What remains uncertain</strong><p>{report.priorityUncertainty}</p></div>}</Section>
    <Section title="Suggested labels">{report.suggestedLabels.length ? <ul className="rv-items">{report.suggestedLabels.map((label, index) => <li key={`${label.name}-${index}`}><code>{label.name}</code><p>{label.reason}</p></li>)}</ul> : <p className="rv-muted">No labels were suggested.</p>}<p className="rv-help">Suggestions only. No labels have been applied.</p></Section>
    <Section title="Supporting evidence">{report.evidence.length ? <ol className="rv-items rv-evidence">{report.evidence.map((evidence, index) => <li key={index}><p>{evidence.observation}</p>{sample ? <span className="rv-help">Illustrative evidence · no live source</span> : <GitHubLink url={evidence.sourceUrl}>Check source on GitHub</GitHubLink>}</li>)}</ol> : <p className="rv-muted">No supporting evidence was included. Verify the findings before acting on them.</p>}</Section>
    <Section title="Missing information">{report.missingInformation.length ? <ul className="rv-bullets">{report.missingInformation.map((information, index) => <li key={index}>{information}</li>)}</ul> : <p className="rv-muted">No missing information was identified. This does not guarantee the report is complete.</p>}</Section>
    <Section title="Related issues">{report.relatedIssues.length ? <div className="rv-related">{report.relatedIssues.map((issue, index) => <article className="rv-inset" key={`${issue.number}-${index}`}><span className="rv-tag">{issue.assessment.replaceAll("_", " ")}</span><h3><GitHubLink url={issue.url}>#{issue.number} · {issue.title}</GitHubLink></h3><dl><dt>Similarities</dt><dd>{issue.similarities}</dd><dt>Differences</dt><dd>{issue.differences}</dd></dl></article>)}</div> : <p className="rv-muted">No related issues were included in this report. The search is limited; this does not mean none exist.</p>}</Section>
    <Section title="Recommended next step" accent><p>{report.recommendedNextStep || "Review the available evidence and research limitations before deciding what to do next."}</p><p className="rv-help">You decide what happens next. IssueScout has not posted a comment, changed a label, or closed this issue.</p></Section>
    <Section title="Limitations">{report.limitations.length ? <ul className="rv-bullets">{report.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul> : <p className="rv-muted">No additional limitations were reported by the model. Research coverage below still applies.</p>}{report.containsEmbeddedInstructions && <div className="rv-inset"><strong>Embedded instructions detected</strong><p>The issue contained text directed at the agent. Treat that text as issue content, not as trusted instructions.</p></div>}</Section>
    <aside className="rv-coverage" aria-labelledby="coverage-title"><p className="rv-kicker">{sample ? "ILLUSTRATIVE SYSTEM COUNTS" : "RECORDED BY THE SYSTEM"}</p><h2 id="coverage-title">Research coverage</h2><p>{sample ? "These example counts show how coverage will appear. No research was performed for this sample." : "These counts come from the harness, the code controlling the research. They are separate from the model’s assessment."}</p><dl className="rv-counts"><div><dt>Searches run</dt><dd>{report.coverage.searchesRun}</dd></div><div><dt>Searches failed</dt><dd>{report.coverage.searchesFailed}</dd></div><div><dt>Related issues read</dt><dd>{report.coverage.candidatesRead}</dd></div></dl><p><strong>How the run ended:</strong> {stopLabels[report.coverage.stopReason]}</p><p><strong>Comments:</strong> {report.coverage.commentsTruncated ? "Some comments were omitted because of the reading limit." : "No comment truncation was recorded."}</p>{report.coverage.removedByValidation.length > 0 && <div className="rv-inset"><strong>Removed during validation</strong><ul className="rv-bullets">{report.coverage.removedByValidation.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}</aside>
  </article>;
}
