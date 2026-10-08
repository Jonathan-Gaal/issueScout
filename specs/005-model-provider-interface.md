# 005 — Model provider interface (Anthropic primary, Groq best-effort swap)

## [SPEC]

- **Objective**: Build the `ModelProvider` interface and its two implementations (Anthropic, Groq) behind one factory function, so the harness calls one normalized `complete()` method regardless of which provider is configured (D2) — isolating the provider swap to this one file set, per TRD §6's risk note on provider-swap behavior drift.
- **Inputs/Outputs**: `ModelProvider.complete(params: { messages: ModelMessage[]; tools: ToolDefinition[]; maxOutputTokens: number }): Promise<ModelResponse>` — shape per the plan's "Model provider interface" section. `ModelMessage`/`ModelResponse`/`ToolDefinition` are this spec's own normalized types (not a TRD-defined API contract — TRD §3 covers the *backend's* external API, not this internal provider seam, so no TRD citation applies here beyond the constants below). `maxOutputTokens` is `config.maxOutputTokens` (D7, from spec 002). The `github_issue_research` tool definition passed in `tools` is built by spec 007 and referenced, not redefined, here.
- **Design Pattern**: Interface + two implementations + factory (`getModelProvider()`), exactly as the plan specifies — justified because this seam is both the D2 provider-swap point and the test-mocking seam spec 008/013 inject a fake `ModelProvider` against. Not a speculative abstraction: two real call sites (Anthropic, Groq) already exist.
- **Bounded-AI boundary**: This spec's own code is deterministic (HTTP/SDK plumbing, response normalization). The eventual model output it transports is LLM-generated, but this spec does not interpret or validate that output's content — structure validation is spec 004/008's job, not this provider layer's.
- **Verification Oracle**: `npx vitest run tests/unit/modelProvider.test.ts` — new unit tests against a mocked Anthropic SDK client and a mocked `fetch` (for Groq): `AnthropicProvider.complete()` normalizes a tool-call response and a final-text response into the shared `ModelResponse` shape; `GroqProvider.complete()` does the same against Groq's OpenAI-compatible JSON shape; `getModelProvider()` returns an `AnthropicProvider` instance when `config.modelProvider === "anthropic"` and a `GroqProvider` instance when `"groq"`, verified via `instanceof` or a provider-tag property, not by calling the real network.
- **Intellectual Control**: Normalizing both providers to one `ModelResponse` shape inside each provider's own file (not inside the harness) means the harness code written in spec 008 never branches on provider — a provider-specific quirk (Groq's looser tool-calling JSON, per TRD §6's named risk) is contained to `groqProvider.ts` and caught by spec 004's schema validation regardless, exactly as TRD §6 states: "zod structure validation catches this regardless of provider by design."
- **Constraints**: `@anthropic-ai/sdk` for Anthropic (pre-authorized); native `fetch` for Groq, no second SDK (Groq's OpenAI-compatible REST surface is simple enough per the plan's own dependency reasoning — don't add an OpenAI-compatible client library for this). Groq support is explicitly best-effort — this spec builds it, but it is not required to pass any acceptance test in spec 013 (PRD §7, plan's "Groq caveat"). No API key or model name is hardcoded outside `config.ts` (spec 002) — this spec reads `config.anthropicApiKey`/`config.anthropicModel`/`config.groqApiKey`/`config.groqModel` only.
- **Edge Cases**: A missing API key for the currently-configured provider (e.g., `config.modelProvider === "groq"` but `GROQ_API_KEY` unset) surfaces as a clear thrown error at provider construction, not a confusing failure deep in a `complete()` call. Anthropic/Groq network failure or non-2xx response is caught and normalized to a typed error result the harness can map to `model_output_invalid` or a retry — never an uncaught exception reaching the route handler as a raw stack trace (TRD §3.2's "MUST NOT contain... raw upstream errors," which this provider layer is one of the sources of).
- **UI States**: N/A — no UI files.
- **Files** (≤5):
  1. `lib/server/model/types.ts` — new.
  2. `lib/server/model/anthropicProvider.ts` — new.
  3. `lib/server/model/groqProvider.ts` — new.
  4. `lib/server/model/index.ts` — new (`getModelProvider()` factory).
  5. `tests/unit/modelProvider.test.ts` — new.

**References (≤3):** `lib/server/config.ts` (spec 002, provider selection + API keys/models), TRD.md §3.3 (tool contract the `tools` param carries, built in spec 007).

[FORCES]
1. One normalized response shape owned by each provider file > branching on provider inside the harness.
2. Simplicity > Pattern purity (always present unless explicitly overridden).
