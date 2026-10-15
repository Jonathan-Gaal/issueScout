import { describe, expect, it } from "vitest";
import { buildApiErrorBody, getErrorDescriptor, getErrorStatus } from "../../lib/server/errors";
import type { ErrorCode } from "../../lib/contract";

// Mirrors the ErrorCode union in lib/contract.ts exactly (TRD §3.2). If a
// new code is added there without a corresponding test here, this list
// drifting from the union is the signal — the `satisfies` constraint in
// errors.ts already catches a missing map entry at compile time, so
// this test asserts behavior (status + message shape) per code.
const ALL_ERROR_CODES: ErrorCode[] = [
  "invalid_url",
  "is_pull_request",
  "not_found",
  "issue_too_long",
  "rate_limited",
  "timeout",
  "github_error",
  "model_output_invalid",
  "turn_limit",
  "time_limit",
  "unauthorized",
  "run_rate_limited",
  "write_failed",
];

// Guards TRD §3.2's "MUST NOT contain stack traces... raw upstream
// errors" rule at the one place all error messages originate.
const STACK_TRACE_SHAPED_PATTERN = /\bat \S+ \(.*:\d+:\d+\)|\.(js|ts):\d+/i;

describe("error map", () => {
  it.each(ALL_ERROR_CODES)("defines a status and message for '%s'", (code) => {
    const descriptor = getErrorDescriptor(code);
    expect(descriptor).toBeDefined();
    expect(typeof descriptor.status).toBe("number");
    expect(descriptor.status).toBeGreaterThanOrEqual(200);
    expect(descriptor.status).toBeLessThan(600);
    expect(typeof descriptor.message).toBe("string");
    expect(descriptor.message.length).toBeGreaterThan(0);
  });

  it.each(ALL_ERROR_CODES)("message for '%s' never contains 'Error:' or a stack trace", (code) => {
    const descriptor = getErrorDescriptor(code);
    expect(descriptor.message).not.toContain("Error:");
    expect(descriptor.message).not.toMatch(STACK_TRACE_SHAPED_PATTERN);
  });

  it("getErrorStatus returns the same status as getErrorDescriptor", () => {
    for (const code of ALL_ERROR_CODES) {
      expect(getErrorStatus(code)).toBe(getErrorDescriptor(code).status);
    }
  });

  it("buildApiErrorBody wraps the code and message in the TRD §3.2 error shape", () => {
    const body = buildApiErrorBody("not_found");
    expect(body).toEqual({
      error: {
        code: "not_found",
        message: getErrorDescriptor("not_found").message,
      },
    });
  });

  it("every ErrorCode union member has exactly one map entry (no duplicates, none missing)", () => {
    const uniqueCodes = new Set(ALL_ERROR_CODES);
    expect(uniqueCodes.size).toBe(ALL_ERROR_CODES.length);
    for (const code of uniqueCodes) {
      expect(() => getErrorDescriptor(code)).not.toThrow();
    }
  });
});
