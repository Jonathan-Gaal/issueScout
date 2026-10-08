// Structured run-event logger. PRD §9 Observability's "never issue
// bodies, comments, tokens, or personal data" rule is enforced as a
// type constraint on LogMeta, not a reviewed convention — there is no
// free-text/body field anywhere in this type, so "accidentally logged
// the issue body" is a compile error at the call site, not a runtime
// filtering decision (TRD §4).

/** Matches PRD §9's "Key events to log" list exactly. */
export type RunLogEvent =
  | "run_started"
  | "run_completed"
  | "run_stopped"
  | "run_failed"
  | "tool_call"
  | "validation_removal";

/** Short, enum-shaped string codes — never free text. */
export type LogStopReasonCode =
  | "completed"
  | "search_limit"
  | "read_limit"
  | "turn_limit"
  | "time_limit"
  | "tool_failure";

export type LogOutcomeCode = "ok" | "error" | "refused";
export type LogOperationCode = "read" | "search";

/**
 * Permits only numeric counts, short enum-shaped codes, and short
 * identifiers (label names, issue numbers) — explicitly no `string`
 * catch-all a caller could stuff issue/comment text into. A caller
 * attempting to pass a free-text field (or a whole Report object) is
 * rejected by TypeScript at the call site, not filtered at runtime.
 */
export interface LogMeta {
  searchesRun?: number;
  searchesFailed?: number;
  candidatesRead?: number;
  modelTurnsUsed?: number;
  durationMs?: number;
  stopReason?: LogStopReasonCode;
  errorCode?: string;
  outcome?: LogOutcomeCode;
  operation?: LogOperationCode;
  /** The name of what a validation-removal event stripped (a label name or issue number as a short identifier) — never the underlying free-text content. */
  removedIdentifier?: string;
}

/**
 * Logs one structured run event. `meta`'s restrictive LogMeta type is
 * the actual enforcement mechanism (see module docstring) — this
 * function itself does no scrubbing, because the type already
 * forecloses the mistake before any value reaches here.
 */
export function logRunEvent(runId: string, event: RunLogEvent, meta?: LogMeta): void {
  console.log(JSON.stringify({ runId, event, ...meta }));
}
