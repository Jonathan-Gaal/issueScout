// tool_calls table accessor. Thin wrapper around one parameterized
// insert — the audit trail of every GitHub read/search the harness
// made during a run.

import type { ErrorCode } from "../../contract";
import { query } from "./pool";

export interface CreateToolCallParams {
  runId: string;
  operation: "read" | "search";
  arguments: Record<string, unknown>;
  outcome: "ok" | "error" | "refused";
  errorCode?: ErrorCode;
  durationMs?: number;
}

const TOOL_CALLS_TABLE = "tool_calls";

export const toolCalls = {
  async create(params: CreateToolCallParams): Promise<void> {
    try {
      await query(
        `INSERT INTO ${TOOL_CALLS_TABLE} (run_id, operation, arguments, outcome, error_code, duration_ms)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6)`,
        [
          params.runId,
          params.operation,
          JSON.stringify(params.arguments),
          params.outcome,
          params.errorCode ?? null,
          params.durationMs ?? null,
        ]
      );
    } catch (error) {
      throw new Error(`Failed to create tool_call for run ${params.runId}: ${(error as Error).message}`);
    }
  },
};
