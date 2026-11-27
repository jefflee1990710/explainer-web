// ArgoLink video specs for Canvas (ARGOLINK_API_KEY). MAGI-2 takes no start/end frame:
// image-to-video works by wiring stills into refImages, and a voice or beat into refAudio.

import type { CanvasModelSpec } from "@/model/canvas-model";
import { promptPort, refAudioPort, refImagesPort, videoOutput, videoPort } from "@/service/canvas/catalog/ports";
import { ARGOLINK_MAGI_2, MAGI_2_LIMITS, MAGI_2_RATIOS } from "@/service/argolink/client";
import { argolinkVideoUserUsd } from "@/service/argolink/price";

export const MAGI_2_CANVAS_MODEL_ID = `argolink:${ARGOLINK_MAGI_2}`;

export const ARGOLINK_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: MAGI_2_CANVAS_MODEL_ID,
    provider: "argolink",
    providerModelId: ARGOLINK_MAGI_2,
    name: "Sand AI MAGI-2",
    category: "video",
    inputs: [
      promptPort(true),
      refImagesPort(MAGI_2_LIMITS.maxReferenceImages),
      videoPort(false),
      refAudioPort(false),
    ],
    output: videoOutput(),
    presets: [...MAGI_2_RATIOS],
    defaultPresetId: "16:9",
    basePriceUsd: argolinkVideoUserUsd(ARGOLINK_MAGI_2),
    defaultDurationSeconds: MAGI_2_LIMITS.defaultDurationSeconds,
    minDurationSeconds: MAGI_2_LIMITS.minDurationSeconds,
    maxDurationSeconds: MAGI_2_LIMITS.maxDurationSeconds,
    supportsAspectRatio: true,
    available: true,
    agentHint:
      "Sand AI MAGI-2 via ArgoLink: 1080p, 4-30s, native sound. No start or end frame. Wire up to 10 stills into refImages (image-to-video), one motion clip into video, and an optional voice or beat into refAudio.",
  },
];
