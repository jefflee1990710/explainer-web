// Canvas text models. Gemini stays on Google AI Studio (`canvasChatModel`).
// Claude and GPT chat go through ArgoLink. The charge is per million tokens, not a flat run price.
// Gemini 2.5 Pro / Flash are retired from the picker. Long-context tiered Pro preview is omitted
// because this catalog bills one input rate and one output rate.

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

function googleText(providerModelId: string, name: string): CanvasModelSpec {
  return textSpec({
    id: `google:${providerModelId}`,
    provider: "google",
    providerModelId,
    name,
  });
}

function argolinkText(providerModelId: string, name: string): CanvasModelSpec {
  return textSpec({
    id: `argolink:${providerModelId}`,
    provider: "argolink",
    providerModelId,
    name,
  });
}

export const TEXT_STATIC_MODELS: CanvasModelSpec[] = [
  googleText("gemini-3.8-flash", "Gemini 3.8 Flash"),
  googleText("gemini-4-argon", "Gemini 4 Argon"),
  googleText("gemini-4-carbon", "Gemini 4 Carbon"),
  googleText("gemini-4-neon", "Gemini 4 Neon"),
  googleText("gemini-4-hydrogen", "Gemini 4 Hydrogen"),
  googleText("gemini-3.6-flash", "Gemini 3.6 Flash"),
  googleText("gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite"),
  googleText("gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite"),
  googleText("gemini-3-flash-preview", "Gemini 3 Flash"),
  googleText("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite"),
  argolinkText("claude-sonnet-5-5", "Claude Sonnet 5.5"),
  argolinkText("claude-sonnet-5", "Claude Sonnet 5"),
  argolinkText("claude-haiku-5-5", "Claude Haiku 5.5"),
  argolinkText("claude-opus-5-5", "Claude Opus 5.5"),
  argolinkText("claude-opus-5", "Claude Opus 5"),
  argolinkText("claude-opus-4-8", "Claude Opus 4.8"),
  argolinkText("claude-fable-5-2", "Claude Fable 5.2"),
  argolinkText("claude-fable-5-1", "Claude Fable 5.1"),
  argolinkText("claude-fable-5", "Claude Fable 5"),
  argolinkText("gpt-5.6-sol", "GPT-5.6 Sol"),
  argolinkText("gpt-5.6-terra", "GPT-5.6 Terra"),
  argolinkText("gpt-5.5", "GPT-5.5"),
  argolinkText("gpt-6-astra", "GPT-6 Astra"),
  argolinkText("gpt-6.2-astra", "GPT-6.2 Astra"),
  argolinkText("gpt-6.2-sol", "GPT-6.2 Sol"),
  argolinkText("gpt-6-sol", "GPT-6 Sol"),
  argolinkText("gpt-6.1-sol", "GPT-6.1 Sol"),
  argolinkText("gpt-6.1-terra", "GPT-6.1 Terra"),
];
