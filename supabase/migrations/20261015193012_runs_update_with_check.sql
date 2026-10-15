-- Adds the missing WITH CHECK clause to runs_update_own (migrations/0001_init.sql
-- created this policy with USING only). Defense-in-depth: today's only writers
-- are admit_run/finish_run, SECURITY INVOKER functions granted exclusively to
-- service_role, which bypasses RLS regardless. This closes the gap for a future
-- authenticated-role write path.
alter policy runs_update_own on runs
  with check (user_id = auth.uid()::text);
