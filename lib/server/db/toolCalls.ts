// tool_calls table accessor. Thin wrapper around one parameterized
// insert — the audit trail of every GitHub read/search the harness
// made during a run.

import type { ErrorCode } from "../../contract";
import { supabaseClient } from "./supabaseClient";

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
    const { error } = await supabaseClient.from(TOOL_CALLS_TABLE).insert({
      run_id: params.runId,
      operation: params.operation,
      arguments: params.arguments,
      outcome: params.outcome,
      error_code: params.errorCode ?? null,
      duration_ms: params.durationMs ?? null,
    });

    if (error) {
      throw new Error(`Failed to create tool_call for run ${params.runId}: ${error.message}`);
    }
  },
};
