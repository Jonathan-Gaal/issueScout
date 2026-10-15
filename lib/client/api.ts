import type { ApiErrorBody, ErrorCode, Report } from "../contract";
import type { RunRow } from "../server/db/runs";
import { clientAuth } from "./firebase";
export type { RunRow };
export interface CreatedRun { runId: string; status: RunRow["status"]; report?: Report }
export interface RunDetail { run: RunRow; report: Report | null; actions: [] }
export class ApiFailure extends Error {
  constructor(public code: ErrorCode, message: string) { super(message); }
}
export function isAccessError(code: ErrorCode): boolean {
  switch (code) {
    case "unauthorized": return true;
    case "invalid_url": case "is_pull_request":
    case "not_found": case "issue_too_long": case "rate_limited": case "timeout":
    case "github_error": case "model_output_invalid": case "turn_limit":
    case "time_limit": case "run_rate_limited": case "write_failed": return false;
    default: { const exhaustive: never = code; return exhaustive; }
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/api/")) throw new Error("Invalid API path.");
  const user = clientAuth()?.currentUser;
  if (!user) throw new ApiFailure("unauthorized", "Please sign in to continue.");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as ApiErrorBody).error;
    throw new ApiFailure(error.code, error.message);
  }
  if (!response.ok || !body) throw new Error("The service could not return a report. Check your connection and try again.");
  return body as T;
}
