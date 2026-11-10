// runs table accessors — carries PRD §9 finding #2's ownership-
// enforcement weight. Every per-resource read function takes userId
// as a required parameter baked into the query's filter itself (TRD
// §3.2/§4: "the ownership check is in the query predicate itself"),
// never a fetch-then-check-in-application-code pattern.

import type { ErrorCode, StopReason } from "../../contract";
import { query } from "./pool";

export type RunStatus = "running" | "completed" | "stopped" | "failed";

export interface RunRow {
  id: string;
  user_id: string;
  issue_url: string;
  status: RunStatus;
  stop_reason: StopReason | null;
  error_code: ErrorCode | null;
  searches_used: number;
  reads_used: number;
  model_turns_used: number;
  duration_ms: number | null;
  finished_at: string | null;
  created_at: string;
}

export interface CreateRunParams {
  userId: string;
  issueUrl: string;
}

export interface UpdateRunStatusParams {
  status: RunStatus;
  stopReason?: StopReason;
  errorCode?: ErrorCode;
  searchesUsed?: number;
  readsUsed?: number;
  modelTurnsUsed?: number;
  durationMs?: number;
  finishedAt?: string;
}

const RUNS_TABLE = "runs";

// Whitelisted column for each optional UpdateRunStatusParams field — the
// only identifiers that ever reach the SET clause; values are always $n.
const UPDATE_COLUMNS: Record<Exclude<keyof UpdateRunStatusParams, "status">, string> = {
  stopReason: "stop_reason",
  errorCode: "error_code",
  searchesUsed: "searches_used",
  readsUsed: "reads_used",
  modelTurnsUsed: "model_turns_used",
  durationMs: "duration_ms",
  finishedAt: "finished_at",
};

export const runs = {
  async admit(params: CreateRunParams, limit: number): Promise<RunRow | null> {
    try {
      const result = await query<RunRow>("SELECT * FROM public.admit_run($1, $2, $3)", [params.userId, params.issueUrl, limit]);
      return result.rows[0] ?? null;
    } catch {
      throw new Error("Run admission failed.");
    }
  },
  async finish(runId: string, userId: string, repo: string, outcome: unknown, durationMs: number): Promise<void> {
    try {
      await query("SELECT public.finish_run($1, $2, $3, $4::jsonb, $5)", [runId, userId, repo, JSON.stringify(outcome), durationMs]);
    } catch {
      throw new Error("Run persistence failed.");
    }
  },
  /** Creates a new run row, owned by userId. Returns the created row. */
  async create(params: CreateRunParams): Promise<RunRow> {
    try {
      const result = await query<RunRow>(
        `INSERT INTO ${RUNS_TABLE} (user_id, issue_url) VALUES ($1, $2) RETURNING *`,
        [params.userId, params.issueUrl]
      );
      if (!result.rows[0]) throw new Error("no row returned");
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create run: ${(error as Error).message}`);
    }
  },

  /** Updates a run's terminal fields (status, stop reason, counters, etc.). */
  async updateStatus(runId: string, params: UpdateRunStatusParams): Promise<void> {
    const assignments = ["status = $1"];
    const values: unknown[] = [params.status];
    for (const [field, column] of Object.entries(UPDATE_COLUMNS) as [keyof typeof UPDATE_COLUMNS, string][]) {
      if (params[field] !== undefined) {
        values.push(params[field]);
        assignments.push(`${column} = $${values.length}`);
      }
    }
    values.push(runId);

    try {
      await query(`UPDATE ${RUNS_TABLE} SET ${assignments.join(", ")} WHERE id = $${values.length}`, values);
    } catch (error) {
      throw new Error(`Failed to update run ${runId}: ${(error as Error).message}`);
    }
  },

  /**
   * Counts how many runs this user has started in the last hour — the
   * count source injected into rateLimiter.ts's checkRunRate (spec 007b).
   */
  async countInLastHour(userId: string): Promise<number> {
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    try {
      const result = await query<{ count: number }>(
        `SELECT count(*)::int AS count FROM ${RUNS_TABLE} WHERE user_id = $1 AND created_at >= $2`,
        [userId, oneHourAgoIso]
      );
      return result.rows[0]?.count ?? 0;
    } catch (error) {
      throw new Error(`Failed to count runs for user ${userId}: ${(error as Error).message}`);
    }
  },

  /**
   * Whether this user has ever started a run before, for the
   * user_first_run observability event (session work: shared-credential-
   * exposure detection). Cheap: user_id is the leading column of the
   * existing composite index, and EXISTS stops at the first match. Must
   * be called before admit() reserves the current run's own row, or it
   * would always see itself and report true.
   */
  async hasRunBefore(userId: string): Promise<boolean> {
    try {
      const result = await query<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM ${RUNS_TABLE} WHERE user_id = $1) AS exists`,
        [userId]
      );
      return result.rows[0]?.exists ?? false;
    } catch (error) {
      throw new Error(`Failed to check run history for user ${userId}: ${(error as Error).message}`);
    }
  },

  /**
   * Lists this user's own runs, newest first — user_id is a required
   * parameter baked into the query itself (US-5's "only that user's
   * runs" guarantee), never an optional filter a caller could omit.
   */
  async list(userId: string, limit: number): Promise<RunRow[]> {
    try {
      const result = await query<RunRow>(
        `SELECT * FROM ${RUNS_TABLE} WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to list runs for user ${userId}: ${(error as Error).message}`);
    }
  },

  /**
   * Fetches one run only if owned by userId — WHERE id = :id AND
   * user_id = :userId, never an unscoped fetch followed by a
   * comparison. Returns null for both "doesn't exist" and "exists but
   * owned by someone else" — collapsing those two cases here is what
   * lets the route handler (spec 013) implement "never leak existence
   * of another user's run" without having to remember to do it itself.
   */
  async getOwned(id: string, userId: string): Promise<RunRow | null> {
    try {
      const result = await query<RunRow>(`SELECT * FROM ${RUNS_TABLE} WHERE id = $1 AND user_id = $2`, [id, userId]);
      return result.rows[0] ?? null;
    } catch (error) {
      throw new Error(`Failed to fetch run ${id}: ${(error as Error).message}`);
    }
  },
};
