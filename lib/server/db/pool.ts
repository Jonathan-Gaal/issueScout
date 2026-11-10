// Postgres pool singleton (DATABASE_URL, e.g. a Neon pooled connection
// string). Backend-only, never exposed to any browser-reachable code
// path (PRD §9, Build Spec §4). Read directly from process.env here
// rather than lib/server/config.ts because this is the one variable this
// data layer needs and it isn't shared with any other module.
//
// The app connects as the table owner, so the schema's RLS policies
// (migrations/0001_init.sql) don't apply to it — they remain as
// defense-in-depth for any *other* role, as they did under the old
// service-role Supabase client.

import pg from "pg";

// Each serverless instance keeps a small pool; the provider's pooler
// multiplexes connections across instances.
const MAX_CONNECTIONS = 3;
// Matches the old Supabase client's 10s request abort.
const STATEMENT_TIMEOUT_MS = 10_000;
const CONNECT_TIMEOUT_MS = 10_000;

// timestamptz columns come back as ISO strings (RunRow's declared type),
// as they did from Supabase's REST API, instead of pg's default Date
// objects. Scoped to this pool rather than set globally on pg.types.
const TIMESTAMPTZ_OID = 1184;
const parseTimestampTz = pg.types.getTypeParser(TIMESTAMPTZ_OID);
const poolTypes = {
  getTypeParser: ((oid: number, format?: "text" | "binary") =>
    oid === TIMESTAMPTZ_OID
      ? (value: string) => (parseTimestampTz(value) as Date).toISOString()
      : pg.types.getTypeParser(oid, format)) as typeof pg.types.getTypeParser,
};

// Constructed lazily (on first actual use), not at module import time.
// Next.js's build-time route collection imports every route module to
// gather metadata, so constructing (and validating) here at import would
// crash `next build` in any environment without DATABASE_URL configured.
let cachedPool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (cachedPool) return cachedPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Database configuration is missing.");
  }

  cachedPool = new pg.Pool({
    connectionString,
    max: MAX_CONNECTIONS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    types: poolTypes,
  });
  return cachedPool;
}

/** Runs one parameterized statement. Values are always passed as $n parameters, never interpolated. */
export function query<Row extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<pg.QueryResult<Row>> {
  return getPool().query<Row>(text, values);
}
