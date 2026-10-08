import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logRunEvent } from "../../lib/server/logger";

describe("logRunEvent", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("a valid call compiles and logs the expected structured output", () => {
    logRunEvent("run-1", "run_stopped", { stopReason: "turn_limit", searchesRun: 2 });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedPayload).toEqual({
      runId: "run-1",
      event: "run_stopped",
      stopReason: "turn_limit",
      searchesRun: 2,
    });
  });

  it("a call with no meta still logs runId and event", () => {
    logRunEvent("run-2", "run_started");

    const loggedPayload = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedPayload).toEqual({ runId: "run-2", event: "run_started" });
  });

  it("a validation_removal event may carry a short removedIdentifier, never free text", () => {
    logRunEvent("run-3", "validation_removal", { removedIdentifier: "suggestedLabel:invented-label" });

    const loggedPayload = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedPayload.removedIdentifier).toBe("suggestedLabel:invented-label");
  });

  it("rejects a free-text issueBody field as meta — compile-time enforcement, not runtime scrubbing", () => {
    // @ts-expect-error — LogMeta has no free-text field; a caller
    // attempting to log an issue body (or a whole Report object) must
    // fail to compile, per PRD §9 Observability's structural
    // enforcement rule.
    logRunEvent("run-4", "run_completed", { issueBody: "some text from the issue" });

    // This line only runs if the @ts-expect-error above is wrong (i.e.
    // if TypeScript did NOT reject the call) — the real assertion is
    // the compile-time rejection itself, verified by `tsc --noEmit`
    // failing without the @ts-expect-error comment present.
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
