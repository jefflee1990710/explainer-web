// Canvas text models. Both ids are the Google AI Studio chat models already
// used by the director (`canvasChatModel` / `directorModel`).

import type { CanvasModelSpec } from "@/model/canvas-model";
import { generatedTextOutput, promptPort } from "@/service/canvas/catalog/ports";

export const CANVAS_TEXT_FLASH_ID = "google:gemini-3.8-flash";
export const CANVAS_TEXT_ARGON_ID = "google:gemini-4-argon";

// Flat per-run charge. The canvas bills once up front; these are not token meters.
export const CANVAS_TEXT_FLASH_USD = 0.01;
export const CANVAS_TEXT_ARGON_USD = 0.03;

const HINT =
  "Writes text from the prompt. Connect the output to any text input: a prompt port, a director topic or script, subtitles, or another text port.";

export const TEXT_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: CANVAS_TEXT_FLASH_ID,
    provider: "google",
    providerModelId: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    category: "text",
    inputs: [promptPort(true)],
    output: generatedTextOutput(),
    presets: ["chat"],
    defaultPresetId: "chat",
    basePriceUsd: CANVAS_TEXT_FLASH_USD,
    supportsAspectRatio: false,
    available: true,
    agentHint: HINT,
  },
  {
    id: CANVAS_TEXT_ARGON_ID,
    provider: "google",
    providerModelId: "gemini-4-argon",
    name: "Gemini 4 Argon",
    category: "text",
    inputs: [promptPort(true)],
    output: generatedTextOutput(),
    presets: ["chat"],
    defaultPresetId: "chat",
    basePriceUsd: CANVAS_TEXT_ARGON_USD,
    supportsAspectRatio: false,
    available: true,
    agentHint: HINT,
  },
];
