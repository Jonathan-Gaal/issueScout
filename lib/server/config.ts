// Single config module. Every later file reads `config.X`, never
// `process.env.X` directly — this is what makes the placeholder
// decisions below greppable in one place instead of scattered across
// route handlers (see spec 002, CLAUDE.md). Each is tagged exactly
// once, on the `config` object assignment below (not duplicated here
// on the type declaration), so the grep count stays meaningful.
//
// No env-schema library here on purpose — per the approved build plan's
// "don't over-engineer" calibration, this is a flat object with env
// reads and defaults, nothing more.

export type ModelProviderName = "anthropic" | "groq";
export type AuthProviderName = "firebase";

export interface AppConfig {
  // D2: model provider choice.
  modelProvider: ModelProviderName;
  anthropicApiKey: string | undefined;
  anthropicModel: string;
  groqApiKey: string | undefined;
  groqModel: string;

  // D3: GitHub read token scope.
  githubReadToken: string | undefined; // may be undefined in dev; warn, don't crash

  // D6/D7/D8: issue size / output token / rate-limit constants.
  issueMaxChars: number;
  maxOutputTokens: number;
  runsPerUserPerHour: number;

  // D9: auth provider + allowlist.
  authProvider: AuthProviderName;
  allowedUserEmails: string[];

  // CORS — non-wildcard explicit allowlist (PRD §9 finding #5). This is
  // a hard security requirement, not an open product decision, so it
  // carries no placeholder tag.
  corsAllowedOrigins: string[];

  // Fixed harness limits (Build Spec §7 / TRD §3.3) — constants, not
  // owner decisions, so they carry no placeholder tag.
  maxSearches: number;
  maxSearchResults: number;
  maxCandidateReads: number;
  maxCommentsPerIssue: number;
  requestTimeoutSeconds: number;
  maxRetriesPerRequest: number;
  maxModelTurns: number;
  maxRunSeconds: number;
  maxFormatRetries: number;
}

function parseCorsAllowedOrigins(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }
  return rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseAllowedUserEmails(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }
  return rawValue
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function positiveLimit(name: string, fallback: number, maximum: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`Invalid configuration: ${name}`);
  return value;
}
export const config: AppConfig = {
  // D2 — CONFIRM BEFORE SHIPPING: Anthropic vs Groq final choice.
  modelProvider: (process.env.MODEL_PROVIDER as ModelProviderName) ?? "anthropic",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",

  // D3 — CONFIRM BEFORE SHIPPING: confirm fine-grained PAT scope.
  githubReadToken: process.env.GITHUB_READ_TOKEN,

  // D6/D7/D8 — CONFIRM BEFORE SHIPPING with Ivaylo: issue size cap,
  // model output token cap, and per-user hourly run cap.
  issueMaxChars: positiveLimit("ISSUE_MAX_CHARS", 20000, 100000),
  maxOutputTokens: positiveLimit("MAX_OUTPUT_TOKENS", 4000, 16000),
  runsPerUserPerHour: positiveLimit("RUNS_PER_USER_PER_HOUR", 10, 100),

  // D9: Firebase confirmed by Ivaylo on October 10, 2026.
  authProvider: (process.env.AUTH_PROVIDER as AuthProviderName) ?? "firebase",
  allowedUserEmails: parseAllowedUserEmails(process.env.ALLOWED_USER_EMAILS),

  corsAllowedOrigins: parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),

  // Fixed harness limits (Build Spec §7 / TRD §3.3).
  maxSearches: 3,
  maxSearchResults: 10,
  maxCandidateReads: 5,
  maxCommentsPerIssue: 20,
  requestTimeoutSeconds: 20,
  maxRetriesPerRequest: 1,
  maxModelTurns: 15,
  maxRunSeconds: 120,
  maxFormatRetries: 1,
};

if (!config.githubReadToken) {
  console.warn(
    "[config] GITHUB_READ_TOKEN not set — unauthenticated GitHub requests are limited to 60/hr."
  );
}
