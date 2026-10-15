import { sampleIssue } from "../lib/client/sample-report";
import "./sample-walkthrough.css";
export default function SampleIllustration() {
  return <div className="report-illustration">      <section className="scene-evidence" aria-label="Illustrated booking and confirmation email">
        <div className="walk-eyebrow"><span>WHAT THE REPORTER SAW</span><span>ILLUSTRATED FROM SAMPLE TEXT</span></div>
        <div className="scene-pair">
          <article className="scene-window booking-window" aria-label="Illustrated booking screen showing 3 PM">
            <div className="scene-chrome"><span className="scene-dots" aria-hidden="true">● ● ●</span><span>Booking page</span></div>
            <div className="scene-window-body"><h3 className="scene-lesson-title">Piano lesson</h3><div className="scene-time booking-time"><span>SELECTED TIME</span><strong>3:00 <small>PM</small></strong><span className="scene-time-note">On the booking page</span></div><div className="scene-detail"><span>Timezone</span><span>Not provided</span></div></div>
          </article>
          <article className="scene-window email-window" aria-label="Illustrated confirmation email showing 2 PM">
            <div className="scene-chrome"><svg width="17" height="15" viewBox="0 0 20 16" fill="none" aria-hidden="true"><rect x="1" y="1" width="18" height="14" rx="3" stroke="currentColor"/><path d="m2 3 8 6 8-6" stroke="currentColor"/></svg><span>Confirmation email</span></div>
            <div className="scene-window-body"><h3 className="scene-lesson-title">Piano lesson</h3><div className="scene-time email-time"><span>CONFIRMED TIME</span><strong>2:00 <small>PM</small></strong><span className="scene-time-note">In the email</span></div><div className="scene-detail"><span>Timezone</span><span>Not provided</span></div></div>
          </article>
        </div>
        <div className="scene-mismatch"><span aria-hidden="true">≠</span><div><strong>Same lesson. Different displayed times.</strong><p>A one-hour difference in the report. The cause is still unknown.</p></div></div>
        <details className="walk-source"><summary>Read the original sample description</summary><p>{sampleIssue.description}</p><ol>{sampleIssue.steps.map(item => <li key={item}>{item}</li>)}</ol></details>
      </section>
</div>;
}
