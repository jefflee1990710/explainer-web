// One chat completion for a canvas text-model node.
// Gemini uses the Google AI Studio client already wired for director chat (`canvasChatModel`).
// Claude and GPT use ArgoLink chat completions (`ARGOLINK_API_KEY` only).

import { generateText, type LanguageModel } from "ai";
import { argolinkChatCompletion } from "@/service/argolink/chat";
import { isArgolinkCanvasTextModel } from "@/service/canvas/catalog/text-token-price";
import { canvasChatModel } from "@/service/director/model";

export type CanvasTextUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type CanvasTextResult = {
  text: string;
  usage: CanvasTextUsage;
};

export type CanvasTextRequest = {
  model: string;
  prompt: string;
};

type TokenUsageFields = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

export type CanvasTextDeps = {
  generateText?: (args: {
    model: LanguageModel;
    prompt: string;
  }) => Promise<{ text: string; usage?: TokenUsageFields }>;
  modelFor?: (modelId: string) => LanguageModel;
  fetch?: typeof fetch;
  apiKey?: string;
};

// Reads the token counts a chat client reported. Missing counts are an error, not a free run.
export function readTokenUsage(usage: TokenUsageFields | undefined): CanvasTextUsage {
  const input = usage?.inputTokens ?? usage?.promptTokens;
  const output = usage?.outputTokens ?? usage?.completionTokens;
  if (typeof input !== "number" || typeof output !== "number" || !Number.isFinite(input) || !Number.isFinite(output)) {
    throw new Error("文字模型沒有回傳 token 用量");
  }
  return { inputTokens: input, outputTokens: output };
}

// Returns the model's text and the tokens to bill. An empty prompt or an empty reply is an error.
export async function generateCanvasText(
  input: CanvasTextRequest,
  deps?: CanvasTextDeps,
): Promise<CanvasTextResult> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("請先輸入提示詞");
  if (isArgolinkCanvasTextModel(input.model)) {
    return argolinkChatCompletion({ model: input.model, prompt }, deps);
  }
  const run = deps?.generateText ?? ((args) => generateText(args));
  const modelFor = deps?.modelFor ?? canvasChatModel;
  const { text, usage } = await run({ model: modelFor(input.model), prompt });
  const trimmed = text.trim();
  if (!trimmed) throw new Error("文字模型沒有回傳內容");
  return { text: trimmed, usage: readTokenUsage(usage) };
}
