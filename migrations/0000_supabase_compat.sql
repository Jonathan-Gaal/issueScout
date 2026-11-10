-- Supabase compatibility shim for running the schema on plain Postgres
-- (e.g. Neon). Apply BEFORE 0001_init.sql and supabase/migrations/*.sql.
-- Idempotent: safe to re-run, and a no-op on a real Supabase project
-- (where these roles and auth.uid() already exist).
--
-- The migrations reference Supabase's built-in roles (revoke/grant) and
-- auth.uid() (RLS policies). Here auth.uid() always returns NULL, so the
-- RLS policies match no row for any non-owner role — the same
-- defense-in-depth stance as before. The app connects as the table
-- owner, which RLS does not apply to.

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
    END IF;
  END LOOP;
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULL::uuid $$;
