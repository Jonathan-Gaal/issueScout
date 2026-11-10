// reports table accessor. Persists the full Report jsonb object (TRD
// §3.1) exactly as returned to the client, through a parameterized
// INSERT ($n placeholders) — this is the one place model-derived
// narrative text touches the database, and it never goes through raw
// SQL string interpolation (Build Spec §8.2).

import type { Report } from "../../contract";
import { query } from "./pool";

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
  /** The report for runId, only if that run is owned by userId (ownership is in the join predicate itself). */
  async getOwned(runId: string, userId: string): Promise<Report | null> {
    try {
      const result = await query<{ report: Report }>(
        `SELECT r.report FROM ${REPORTS_TABLE} r
         JOIN runs ON runs.id = r.run_id
         WHERE r.run_id = $1 AND runs.user_id = $2`,
        [runId, userId]
      );
      return result.rows[0]?.report ?? null;
    } catch {
      throw new Error("Report lookup failed.");
    }
  },
  async create(params: CreateReportParams): Promise<void> {
    try {
      await query(`INSERT INTO ${REPORTS_TABLE} (run_id, report) VALUES ($1, $2::jsonb)`, [
        params.runId,
        JSON.stringify(params.report),
      ]);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION_CODE) {
        throw new DuplicateReportError(params.runId);
      }
      throw new Error(`Failed to create report for run ${params.runId}: ${(error as Error).message}`);
    }
  },
};
