// runs table accessors — carries PRD §9 finding #2's ownership-
// enforcement weight. Every per-resource read function takes userId
// as a required parameter baked into the query's filter itself (TRD
// §3.2/§4: "the ownership check is in the query predicate itself"),
// never a fetch-then-check-in-application-code pattern.

import type { ErrorCode, StopReason } from "../../contract";
import { supabaseClient } from "./supabaseClient";

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

export const runs = {
  /** Creates a new run row, owned by userId. Returns the created row. */
  async create(params: CreateRunParams): Promise<RunRow> {
    const { data, error } = await supabaseClient
      .from(RUNS_TABLE)
      .insert({ user_id: params.userId, issue_url: params.issueUrl })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create run: ${error?.message ?? "unknown error"}`);
    }
    return data as RunRow;
  },

  /** Updates a run's terminal fields (status, stop reason, counters, etc.). */
  async updateStatus(runId: string, params: UpdateRunStatusParams): Promise<void> {
    const updatePayload: Record<string, unknown> = { status: params.status };
    if (params.stopReason !== undefined) updatePayload.stop_reason = params.stopReason;
    if (params.errorCode !== undefined) updatePayload.error_code = params.errorCode;
    if (params.searchesUsed !== undefined) updatePayload.searches_used = params.searchesUsed;
    if (params.readsUsed !== undefined) updatePayload.reads_used = params.readsUsed;
    if (params.modelTurnsUsed !== undefined) updatePayload.model_turns_used = params.modelTurnsUsed;
    if (params.durationMs !== undefined) updatePayload.duration_ms = params.durationMs;
    if (params.finishedAt !== undefined) updatePayload.finished_at = params.finishedAt;

    const { error } = await supabaseClient.from(RUNS_TABLE).update(updatePayload).eq("id", runId);
    if (error) {
      throw new Error(`Failed to update run ${runId}: ${error.message}`);
    }
  },

  /**
   * Counts how many runs this user has started in the last hour — the
   * count source injected into rateLimiter.ts's checkRunRate (spec 007b).
   */
  async countInLastHour(userId: string): Promise<number> {
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabaseClient
      .from(RUNS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgoIso);

    if (error) {
      throw new Error(`Failed to count runs for user ${userId}: ${error.message}`);
    }
    return count ?? 0;
  },

  /**
   * Lists this user's own runs, newest first — user_id is a required
   * parameter baked into the query itself (US-5's "only that user's
   * runs" guarantee), never an optional filter a caller could omit.
   */
  async list(userId: string, limit: number): Promise<RunRow[]> {
    const { data, error } = await supabaseClient
      .from(RUNS_TABLE)
      .select()
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list runs for user ${userId}: ${error.message}`);
    }
    return (data ?? []) as RunRow[];
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
    const { data, error } = await supabaseClient
      .from(RUNS_TABLE)
      .select()
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch run ${id}: ${error.message}`);
    }
    return (data as RunRow | null) ?? null;
  },
};
