// issues table accessor. Thin wrapper around one parameterized insert
// — no business logic, no branching beyond "did the insert succeed."

import { supabaseClient } from "./supabaseClient";

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
    const { error } = await supabaseClient.from(ISSUES_TABLE).insert({
      run_id: params.runId,
      repo: params.repo,
      number: params.number,
      title: params.title,
      state: params.state,
      url: params.url,
      retrieved_at: params.retrievedAt,
    });

    if (error) {
      throw new Error(`Failed to create issue for run ${params.runId}: ${error.message}`);
    }
  },
};
