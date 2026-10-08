// reports table accessor. Persists the full Report jsonb object (TRD
// §3.1) exactly as returned to the client, through the query builder's
// parameterized .insert() method — this is the one place model-derived
// narrative text touches the database, and it never goes through raw
// SQL string interpolation (Build Spec §8.2).

import type { Report } from "../../contract";
import { supabaseClient } from "./supabaseClient";

export interface CreateReportParams {
  runId: string;
  report: Report;
}

/** Thrown when a second report insert is attempted for the same runId (spec 009's reports.run_id UNIQUE constraint). */
export class DuplicateReportError extends Error {
  constructor(runId: string) {
    super(`A report already exists for run ${runId}.`);
    this.name = "DuplicateReportError";
  }
}

const REPORTS_TABLE = "reports";
// Postgres unique_violation SQLSTATE code.
const UNIQUE_VIOLATION_CODE = "23505";

export const reports = {
  async create(params: CreateReportParams): Promise<void> {
    const { error } = await supabaseClient
      .from(REPORTS_TABLE)
      .insert({ run_id: params.runId, report: params.report });

    if (error) {
      if (error.code === UNIQUE_VIOLATION_CODE) {
        throw new DuplicateReportError(params.runId);
      }
      throw new Error(`Failed to create report for run ${params.runId}: ${error.message}`);
    }
  },
};
