// TRD §2 step 7 / Build Spec §8.1 step 7 — strips invented labels,
// un-retrieved related-issue numbers, and non-sourced URLs from a
// zod-validated ModelReport, recording each into
// coverage.removedByValidation. Pure, deterministic set-membership
// checks (BOUNDED-AI: the model may propose a label, but whether it is
// accepted is never a second model judgment call).

import type { ModelReport } from "../../contract";

export interface ContentValidationInputs {
  realLabelNames: Set<string>;
  retrievedIssueNumbers: Set<number>;
  retrievedUrls: Set<string>;
}

export interface ContentValidationResult {
  cleanedReport: ModelReport;
  removedByValidation: string[];
}

/**
 * Returns a new ModelReport with invalid content stripped — never
 * mutates the input, so the pre-validation report stays available for
 * any debugging/logging that needs a before/after comparison.
 */
export function validateContent(
  modelReport: ModelReport,
  inputs: ContentValidationInputs
): ContentValidationResult {
  const removedByValidation: string[] = [];

  const validSuggestedLabels = modelReport.suggestedLabels.filter((label) => {
    const isValid = inputs.realLabelNames.has(label.name);
    if (!isValid) {
      removedByValidation.push(`suggestedLabel:${label.name}`);
    }
    return isValid;
  });

  const validRelatedIssues = modelReport.relatedIssues.filter((relatedIssue) => {
    const isValid = inputs.retrievedIssueNumbers.has(relatedIssue.number);
    if (!isValid) {
      removedByValidation.push(`relatedIssue:${relatedIssue.number}`);
    }
    return isValid;
  });

  const validEvidence = modelReport.evidence.filter((evidenceItem) => {
    const isValid = inputs.retrievedUrls.has(evidenceItem.sourceUrl);
    if (!isValid) {
      removedByValidation.push(`evidenceUrl:${evidenceItem.sourceUrl}`);
    }
    return isValid;
  });

  const validProposedActions = modelReport.proposedActions.filter((action) => {
    if (action.kind !== "add_labels") {
      return true;
    }
    const allLabelsValid = action.labels.every((labelName) => inputs.realLabelNames.has(labelName));
    if (!allLabelsValid) {
      removedByValidation.push(`proposedAction:add_labels`);
    }
    return allLabelsValid;
  });

  const cleanedReport: ModelReport = {
    ...modelReport,
    suggestedLabels: validSuggestedLabels,
    relatedIssues: validRelatedIssues,
    evidence: validEvidence,
    proposedActions: validProposedActions,
  };

  return { cleanedReport, removedByValidation };
}
