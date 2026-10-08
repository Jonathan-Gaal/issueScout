-- IssueScout Phase 1 migration: runs, issues, tool_calls, reports.
-- Authoritative source: SCHEMA.md (columns, indexes, RLS policy shape).
-- Applied via the Supabase SQL editor directly — no migration-tool
-- dependency for a 2-person project (plan's explicit calibration).
--
-- actions/approvals/eval_results are NOT created here (Phase 2/3,
-- SCHEMA.md explicit "not created this cycle" per table) — their RLS
-- policy *shape* is documented in a comment block at the bottom of
-- this file so Phase 2/3 doesn't have to re-derive it later.

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  issue_url text NOT NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'stopped', 'failed')),
  stop_reason text
    CHECK (stop_reason IS NULL OR stop_reason IN (
      'completed', 'search_limit', 'read_limit', 'turn_limit', 'time_limit', 'tool_failure'
    )),
  error_code text,
  searches_used integer NOT NULL DEFAULT 0,
  reads_used integer NOT NULL DEFAULT 0,
  model_turns_used integer NOT NULL DEFAULT 0,
  duration_ms integer,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runs_user_id_created_at_idx ON runs (user_id, created_at DESC);

CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs (id),
  repo text NOT NULL,
  number integer NOT NULL,
  title text NOT NULL,
  state text NOT NULL,
  url text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX issues_run_id_idx ON issues (run_id);

CREATE TABLE tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs (id),
  operation text NOT NULL CHECK (operation IN ('read', 'search')),
  arguments jsonb NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('ok', 'error', 'refused')),
  error_code text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tool_calls_run_id_idx ON tool_calls (run_id);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL UNIQUE REFERENCES runs (id),
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The UNIQUE constraint on reports.run_id above also backs the one
-- lookup pattern (fetch the report for this run) — no separate index
-- needed beyond what UNIQUE already creates.

-- ============================================================
-- Row Level Security (PRD §9 finding #4 / US-7 — required, not
-- optional, despite the service-role-key bypass for today's only
-- caller). Policies scoped per SCHEMA.md's "Row Level Security"
-- section.
-- ============================================================

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- runs: SELECT/INSERT/UPDATE scoped to the owning user. No DELETE
-- policy — nothing in Phase 1 deletes a run, so no policy is defined
-- for it (RLS defaults to deny when no policy matches).
CREATE POLICY runs_select_own ON runs
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY runs_insert_own ON runs
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY runs_update_own ON runs
  FOR UPDATE USING (user_id = auth.uid()::text);

-- issues/tool_calls/reports: no direct user_id column — scoped via a
-- subquery against the owning run's user_id (SCHEMA.md: "this is why
-- the runs.user_id index also indirectly backs these tables' RLS
-- policy performance").
CREATE POLICY issues_select_via_run_owner ON issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = issues.run_id AND runs.user_id = auth.uid()::text)
  );

CREATE POLICY issues_insert_via_run_owner ON issues
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = issues.run_id AND runs.user_id = auth.uid()::text)
  );

CREATE POLICY tool_calls_select_via_run_owner ON tool_calls
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = tool_calls.run_id AND runs.user_id = auth.uid()::text)
  );

CREATE POLICY tool_calls_insert_via_run_owner ON tool_calls
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = tool_calls.run_id AND runs.user_id = auth.uid()::text)
  );

CREATE POLICY reports_select_via_run_owner ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = reports.run_id AND runs.user_id = auth.uid()::text)
  );

CREATE POLICY reports_insert_via_run_owner ON reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = reports.run_id AND runs.user_id = auth.uid()::text)
  );

-- ============================================================
-- Phase 2/3 RLS policy shape (documented now per SCHEMA.md's
-- instruction, NOT applied — these tables are not created this cycle).
--
-- actions (Phase 2, blocked on D4/D5):
--   No direct user_id column; scope via EXISTS against
--   runs.user_id = auth.uid() through actions.run_id, same pattern as
--   issues/tool_calls/reports above.
--
-- approvals (Phase 2):
--   Has its own user_id column (the approver) — scope SELECT/INSERT to
--   user_id = auth.uid() directly, same pattern as runs above.
--
-- eval_results (Phase 3):
--   No user_id column at all (grouped by eval_run_id, not per-user) —
--   when this table is created, revisit whether eval access should be
--   service-role-only (no end-user RLS policy needed) or scoped some
--   other way; not decided here since no eval-ownership model exists
--   yet in the PRD.
-- ============================================================
