import type { ErrorCode } from "../contract";
export class BackendFailure extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}
export function failureCode(error: unknown, fallback: ErrorCode): ErrorCode {
  return error instanceof BackendFailure ? error.code : fallback;
}
