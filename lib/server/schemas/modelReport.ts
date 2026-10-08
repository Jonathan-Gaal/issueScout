// zod schema validating the model's raw output against ModelReport
// (TRD §3.1) before the harness trusts any of it — Build Spec §8.1
// step 6's "structure validation" gate. `.strict()` on the top-level
// object is what makes "coverage is harness-only, never model-written"
// an enforced invariant: a model-emitted `coverage` key fails the whole
// parse rather than being silently merged in.

import { z } from "zod";
import type { ModelReport } from "../../contract";

const CategorySchema = z.enum([
  "bug_report",
  "feature_request",
  "question",
  "needs_clarification",
]);

const PrioritySchema = z.enum(["high", "medium", "low", "needs_review", "not_assigned"]);

const AssessmentSchema = z.enum(["possible_duplicate", "related", "unlikely_match"]);

const SuggestedLabelSchema = z
  .object({
    name: z.string(),
    reason: z.string(),
  })
  .strict();

const EvidenceItemSchema = z
  .object({
    observation: z.string(),
    sourceUrl: z.string(),
  })
  .strict();

const RelatedIssueSchema = z
  .object({
    number: z.number(),
    title: z.string(),
    url: z.string(),
    similarities: z.string(),
    differences: z.string(),
    assessment: AssessmentSchema,
  })
  .strict();

const ProposedActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add_labels"), labels: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal("post_comment"), body: z.string() }).strict(),
]);

/**
 * Validates the model's raw output. Does NOT include `issue` or
 * `coverage` — those are harness-written fields on `Report`, never
 * accepted from the model (see Report in lib/contract.ts).
 */
export const ModelReportSchema = z
  .object({
    summary: z.string(),
    category: CategorySchema,
    categoryReason: z.string(),
    priority: PrioritySchema,
    priorityEvidence: z.string(),
    priorityUncertainty: z.string(),
    suggestedLabels: z.array(SuggestedLabelSchema),
    evidence: z.array(EvidenceItemSchema),
    missingInformation: z.array(z.string()),
    relatedIssues: z.array(RelatedIssueSchema).max(3),
    recommendedNextStep: z.string(),
    proposedActions: z.array(ProposedActionSchema),
    containsEmbeddedInstructions: z.boolean(),
    limitations: z.array(z.string()),
  })
  .strict();

// Compile-time check that the zod-inferred type and lib/contract.ts's
// hand-written interface never silently drift apart: each must be
// assignable to the other. If TRD §3.1's shape changes in one place
// without the other, this fails to compile.
type InferredModelReport = z.infer<typeof ModelReportSchema>;
type _AssertInferredMatchesContract = InferredModelReport extends ModelReport
  ? ModelReport extends InferredModelReport
    ? true
    : never
  : never;
const _typeParityCheck: _AssertInferredMatchesContract = true;
void _typeParityCheck;
