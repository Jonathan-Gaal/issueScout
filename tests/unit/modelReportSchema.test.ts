import { describe, expect, it } from "vitest";
import { ModelReportSchema } from "../../lib/server/schemas/modelReport";
import validBugReport from "../fixtures/model/valid-bug-report.json";
import invalidMissingField from "../fixtures/model/invalid-missing-field.json";
import invalidExtraKey from "../fixtures/model/invalid-extra-key.json";

// Fixtures carry a `_fixture: "synthetic"` marker field (JSON has no
// comments) which is itself an unexpected key under .strict() — strip
// it before validating, same as the harness would strip harness-only
// metadata before validating model output.
function withoutFixtureMarker(fixture: Record<string, unknown>): Record<string, unknown> {
  const { _fixture, ...rest } = fixture;
  void _fixture;
  return rest;
}

describe("ModelReportSchema", () => {
  it("accepts a valid, well-formed ModelReport", () => {
    const result = ModelReportSchema.safeParse(withoutFixtureMarker(validBugReport));
    expect(result.success).toBe(true);
  });

  it("rejects a fixture missing a required field (category)", () => {
    const result = ModelReportSchema.safeParse(withoutFixtureMarker(invalidMissingField));
    expect(result.success).toBe(false);
  });

  it("rejects a fixture with an extra unexpected top-level key (model-emitted coverage)", () => {
    const result = ModelReportSchema.safeParse(withoutFixtureMarker(invalidExtraKey));
    expect(result.success).toBe(false);
  });

  it("rejects relatedIssues with more than 3 entries", () => {
    const baseReport = withoutFixtureMarker(validBugReport) as Record<string, unknown>;
    const fourRelatedIssues = Array.from({ length: 4 }, (_, index) => ({
      number: index + 1,
      title: `Issue ${index + 1}`,
      url: `https://github.com/calcom/cal.diy/issues/${index + 1}`,
      similarities: "x",
      differences: "y",
      assessment: "related",
    }));
    const result = ModelReportSchema.safeParse({ ...baseReport, relatedIssues: fourRelatedIssues });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid category enum value", () => {
    const baseReport = withoutFixtureMarker(validBugReport) as Record<string, unknown>;
    const result = ModelReportSchema.safeParse({ ...baseReport, category: "not_a_real_category" });
    expect(result.success).toBe(false);
  });

  it("accepts empty arrays for suggestedLabels, evidence, missingInformation, relatedIssues, limitations", () => {
    const baseReport = withoutFixtureMarker(validBugReport) as Record<string, unknown>;
    const result = ModelReportSchema.safeParse({
      ...baseReport,
      suggestedLabels: [],
      evidence: [],
      missingInformation: [],
      relatedIssues: [],
      limitations: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts priority not_assigned paired with category bug_report (no cross-field constraint)", () => {
    const baseReport = withoutFixtureMarker(validBugReport) as Record<string, unknown>;
    const result = ModelReportSchema.safeParse({ ...baseReport, priority: "not_assigned" });
    expect(result.success).toBe(true);
  });
});
