// Which video models a style-transfer node may run, and how long that run lasts.
// The node keeps its own id; the chosen model is only the job it sends.

import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { PICKER_DEFAULT_STYLE_ID } from "@/model/style-id";

export const VIDEO_STYLE_TRANSFER_MODEL_ID = "scro:video-style-transfer";

// Picker default when the node is first placed.
export const VIDEO_STYLE_TRANSFER_DEFAULT_STYLE_ID = PICKER_DEFAULT_STYLE_ID;

// Models that already accept a source video on the canvas job path.
const PREFERRED_VIDEO_MODEL_IDS = [
  "openrouter:black-forest-labs/flux-video-edit",
  "openrouter:runway/aleph-2",
];

// HeyGen jobs need a portrait and a voice track, so they cannot restyle a video.
const AVATAR_MODEL = /heygen|avatar/i;

// OpenRouter and MiniMax video models whose existing submit already forwards a video URL.
// Google Omni and legacy Mentalok jobs have no source-video field on that path.
export function videoStyleTransferModelChoices(
  catalog: readonly CanvasModelSpec[],
): CanvasModelSpec[] {
  return catalog
    .filter((spec) => {
      if (spec.category !== "video" || spec.available === false || spec.hiddenInSidebar) return false;
      // MAGI-2 treats a clip as a motion reference, not as a video to restyle.
      if (spec.provider === "google" || spec.provider === "mentalok" || spec.provider === "argolink") {
        return false;
      }
      if (spec.inputs.some((port) => port.id === "refAudio" && port.required)) return false;
      if (AVATAR_MODEL.test(spec.id) || AVATAR_MODEL.test(spec.providerModelId)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Node data placed when the tool is added. Style and video model can still be changed on the card.
export function videoStyleTransferNodeData(catalog: readonly CanvasModelSpec[]): CanvasNodeData {
  const videoModel = defaultVideoStyleTransferModel(catalog);
  return {
    modelId: VIDEO_STYLE_TRANSFER_MODEL_ID,
    presetId: "16:9",
    aspectRatio: "16:9",
    durationSeconds: videoModel?.defaultDurationSeconds ?? 5,
    status: "idle",
    toolParams: {
      styleId: VIDEO_STYLE_TRANSFER_DEFAULT_STYLE_ID,
      ...(videoModel ? { videoModelId: videoModel.id } : {}),
    },
  };
}

// Prefer a model that edits an input video. Otherwise the first listed video model.
export function defaultVideoStyleTransferModel(
  catalog: readonly CanvasModelSpec[],
): CanvasModelSpec | undefined {
  const choices = videoStyleTransferModelChoices(catalog);
  for (const id of PREFERRED_VIDEO_MODEL_IDS) {
    const found = choices.find((spec) => spec.id === id);
    if (found) return found;
  }
  return choices.find((spec) => spec.inputs.some((port) => port.id === "video")) ?? choices[0];
}

// Seconds the chosen video model will accept.
export function clampVideoStyleDuration(model: CanvasModelSpec, requested?: number): number {
  const min = model.minDurationSeconds ?? 5;
  const max = model.maxDurationSeconds ?? min;
  const fallback = model.defaultDurationSeconds ?? min;
  const value =
    requested !== undefined && Number.isFinite(requested) ? Math.round(requested) : fallback;
  return Math.min(max, Math.max(min, value));
}

// Keep the node's ratio when the video model lists it.
export function videoStyleAspectRatio(
  node: { data: { aspectRatio?: string; presetId?: string } },
  model: CanvasModelSpec,
): string {
  const raw = node.data.aspectRatio ?? node.data.presetId;
  if (raw && model.presets.includes(raw)) return raw;
  return model.defaultPresetId || "16:9";
}
