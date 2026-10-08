// Normalized model-provider types. Not a TRD-defined external API
// contract — this is the internal seam between the harness and
// whichever provider (Anthropic or Groq) is configured (D2). Both
// providers normalize to these same shapes inside their own files, so
// the harness (spec 008) never branches on provider.

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type ModelMessageRole = "user" | "assistant";

export type ModelContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; toolUseId: string; content: string };

export interface ModelMessage {
  role: ModelMessageRole;
  content: ModelContentBlock[];
}

export type ModelStopReason = "end_turn" | "tool_use" | "max_tokens" | "other";

export interface ModelResponse {
  content: ModelContentBlock[];
  stopReason: ModelStopReason;
}

export interface ModelCompletionParams {
  systemPrompt: string;
  messages: ModelMessage[];
  tools: ToolDefinition[];
  maxOutputTokens: number;
}

/**
 * The harness's only path to a model. Both AnthropicProvider and
 * GroqProvider normalize their SDK/REST-specific response shape into
 * ModelResponse inside this one method.
 */
export interface ModelProvider {
  complete(params: ModelCompletionParams): Promise<ModelResponse>;
}

/** Thrown when the provider cannot even attempt a call (e.g. missing API key). */
export class ModelProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelProviderConfigError";
  }
}

/** A typed, normalized failure from a provider call — never an uncaught exception with raw upstream text. */
export interface ModelCallError {
  error: true;
  reason: "network" | "non_2xx" | "malformed_response";
}
