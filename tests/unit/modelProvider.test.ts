import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sampleTool = {
  name: "github_issue_research",
  description: "Read or search GitHub issues.",
  inputSchema: { type: "object" as const, properties: { operation: { type: "string" } } },
};

const sampleParams = {
  systemPrompt: "You are IssueScout.",
  messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "Triage issue 42." }] }],
  tools: [sampleTool],
  maxOutputTokens: 4000,
};

describe("AnthropicProvider", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    vi.resetModules();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
    vi.restoreAllMocks();
  });

  it("normalizes a tool-call response into the shared ModelResponse shape", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "tool_use", id: "tool_1", name: "github_issue_research", input: { operation: "read" } }],
      stop_reason: "tool_use",
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class MockAnthropic {
        messages = { create: mockCreate };
      },
    }));

    const { AnthropicProvider } = await import("../../lib/server/model/anthropicProvider");
    const provider = new AnthropicProvider();
    const result = await provider.complete(sampleParams);

    expect(result).toEqual({
      content: [{ type: "tool_use", id: "tool_1", name: "github_issue_research", input: { operation: "read" } }],
      stopReason: "tool_use",
    });
  });

  it("normalizes a final-text response into the shared ModelResponse shape", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "Final report JSON here." }],
      stop_reason: "end_turn",
    });
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class MockAnthropic {
        messages = { create: mockCreate };
      },
    }));

    const { AnthropicProvider } = await import("../../lib/server/model/anthropicProvider");
    const provider = new AnthropicProvider();
    const result = await provider.complete(sampleParams);

    expect(result).toEqual({
      content: [{ type: "text", text: "Final report JSON here." }],
      stopReason: "end_turn",
    });
  });

  it("throws ModelProviderConfigError at construction when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.doMock("@anthropic-ai/sdk", () => ({
      default: class MockAnthropic {
        messages = { create: vi.fn() };
      },
    }));

    const { AnthropicProvider } = await import("../../lib/server/model/anthropicProvider");
    const { ModelProviderConfigError } = await import("../../lib/server/model/types");
    expect(() => new AnthropicProvider()).toThrow(ModelProviderConfigError);
  });
});

describe("GroqProvider", () => {
  const originalApiKey = process.env.GROQ_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-groq-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalApiKey;
    vi.unstubAllGlobals();
  });

  it("normalizes Groq's OpenAI-compatible tool-call response into ModelResponse", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: { name: "github_issue_research", arguments: '{"operation":"read"}' },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
        }),
        { status: 200 }
      )
    );

    const { GroqProvider } = await import("../../lib/server/model/groqProvider");
    const provider = new GroqProvider();
    const result = await provider.complete(sampleParams);

    expect(result).toEqual({
      content: [{ type: "tool_use", id: "call_1", name: "github_issue_research", input: { operation: "read" } }],
      stopReason: "tool_use",
    });
  });

  it("normalizes a final-text Groq response into ModelResponse", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "Final report text." }, finish_reason: "stop" }],
        }),
        { status: 200 }
      )
    );

    const { GroqProvider } = await import("../../lib/server/model/groqProvider");
    const provider = new GroqProvider();
    const result = await provider.complete(sampleParams);

    expect(result).toEqual({
      content: [{ type: "text", text: "Final report text." }],
      stopReason: "end_turn",
    });
  });

  it("throws ModelProviderConfigError at construction when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const { GroqProvider } = await import("../../lib/server/model/groqProvider");
    const { ModelProviderConfigError } = await import("../../lib/server/model/types");
    expect(() => new GroqProvider()).toThrow(ModelProviderConfigError);
  });
});

describe("getModelProvider", () => {
  const originalModelProvider = process.env.MODEL_PROVIDER;
  const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const originalGroqApiKey = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.MODEL_PROVIDER = originalModelProvider;
    process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey;
    process.env.GROQ_API_KEY = originalGroqApiKey;
  });

  it("returns an AnthropicProvider instance when config.modelProvider === 'anthropic'", async () => {
    process.env.MODEL_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    const { getModelProvider } = await import("../../lib/server/model/index");
    const { AnthropicProvider } = await import("../../lib/server/model/anthropicProvider");
    expect(getModelProvider()).toBeInstanceOf(AnthropicProvider);
  });

  it("returns a GroqProvider instance when config.modelProvider === 'groq'", async () => {
    process.env.MODEL_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key";
    const { getModelProvider } = await import("../../lib/server/model/index");
    const { GroqProvider } = await import("../../lib/server/model/groqProvider");
    expect(getModelProvider()).toBeInstanceOf(GroqProvider);
  });
});
