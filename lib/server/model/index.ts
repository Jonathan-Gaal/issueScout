// Factory isolating the D2 provider swap to this one file. The harness
// (spec 008) calls getModelProvider() once and never branches on
// provider itself.

import { config } from "../config";
import { AnthropicProvider } from "./anthropicProvider";
import { GroqProvider } from "./groqProvider";
import type { ModelProvider } from "./types";

export function getModelProvider(): ModelProvider {
  if (config.modelProvider === "groq") {
    return new GroqProvider();
  }
  return new AnthropicProvider();
}

export type { ModelProvider } from "./types";
