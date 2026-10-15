import { describe, expect, it } from "vitest";
import { validateContent } from "../../lib/server/harness/validateContent";
import type { ModelReport } from "../../lib/contract";

function createBaseModelReport(overrides: Partial<ModelReport> = {}): ModelReport {
  return {
    summary: "A test report.",
    category: "bug_report",
    categoryReason: "Test reason.",
    priority: "medium",
    priorityEvidence: "Test evidence.",
    priorityUncertainty: "Test uncertainty.",
    suggestedLabels: [],
    evidence: [],
    missingInformation: [],
    relatedIssues: [],
    recommendedNextStep: "Test next step.",
    proposedActions: [],
    containsEmbeddedInstructions: false,
    limitations: [],
    ...overrides,
  };
}

describe("validateContent", () => {
  it.each(["⚡ Quick Wins", "quick-wins", "✅ good first issue", "Easy", "low-effort"])("withholds unsupported effort label %s even when it exists", (name) => {
    const report = createBaseModelReport({ suggestedLabels: [{ name, reason: "The reporter claims it is easy." }, { name: "bug", reason: "Reporter describes a defect." }] });
    const result = validateContent(report, { realLabelNames: new Set([name, "bug"]), retrievedIssueNumbers: new Set(), retrievedUrls: new Set() });
    expect(result.cleanedReport.suggestedLabels.map(x => x.name)).toEqual(["bug"]);
    expect(result.removedByValidation).toContain(`unsupportedEffortLabel:${name}`);
    expect(result.cleanedReport.limitations.join(" ")).toContain("has not inspected the implementation");
    expect(report.suggestedLabels).toHaveLength(2);
  });

  it("does not allow an easy-fix claim under an otherwise valid label", () => {
    const result = validateContent(createBaseModelReport({ suggestedLabels: [{ name: "bug", reason: "This is a straightforward fix." }] }), { realLabelNames: new Set(["bug"]), retrievedIssueNumbers: new Set(), retrievedUrls: new Set() });
    expect(result.cleanedReport.suggestedLabels).toEqual([]);
  });

  it("strips a suggestedLabel not in the real label list and records it", () => {
    const report = createBaseModelReport({
      suggestedLabels: [
        { name: "bug", reason: "real label" },
        { name: "invented-label", reason: "fake label" },
      ],
    });

    const { cleanedReport, removedByValidation } = validateContent(report, {
      realLabelNames: new Set(["bug"]),
      retrievedIssueNumbers: new Set(),
      retrievedUrls: new Set(),
    });

    expect(cleanedReport.suggestedLabels).toEqual([{ name: "bug", reason: "real label" }]);
    expect(removedByValidation).toContain("suggestedLabel:invented-label");
  });

  it("strips a relatedIssue whose number was never retrieved and records it", () => {
    const report = createBaseModelReport({
      relatedIssues: [
        {
          number: 10,
          title: "retrieved issue",
          url: "u1",
          similarities: "x",
          differences: "y",
          assessment: "related",
        },
        {
          number: 999,
          title: "never retrieved",
          url: "u2",
          similarities: "x",
          differences: "y",
          assessment: "related",
        },
      ],
    });

    const { cleanedReport, removedByValidation } = validateContent(report, {
      realLabelNames: new Set(),
      retrievedIssueNumbers: new Set([10]),
      retrievedUrls: new Set(["u1"]),
    });

    expect(cleanedReport.relatedIssues).toHaveLength(1);
    expect(cleanedReport.relatedIssues[0].number).toBe(10);
    expect(removedByValidation).toContain("relatedIssue:999");
  });

  it("strips an evidence URL that was never sourced from retrieved data", () => {
    const report = createBaseModelReport({
      evidence: [
        { observation: "real observation", sourceUrl: "https://github.com/calcom/cal.diy/issues/1" },
        { observation: "fabricated observation", sourceUrl: "https://github.com/calcom/cal.diy/issues/999" },
      ],
    });

    const { cleanedReport, removedByValidation } = validateContent(report, {
      realLabelNames: new Set(),
      retrievedIssueNumbers: new Set(),
      retrievedUrls: new Set(["https://github.com/calcom/cal.diy/issues/1"]),
    });

    expect(cleanedReport.evidence).toHaveLength(1);
    expect(removedByValidation).toContain(
      "evidenceUrl:https://github.com/calcom/cal.diy/issues/999"
    );
  });

  it("passes a report with no invalid content through unchanged with an empty removedByValidation", () => {
    const report = createBaseModelReport({
      suggestedLabels: [{ name: "bug", reason: "real" }],
      relatedIssues: [
        { number: 10, title: "t", url: "https://github.com/calcom/cal.diy/issues/10", similarities: "s", differences: "d", assessment: "related" },
      ],
      evidence: [{ observation: "o", sourceUrl: "https://github.com/calcom/cal.diy/issues/10" }],
    });

    const { cleanedReport, removedByValidation } = validateContent(report, {
      realLabelNames: new Set(["bug"]),
      retrievedIssueNumbers: new Set([10]),
      retrievedUrls: new Set(["https://github.com/calcom/cal.diy/issues/10"]),
    });

    expect(cleanedReport).toEqual(report);
    expect(removedByValidation).toEqual([]);
  });

  it("does not mutate the input ModelReport", () => {
    const report = createBaseModelReport({
      suggestedLabels: [{ name: "invented-label", reason: "fake" }],
    });
    const reportSnapshotBeforeValidation = JSON.parse(JSON.stringify(report));

    validateContent(report, {
      realLabelNames: new Set(),
      retrievedIssueNumbers: new Set(),
      retrievedUrls: new Set(),
    });

    expect(report).toEqual(reportSnapshotBeforeValidation);
  });

  it("treats an empty suggestedLabels/relatedIssues/evidence array as valid, nothing to strip", () => {
    const report = createBaseModelReport();
    const { cleanedReport, removedByValidation } = validateContent(report, {
      realLabelNames: new Set(),
      retrievedIssueNumbers: new Set(),
      retrievedUrls: new Set(),
    });
    expect(cleanedReport).toEqual(report);
    expect(removedByValidation).toEqual([]);
  });
});
