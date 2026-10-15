import type { ReactNode } from "react";
import type { Report, StopReason } from "../lib/contract";
import "./report-view.css";
import ReportMotion from "./ReportMotion";
import AnimatedSummary from "./AnimatedSummary";

const stopLabels: Record<StopReason, string> = {
  completed: "Research completed",
  search_limit: "Search limit reached",
  read_limit: "Reading limit reached",
  turn_limit: "Step limit reached",
  time_limit: "Time limit reached",
  tool_failure: "A research tool failed",
};

function UrgencyBar({ priority }: { priority: Report["priority"] }) {
  const level = priority === "high" ? 3 : priority === "medium" ? 2 : priority === "low" ? 1 : 0;
  return <div className={`urgency-meter urgency-${priority}`} aria-label={level ? `Provisional urgency: ${priority}. Ordinal scale, not a numerical score.` : priority === "needs_review" ? "Urgency undetermined: more evidence needed." : "Urgency not assigned."}>
    <div className="urgency-segments" aria-hidden="true">{["Low", "Medium", "High"].map((label, index) => <div className={`urgency-segment ${index < level ? "is-active" : ""}`} key={label}><div className="urgency-track"><span /></div><span className="urgency-label">{label}</span></div>)}</div>
    {!level && <span className="urgency-pending"><span aria-hidden="true" />{priority === "needs_review" ? "Awaiting evidence · urgency not yet rated" : "Not assigned · maintainer review"}</span>}
  </div>;
}

function GitHubLink({ url, children }: { url: string; children: ReactNode }) {
  let safe = false;
  try {
    const parsed = new URL(url);
    safe = parsed.protocol === "https:" && parsed.hostname === "github.com" && !parsed.username && !parsed.password && (!parsed.port || parsed.port === "443");
  } catch { /* Untrusted malformed links stay non-interactive. */ }
  return safe ? <a href={url} target="_blank" rel="noopener noreferrer">{children}<span className="rv-sr"> (opens GitHub in a new tab)</span></a> : <span>{children} <small>(link unavailable)</small></span>;
}

function Section({ title, children, accent = false, step, id }: { title: string; children: ReactNode; accent?: boolean; step?: string; id?: string }) {
  return <section id={id} tabIndex={id ? -1 : undefined} className={`rv-section${accent ? " rv-accent" : ""}${step ? " story-section" : ""}`}><h2>{step && <span className="story-step" aria-hidden="true">{step}</span>}{title}</h2>{children}</section>;
}

