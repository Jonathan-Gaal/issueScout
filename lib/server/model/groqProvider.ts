// Groq implementation of ModelProvider. Best-effort swap (D2 caveat,
// PRD §7, plan's "Groq caveat" note) — not required to pass any
// acceptance test. Uses native fetch against Groq's OpenAI-compatible
// REST surface, no second SDK (dependency-triage: too simple to earn
// one).

import { config } from "../config";
import {
  ModelProviderConfigError,
  type ModelCompletionParams,
  type ModelContentBlock,
  type ModelProvider,
  type ModelResponse,
  type ModelStopReason,
  type ToolDefinition,
} from "./types";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface GroqChoiceMessage {
  role: string;
  content: string | null;
  tool_calls?: GroqToolCall[];
}

interface GroqChatCompletionResponse {
  choices: Array<{
    message: GroqChoiceMessage;
    finish_reason: string;
  }>;
}

function toGroqTool(toolDefinition: ToolDefinition): Record<string, unknown> {
  return {
    type: "function",
    function: {
      name: toolDefinition.name,
      description: toolDefinition.description,
      parameters: {
        type: "object",
        properties: toolDefinition.inputSchema.properties,
        required: toolDefinition.inputSchema.required,
      },
    },
  };
}

function toGroqMessages(params: ModelCompletionParams): Array<Record<string, unknown>> {
  const systemMessage = { role: "system", content: params.systemPrompt };
  const conversationMessages: Array<Record<string, unknown>> = [];
  for (const message of params.messages) {
    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    const calls = message.content.filter(b => b.type === "tool_use").map(b => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input) } }));
    if (text || calls.length) conversationMessages.push({ role: message.role, content: text || null, ...(calls.length ? { tool_calls: calls } : {}) });
    for (const block of message.content) if (block.type === "tool_result") conversationMessages.push({ role: "tool", tool_call_id: block.toolUseId, content: block.content });
  }
  return [systemMessage, ...conversationMessages];
}

function toGroqStopReason(finishReason: string): ModelStopReason {
  if (finishReason === "tool_calls") {
    return "tool_use";
  }
  if (finishReason === "stop") {
    return "end_turn";
  }
  if (finishReason === "length") {
    return "max_tokens";
  }
  return "other";
}

function normalizeGroqMessage(message: GroqChoiceMessage): ModelContentBlock[] {
  const blocks: ModelContentBlock[] = [];
  if (message.content) {
    blocks.push({ type: "text", text: message.content });
  }
  for (const toolCall of message.tool_calls ?? []) {
    let parsedInput: unknown = {};
    try {
      parsedInput = JSON.parse(toolCall.function.arguments);
    } catch {
      // Malformed tool-call arguments JSON from Groq — a known
      // best-effort risk (TRD §6). Leave input as {} rather than
      // throwing; zod structure validation downstream catches this
      // regardless of provider, per TRD §6.
      parsedInput = {};
    }
    blocks.push({
      type: "tool_use",
      id: toolCall.id,
      name: toolCall.function.name,
      input: parsedInput,
    });
  }
  return blocks;
}

export class GroqProvider implements ModelProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    if (!config.groqApiKey) {
      throw new ModelProviderConfigError("GROQ_API_KEY is not set but modelProvider is 'groq'.");
    }
    this.apiKey = config.groqApiKey;
    this.model = config.groqModel;
  }

  async complete(params: ModelCompletionParams): Promise<ModelResponse> {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      signal: AbortSignal.any([AbortSignal.timeout(config.requestTimeoutSeconds * 1000), ...(params.signal ? [params.signal] : [])]),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: params.maxOutputTokens,
        messages: toGroqMessages(params),
        tools: params.tools.map(toGroqTool),
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq chat completion failed with status ${response.status}`);
    }

    const parsedResponse = (await response.json()) as GroqChatCompletionResponse;
    const firstChoice = parsedResponse.choices?.[0];
    if (!firstChoice?.message || typeof firstChoice.finish_reason !== "string") throw new Error("Malformed model response");

    return {
      content: normalizeGroqMessage(firstChoice.message),
      stopReason: toGroqStopReason(firstChoice.finish_reason),
    };
  }
}
