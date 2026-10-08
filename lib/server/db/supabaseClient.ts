// Supabase client singleton. Uses the service-role key, backend-only,
// never exposed to any browser-reachable code path (PRD §9, Build Spec
// §4). Read directly from process.env here rather than lib/server/config.ts
// because spec 010's file cap doesn't include config.ts — these two
// env vars are the one pair this data layer needs and aren't shared
// with any other module.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[db] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — database calls will fail until both are configured."
  );
}

/**
 * The one Supabase client this backend uses. Always the service-role
 * key — RLS (spec 009) exists as defense-in-depth for any *other*
 * caller, not for this client, which bypasses it by design.
 */
export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl ?? "",
  supabaseServiceRoleKey ?? ""
);
