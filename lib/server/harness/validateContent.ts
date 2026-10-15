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
  retrievedIssueUrls?: Map<number, string>;
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

  // Current tools read reports, not implementation/tests. They cannot establish
  // fix effort, even when a reporter or commenter calls their fix easy.
  const unsupportedEffort = (name: string, reason = "") => {
    const normalized = name.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return /\b(quick wins?|good first issue|easy|trivial|beginner|low effort|low complexity)\b/.test(normalized)
      || /\b(easy|simple|straightforward|trivial|quick) (fix|change|solution|implementation)\b/i.test(reason);
  };
  let withheldEffort = false;
  const validSuggestedLabels = modelReport.suggestedLabels.filter((label) => {
    if (unsupportedEffort(label.name, label.reason)) {
      withheldEffort = true;
      removedByValidation.push(`unsupportedEffortLabel:${label.name}`);
      return false;
    }
    const isValid = inputs.realLabelNames.has(label.name);
    if (!isValid) {
      removedByValidation.push(`suggestedLabel:${label.name}`);
    }
    return isValid;
  });

  const validRelatedIssues = modelReport.relatedIssues.filter((relatedIssue) => {
    const isValid = inputs.retrievedIssueNumbers.has(relatedIssue.number) &&
      (inputs.retrievedIssueUrls ? inputs.retrievedIssueUrls.get(relatedIssue.number) === relatedIssue.url : inputs.retrievedUrls.has(relatedIssue.url));
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
    const allLabelsValid = action.labels.every((labelName) => inputs.realLabelNames.has(labelName) && !unsupportedEffort(labelName));
    if (!allLabelsValid) {
      removedByValidation.push(`proposedAction:add_labels`);
    }
    return allLabelsValid;
  });

  const cleanedReport: ModelReport = {
    ...modelReport,
    suggestedLabels: validSuggestedLabels,
    limitations: withheldEffort
      ? [...new Set([...modelReport.limitations, "Effort-based label suggestions were withheld: IssueScout has not inspected the implementation or verified how much work the fix requires."])]
      : modelReport.limitations,
    relatedIssues: validRelatedIssues,
    evidence: validEvidence,
    proposedActions: validProposedActions,
  };

  return { cleanedReport, removedByValidation };
}
