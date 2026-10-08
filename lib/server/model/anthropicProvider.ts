// Anthropic implementation of ModelProvider. Normalizes the SDK's
// response shape into the shared ModelResponse — the harness never
// sees an Anthropic-specific type.

import Anthropic from "@anthropic-ai/sdk";
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

function toAnthropicTool(toolDefinition: ToolDefinition): Anthropic.Tool {
  return {
    name: toolDefinition.name,
    description: toolDefinition.description,
    input_schema: {
      type: "object",
      properties: toolDefinition.inputSchema.properties,
      required: toolDefinition.inputSchema.required,
    },
  };
}

function toAnthropicStopReason(stopReason: string | null): ModelStopReason {
  if (stopReason === "tool_use") {
    return "tool_use";
  }
  if (stopReason === "end_turn") {
    return "end_turn";
  }
  if (stopReason === "max_tokens") {
    return "max_tokens";
  }
  return "other";
}

function normalizeAnthropicContent(content: Anthropic.ContentBlock[]): ModelContentBlock[] {
  const normalizedBlocks: ModelContentBlock[] = [];
  for (const block of content) {
    if (block.type === "text") {
      normalizedBlocks.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      normalizedBlocks.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
    // Other Anthropic block types (thinking, server-tool results, etc.)
    // are not part of this harness's tool-calling surface and are
    // intentionally dropped during normalization.
  }
  return normalizedBlocks;
}

export class AnthropicProvider implements ModelProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    if (!config.anthropicApiKey) {
      throw new ModelProviderConfigError(
        "ANTHROPIC_API_KEY is not set but modelProvider is 'anthropic'."
      );
    }
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    this.model = config.anthropicModel;
  }

  async complete(params: ModelCompletionParams): Promise<ModelResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: params.maxOutputTokens,
      system: params.systemPrompt,
      tools: params.tools.map(toAnthropicTool),
      messages: params.messages.map((message) => ({
        role: message.role,
        content: message.content.map((block) => {
          if (block.type === "text") {
            return { type: "text" as const, text: block.text };
          }
          if (block.type === "tool_use") {
            return {
              type: "tool_use" as const,
              id: block.id,
              name: block.name,
              input: block.input,
            };
          }
          return {
            type: "tool_result" as const,
            tool_use_id: block.toolUseId,
            content: block.content,
          };
        }),
      })),
    });

    return {
      content: normalizeAnthropicContent(response.content),
      stopReason: toAnthropicStopReason(response.stop_reason),
    };
  }
}
