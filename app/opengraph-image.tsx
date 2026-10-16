import { ImageResponse } from "next/og";

export const alt = "IssueScout: GitHub issues. A clearer next step. Evidence, assessment, and next steps for maintainers.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "54px 64px", color: "#edf2f8", background: "linear-gradient(120deg, #141e28 0%, #26333c 65%, #504933 100%)", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 32, fontWeight: 700 }}>IssueScout</div>
        <div style={{ fontSize: 18, color: "#e1c786", letterSpacing: 3 }}>GITHUB ISSUE RESEARCH</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 58, fontSize: 70, lineHeight: 1.08, fontWeight: 700, letterSpacing: -3 }}>
        <div>GitHub issues.</div>
        <div style={{ color: "#e1c786" }}>A clearer next step.</div>
      </div>
      <div style={{ display: "flex", marginTop: 36, gap: 18 }}>
        {[
          ["01", "Evidence", "See what supports the findings."],
          ["02", "Assessment", "Understand the issue and its limits."],
          ["03", "Next steps", "Decide what to investigate next."],
        ].map(([number, title, detail]) => (
          <div key={number} style={{ display: "flex", flexDirection: "column", width: 346, padding: "22px 24px", borderRadius: 20, border: "1px solid rgba(225,199,134,0.35)", background: "rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 700 }}>
              <span style={{ color: "#e1c786", fontSize: 18 }}>{number}</span>
              <span>{title}</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 19, lineHeight: 1.4, color: "#bac6d2" }}>{detail}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 18, color: "#bac6d2" }}>
        <span>A researched first pass. You make the decision.</span>
        <span>issuescout-lake.vercel.app</span>
      </div>
    </div>,
    size,
  );
}
