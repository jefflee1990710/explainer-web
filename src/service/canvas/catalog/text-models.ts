// Canvas text models. Gemini stays on Google AI Studio (`canvasChatModel`).
// Claude and GPT chat go through ArgoLink. The charge is per million tokens, not a flat run price.

import type { CanvasModelSpec } from "@/model/canvas-model";
import { generatedTextOutput, promptPort } from "@/service/canvas/catalog/ports";

export const CANVAS_TEXT_FLASH_ID = "google:gemini-3.8-flash";
export const CANVAS_TEXT_ARGON_ID = "google:gemini-4-argon";
export const CANVAS_TEXT_CLAUDE_ID = "argolink:claude-sonnet-5-5";
export const CANVAS_TEXT_GPT_ID = "argolink:gpt-5.6-sol";

const HINT =
  "Writes text from the prompt and bills input and output tokens per million. Connect the output to any text input: a prompt port, a director topic or script, subtitles, or another text port.";

function textSpec(spec: {
  id: string;
  provider: "google" | "argolink";
  providerModelId: string;
  name: string;
}): CanvasModelSpec {
  return {
    id: spec.id,
    provider: spec.provider,
    providerModelId: spec.providerModelId,
    name: spec.name,
    category: "text",
    inputs: [promptPort(true)],
    output: generatedTextOutput(),
    presets: ["chat"],
    defaultPresetId: "chat",
    // Unused for the charge. The run settles from token usage after the reply.
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
    agentHint: HINT,
  };
}

export const TEXT_STATIC_MODELS: CanvasModelSpec[] = [
  textSpec({
    id: CANVAS_TEXT_FLASH_ID,
    provider: "google",
    providerModelId: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
  }),
  textSpec({
    id: CANVAS_TEXT_ARGON_ID,
    provider: "google",
    providerModelId: "gemini-4-argon",
    name: "Gemini 4 Argon",
  }),
  textSpec({
    id: CANVAS_TEXT_CLAUDE_ID,
    provider: "argolink",
    providerModelId: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
  }),
  textSpec({
    id: CANVAS_TEXT_GPT_ID,
    provider: "argolink",
    providerModelId: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
  }),
];