export default function ReportView({ report, sample = false, comparison, illustration }: { report: Report; sample?: boolean; illustration?: ReactNode; comparison?: { before: string; after: string; beforeLabel: string; afterLabel: string; caption: string } }) {
  const partial = report.coverage.stopReason !== "completed";
  const readAt = new Date(report.issue.retrievedAt);
  return <ReportMotion><article className={`report-view clear-report${sample ? " sample-report" : ""}${illustration ? " investigation-board" : ""}`} aria-label={sample ? "Sample issue report" : "Issue report"}>

    {partial && <div className="rv-notice" role="status"><strong>{stopLabels[report.coverage.stopReason]}</strong><p>Research stopped before completion. Review the limitations and coverage before relying on these findings.</p></div>}
    <div className="research-pass" id="report-assessment" tabIndex={-1}>
      <div className="pass-masthead"><span><span className="pass-logo" aria-hidden="true">i</span> IssueScout <span className="pass-edition">RESEARCH PASS</span></span><span className={`rv-status ${partial ? "rv-partial" : ""}`}>{partial ? "Partial report" : "Complete report"}</span></div>
      <div className="pass-identity">
        <header className="pass-title"><p className="rv-kicker">{sample ? "FICTIONAL BOOKING APP" : "GITHUB ISSUE RESEARCH"}</p><h1>{report.issue.title}</h1><div className="rv-source">{sample ? <span>Illustrative issue · no live source</span> : <GitHubLink url={report.issue.url}>View original issue</GitHubLink>}</div></header>
        <aside className="pass-stub" aria-label="Issue identity"><span className="pass-label">ISSUE NO.</span><strong className="pass-number">#{report.issue.number}</strong><span className="pass-label">ISSUE STATE</span><span className="pass-state">{report.issue.state}</span><span className="pass-bars" aria-hidden="true" /></aside>
      </div>
      <div className="investigation-top">
      <section className="pass-summary story-opening"><h2><span className="story-step" aria-hidden="true">01</span> The reported problem</h2>{illustration}{comparison && <div className="story-comparison"><div><span>{comparison.beforeLabel}</span><strong>{comparison.before}</strong><small>Reported selection</small></div><span className="story-mismatch" aria-label="does not match">≠</span><div><span>{comparison.afterLabel}</span><strong>{comparison.after}</strong><small>Reported confirmation</small></div><p>{comparison.caption}</p></div>}{sample && illustration ? null : (comparison || illustration) ? <details className="story-summary-detail"><summary>Read the full summary</summary><p>{report.summary || "No summary was available for this run."}</p></details> : <p>{report.summary || "No summary was available for this run."}</p>}</section>
      <div className="investigation-assessment">
      <h2 className="clear-section-title"><span>02</span> IssueScout’s assessment</h2>
      <p className="assessment-provenance">{sample ? "Prepared sample assessment" : "AI assessment · verify against the sources"}</p>
      <div className="finding-stack">
        <section className="finding finding-type"><span className="finding-icon" aria-hidden="true">≠</span><div><span className="finding-label">What kind of issue?</span><h3>{report.category.replaceAll("_", " ")}</h3><details><summary>Why this classification?</summary><AnimatedSummary text={report.categoryReason} /></details></div></section>
        <section className="finding finding-priority"><span className="finding-icon" aria-hidden="true">!</span><div><span className="finding-label">How urgent is it?</span><h3>{report.priority === "needs_review" ? "Urgency needs review" : report.priority.replaceAll("_", " ")}</h3><UrgencyBar priority={report.priority} /><AnimatedSummary key={report.priorityEvidence} text={sample ? "A customer could arrive at the wrong time. The number affected is unknown." : report.priorityEvidence || "Impact has not been established."} />{sample && <details><summary>See priority reasoning</summary><AnimatedSummary text={report.priorityEvidence || "Review the source before assigning urgency."} /></details>}</div></section>
        <section className="finding finding-unknown"><span className="finding-icon" aria-hidden="true">?</span><div><span className="finding-label">What is still uncertain?</span><h3>{sample ? "Cause not confirmed" : "Check before deciding"}</h3><AnimatedSummary text={sample ? "Timezone differences are a possibility—not a verified cause." : report.priorityUncertainty || "No uncertainty was recorded. This does not guarantee the assessment is complete."} />{sample && <details><summary>What remains unknown?</summary><AnimatedSummary text={report.priorityUncertainty} /></details>}</div></section>
      </div>
      <details className="assessment-labels"><summary>Suggested labels <span>{report.suggestedLabels.length}</span></summary><p className="assessment-provenance">Suggestions only. No labels have been applied.</p>{report.suggestedLabels.length ? report.suggestedLabels.map((label,index)=><div className="assessment-label-reason" key={`${label.name}-${index}`}><code>{label.name}</code><AnimatedSummary text={label.reason} /></div>) : <AnimatedSummary text="None suggested." />}</details>
      </div></div>
    <Section id="report-next-step" title="Your next step" step="03" accent>
      <p className="next-step-intro">{sample ? "Confirm the timezone details before deciding which time is wrong." : report.recommendedNextStep || "Review the available evidence and research limitations before deciding what to do next."}</p>
      {sample && <ol className="next-action-list">
        <li><span className="next-action-number" aria-hidden="true">1</span><div><h3>Ask the reporter for the missing details</h3><p>Get the booking date, customer timezone, and teacher timezone.</p><span className="next-action-location">In the GitHub issue discussion</span></div></li>
        <li><span className="next-action-number" aria-hidden="true">2</span><div><h3>Compare the booking and email</h3><p>Check whether 3 PM and 2 PM represent the same moment in different timezones.</p><span className="next-action-location">Using the reporter’s timezone details</span></div></li>
        <li><span className="next-action-number" aria-hidden="true">3</span><div><h3>Record what you learn</h3><p>Explain whether the difference is expected or needs further investigation. Keep the cause unconfirmed until the evidence supports it.</p><span className="next-action-location">Back in the GitHub issue</span></div></li>
      </ol>}
      <details className="next-details"><summary>Details to request from the reporter</summary>    {report.missingInformation.length ? <ul className="story-gaps">{report.missingInformation.map((information, index) => <li key={index}><span aria-hidden="true">?</span><div><small>TO CONFIRM</small><p>{information}</p></div></li>)}</ul> : <p className="rv-muted">No missing information was identified. This does not guarantee the report is complete.</p>}
</details>
      <div className="next-action-footer"><p><strong>You take the action.</strong> IssueScout has not posted a comment, changed a label, or closed this issue.</p>{sample ? <span className="next-action-sample">Practice example · no live issue to update</span> : <GitHubLink url={report.issue.url}>Open the issue on GitHub</GitHubLink>}</div>
    </Section>
      <div className="pass-footer"><span>READ-ONLY · NO CHANGES APPLIED</span><span>{!Number.isNaN(readAt.getTime()) ? `Read ${readAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC` : sample ? "ILLUSTRATIVE EXAMPLE" : "Read time unavailable"}</span></div>
    </div>
    <details className="report-research-details"><summary>See supporting evidence and research limits</summary>
      <div className="research-reading-guide"><span className="research-eyebrow">BEHIND THE ASSESSMENT</span><h2>What supports the findings?</h2><p>{sample ? "Prepared evidence and example counts. No live research was performed." : "Check the sources, then consider how much of the issue was researched."}</p></div>
      <div className="evidence-columns">
        <section id="report-evidence" className="evidence-panel" aria-labelledby="evidence-title"><header><span className="research-symbol" aria-hidden="true">“</span><div><span className="research-eyebrow">SOURCE OBSERVATIONS</span><h3 id="evidence-title">What the report is based on</h3></div></header>
        {report.evidence.length ? <ol className="evidence-card-list">{report.evidence.map((evidence,index)=><li key={index}><span className="evidence-number">Observation {index+1}</span><p>{evidence.observation}</p>{sample ? <span className="evidence-source-note">Prepared sample text · no live source</span> : <GitHubLink url={evidence.sourceUrl}>Read source on GitHub</GitHubLink>}</li>)}</ol> : <p className="research-warning">No supporting observations were included. Check the original issue before relying on the assessment.</p>}</section>
        <section className="evidence-panel related-panel" aria-labelledby="related-title"><header><span className="research-symbol" aria-hidden="true">≈</span><div><span className="research-eyebrow">RELATED REPORTS</span><h3 id="related-title">What else looks similar?</h3></div></header>
        {report.relatedIssues.length ? report.relatedIssues.map((issue,index)=><article className="related-evidence-card" key={`${issue.number}-${index}`}><span className="rv-tag">{issue.assessment.replaceAll("_"," ")}</span><h4><GitHubLink url={issue.url}>#{issue.number} · {issue.title}</GitHubLink></h4><dl><dt>What matches</dt><dd><p>{issue.similarities}</p></dd><dt>What differs</dt><dd><p>{issue.differences}</p></dd></dl></article>) : <><div className="related-empty-count"><strong>0</strong><span>related issues included</span></div><p>No comparison is presented in this report.</p><p className="research-warning">This does not mean no related issues exist. Only a limited set was checked.</p></>}
        </section>
      </div>
      <section className="research-scope" id="report-coverage" aria-labelledby="coverage-title"><header><div><span className="research-eyebrow">{sample ? "ILLUSTRATIVE ACTIVITY" : "SYSTEM-RECORDED ACTIVITY"}</span><h3 id="coverage-title">How much was checked?</h3></div><span className={`scope-status${partial ? " scope-partial" : ""}`}>{stopLabels[report.coverage.stopReason]}</span></header>
        <div className="scope-metrics">{[{label:"Searches run",value:report.coverage.searchesRun,help:"Queries used to look for related issues."},{label:"Candidates read",value:report.coverage.candidatesRead,help:"Potentially related issues opened for comparison."},{label:"Searches failed",value:report.coverage.searchesFailed,help:"Search requests that did not succeed."}].map(item=><div className="scope-metric" key={item.label}><strong>{item.value}</strong><span>{item.label}</span><div className="scope-meter" aria-hidden="true"><i style={{width:`${item.value/Math.max(1,report.coverage.searchesRun,report.coverage.candidatesRead,report.coverage.searchesFailed)*100}%`}} /></div><p>{item.help}</p></div>)}</div>
        <p className="scope-scale">Bar lengths compare activity counts. They are not confidence scores or percentages complete.</p>
        <div className="scope-boundaries"><div><span className="boundary-symbol" aria-hidden="true">{partial ? "!" : "i"}</span><p><strong>{partial ? "Research stopped early" : "Finished does not mean exhaustive"}</strong>{partial ? "Some comparisons may be missing. Review the available evidence before deciding." : "The run finished within its limits. Other relevant issues may still exist."}</p></div><div><span className="boundary-symbol" aria-hidden="true">{report.coverage.commentsTruncated ? "!" : "i"}</span><p><strong>Comment coverage</strong>{report.coverage.commentsTruncated ? "Some comments were omitted because of the reading limit." : "No comment truncation was recorded."}</p></div></div>
      </section>
      <section className="research-caveats"><h3>Keep these limits in mind</h3>{report.limitations.length ? <ul>{report.limitations.map((limitation,index)=><li key={index}><span aria-hidden="true">!</span><p>{limitation}</p></li>)}</ul> : <p>No additional limitations were recorded. The research boundaries above still apply.</p>}
      {report.containsEmbeddedInstructions && <div className="research-warning"><strong>Embedded instructions detected.</strong> The issue contained instructions aimed at the agent. They are untrusted issue content.</div>}
      {report.coverage.removedByValidation.length > 0 && <details><summary>Items removed during validation ({report.coverage.removedByValidation.length})</summary><ul>{report.coverage.removedByValidation.map((item,index)=><li key={index}><p>{item}</p></li>)}</ul></details>}
      </section>
    </details>
  </article></ReportMotion>;
}
