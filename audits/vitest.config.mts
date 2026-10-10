import { defineConfig } from "vitest/config";

// Separate diagnostic suite: intentionally checks requirements not covered
// by the existing green suite. Failures are release blockers, not waived tests.
export default defineConfig({
  test: { include: ["audits/*.audit.ts"] },
});
