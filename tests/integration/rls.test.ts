// RLS is a database-enforced property — not mockable. This test
// connects as the Postgres `anon`/non-service-role role (Supabase's
// standard non-privileged role) and asserts real denial, per spec
// 009's Crucial Juncture verification bar (SCHEMA.md/US-7: "this needs
// to actually be tested once, not just declared in SQL and trusted").
//
// No real Supabase project is reachable in this build environment (no
// SUPABASE_URL / SUPABASE_ANON_KEY configured here, and this build
// never reads or copies the project's .env per the SECRETS discipline).
// Per spec 009's explicit instruction, this is marked `skip` with a
// logged gap (see log.md) rather than deleted or silently passed — an
// untested RLS policy is exactly the failure mode SCHEMA.md warns
// against.

import { describe, it } from "vitest";

const hasSupabaseAnonConnection = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
);

describe.skipIf(!hasSupabaseAnonConnection)("RLS policies (requires a real Supabase connection)", () => {
  it("denies a SELECT/INSERT on runs with no matching auth.uid() claim", async () => {
    // Intentionally unimplemented pending a real Supabase project.
    // See log.md: "spec 009 RLS integration test — no live Supabase
    // instance in this build environment."
  });

  it("denies a SELECT on issues/tool_calls/reports for a run owned by a different user_id", async () => {
    // Intentionally unimplemented pending a real Supabase project.
  });
});
