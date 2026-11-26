// Google AI Studio image (Nano Banana 2.1, Gemini image) and Omni video specs for Canvas.

import type { CanvasModelSpec } from "@/model/canvas-model";
import {
  endImagePort,
  imageOutput,
  promptPort,
  refImagesPort,
  startImagePort,
  videoOutput,
} from "@/service/canvas/catalog/ports";
import { GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL } from "@/service/google/studio-image";
import {
  GOOGLE_STUDIO_IMAGE_MODELS,
  GOOGLE_STUDIO_VIDEO_MODELS,
  googleStudioImageSupportsResolution,
  googleStudioImageUserUsd,
  googleStudioVideoUserUsd,
} from "@/service/google/studio-price";

export const NANO_BANANA_CANVAS_MODEL_ID = `google:${GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL}`;

export const GOOGLE_STATIC_MODELS: CanvasModelSpec[] = [
  ...GOOGLE_STUDIO_IMAGE_MODELS.map((model): CanvasModelSpec => ({
    id: `google:${model.id}`,
    provider: "google",
    providerModelId: model.id,
    name: model.name,
    category: "image",
    inputs: [promptPort(true), refImagesPort(model.referenceImages)],
    output: imageOutput(),
    presets: ["9:16", "16:9", "1:1", "4:3", "3:4"],
    defaultPresetId: "16:9",
    basePriceUsd: googleStudioImageUserUsd(model.id),
    supportsAspectRatio: true,
    supportsResolution: googleStudioImageSupportsResolution(model.id),
    available: true,
  })),
  ...GOOGLE_STUDIO_VIDEO_MODELS.map((model): CanvasModelSpec => ({
    id: `google:${model.id}`,
    provider: "google",
    providerModelId: model.id,
    name: model.name,
    category: "video",
    inputs: [
      promptPort(true),
      startImagePort(false),
      endImagePort(false),
      refImagesPort(model.referenceImages),
    ],
    output: videoOutput(),
    presets: ["16:9", "9:16"],
    defaultPresetId: "16:9",
    basePriceUsd: googleStudioVideoUserUsd(model.id),
    defaultDurationSeconds: model.defaultDurationSeconds,
    minDurationSeconds: model.minDurationSeconds,
    maxDurationSeconds: model.maxDurationSeconds,
    supportsAspectRatio: true,
    available: true,
  })),
];
