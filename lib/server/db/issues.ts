// issues table accessor. Thin wrapper around one parameterized insert
// — no business logic, no branching beyond "did the insert succeed."

import { query } from "./pool";

export interface CreateIssueParams {
  runId: string;
  repo: string;
  number: number;
  title: string;
  state: string;
  url: string;
  retrievedAt: string;
}

const ISSUES_TABLE = "issues";

export const issues = {
  async create(params: CreateIssueParams): Promise<void> {
    try {
      await query(
        `INSERT INTO ${ISSUES_TABLE} (run_id, repo, number, title, state, url, retrieved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [params.runId, params.repo, params.number, params.title, params.state, params.url, params.retrievedAt]
      );
    } catch (error) {
      throw new Error(`Failed to create issue for run ${params.runId}: ${(error as Error).message}`);
    }
  },
};
