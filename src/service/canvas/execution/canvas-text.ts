// One chat completion for a canvas text-model node.
// Uses the Google AI Studio client already wired for director chat (`canvasChatModel`).

import { generateText, type LanguageModel } from "ai";
import { canvasChatModel } from "@/service/director/model";

export type CanvasTextRequest = {
  model: string;
  prompt: string;
};

export type CanvasTextDeps = {
  generateText?: (args: { model: LanguageModel; prompt: string }) => Promise<{ text: string }>;
  modelFor?: (modelId: string) => LanguageModel;
};

// Returns the model's text. An empty prompt or an empty reply is an error.
export async function generateCanvasText(
  input: CanvasTextRequest,
  deps?: CanvasTextDeps,
): Promise<{ text: string }> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("請先輸入提示詞");
  const run = deps?.generateText ?? ((args) => generateText(args));
  const modelFor = deps?.modelFor ?? canvasChatModel;
  const { text } = await run({ model: modelFor(input.model), prompt });
  const trimmed = text.trim();
  if (!trimmed) throw new Error("文字模型沒有回傳內容");
  return { text: trimmed };
}
