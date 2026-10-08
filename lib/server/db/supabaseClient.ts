// Supabase client singleton. Uses the service-role key, backend-only,
// never exposed to any browser-reachable code path (PRD §9, Build Spec
// §4). Read directly from process.env here rather than lib/server/config.ts
// because spec 010's file cap doesn't include config.ts — these two
// env vars are the one pair this data layer needs and aren't shared
// with any other module.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Constructed lazily (on first actual use), not at module import time.
// Next.js's build-time route collection imports every route module to
// gather metadata, which would otherwise construct this client (and
// `createClient` throws synchronously on an empty URL) even when no
// request ever runs — crashing `next build` in any environment without
// real Supabase env vars configured yet, including this one.
let cachedSupabaseClient: SupabaseClient | undefined;

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn(
      "[db] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — database calls will fail until both are configured."
    );
  }

  // Always the service-role key — RLS (spec 009) exists as
  // defense-in-depth for any *other* caller, not for this client,
  // which bypasses it by design.
  return createClient(supabaseUrl ?? "http://localhost:54321", supabaseServiceRoleKey ?? "placeholder-key");
}

function getSupabaseClient(): SupabaseClient {
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createSupabaseClient();
  }
  return cachedSupabaseClient;
}

/**
 * The one Supabase client this backend uses, proxied so every property
 * access lazily constructs the real client on first use rather than at
 * import time (see above).
 */
export const supabaseClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, propertyKey) {
    const client = getSupabaseClient();
    const value = client[propertyKey as keyof SupabaseClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
