import { recordedReport } from "../lib/client/recorded-report";
import ReportView from "./ReportView";
import "./sample-walkthrough.css";

export default function DemoReport() {
  const illustration = <div className="report-illustration"><section className="scene-evidence" aria-label="Illustration of the reported calendar title truncation">
    <div className="walk-eyebrow"><span>REPORTED BEHAVIOR</span><span>ILLUSTRATION · NOT A SCREENSHOT</span></div>
    <div className="scene-pair">
      <article className="scene-window booking-window"><div className="scene-chrome">Booking event title</div><div className="scene-window-body"><h3 className="scene-lesson-title">Expected title</h3><div className="scene-time booking-time"><span>BEFORE ADDING TO CALENDAR</span><strong style={{fontSize:"clamp(24px, 3vw, 40px)"}}>Q&amp;A #1</strong><span className="scene-time-note">The full event name</span></div></div></article>
      <article className="scene-window email-window"><div className="scene-chrome">Google Calendar</div><div className="scene-window-body"><h3 className="scene-lesson-title">Reported result</h3><div className="scene-time email-time"><span>AFTER OPENING THE LINK</span><strong style={{fontSize:"clamp(24px, 3vw, 40px)"}}>Q</strong><span className="scene-time-note">The rest of the title is lost</span></div></div></article>
    </div><div className="scene-mismatch"><span aria-hidden="true">≠</span><div><strong>One event. An incomplete calendar title.</strong><p>The reporter describes special characters breaking the calendar link. IssueScout has not reproduced the bug.</p></div></div>
  </section></div>;
  return <><header className="sample-intro"><span className="workspace-kicker">REAL AI REPORT · SAVED RUN · OCTOBER 15, 2026</span><h1>A calendar title cut short.</h1><p>Generated from calcom/cal.diy #30264 using live GitHub data and Anthropic. Opening this report does not run the agent again.</p></header>
    <ReportView report={recordedReport} illustration={illustration} />
    <section className="rv-notice"><h2>Review notes</h2><p>The agent read the issue and comments, but did not inspect PR #30289. Claims about that fix come from a commenter and are not independently verified.</p><p>The candidate-read counter includes a repeated read of the original issue; no distinct related issue was read. Suggested labels and the proposed workaround need maintainer review.</p></section>
  </>;
}
