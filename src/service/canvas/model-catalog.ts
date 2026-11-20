// Canonical 26-model catalog for the Interactive Node Canvas Editor (/app/canvas):
// 16 commercial-safe Mentalok AI Studio models + 10 curated OpenRouter production models.

import { IMAGE_COST_USD, talkingHeadVideoCostUsd, videoCostUsd } from "@/service/credit-costs";
import {
  type MentalokClientOptions,
  type MentalokModelSummary,
  type MentalokRuntimeStatus,
  hasMentalokApiKey,
  listMentalokModels,
  mentalokBaseUrl,
} from "@/service/mentalok/client";
import {
  OPENROUTER_GPT_5_IMAGE_MODEL,
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
  OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL,
  OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL,
  OPENROUTER_SEEDANCE_2_MINI_VIDEO_MODEL,
  OPENROUTER_SEEDANCE_2_VIDEO_MODEL,
  OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  OPENROUTER_WAN_3_VIDEO_MODEL,
} from "@/service/openrouter/generate";

export type CanvasPortType = "image" | "video" | "audio" | "text";

export type CanvasModelCategory =
  | "image"
  | "video"
  | "audio"
  | "scro-tool"
  | "ffmpeg"
  | "editing"
  | "segmentation"
  | "upscale";

export type CanvasModelProvider = "mentalok" | "openrouter" | "scro" | "ffmpeg";

export type CanvasBilingualLabel = {
  "zh-Hant": string;
  en: string;
};

export type CanvasPortSpec = {
  id: string;
  label: string;
  labels: CanvasBilingualLabel;
  type: CanvasPortType;
  required: boolean;
  multiple: boolean;
  maxConnections: number;
};

export type CanvasModelOutputSpec = {
  id: "output";
  label: string;
  labels: CanvasBilingualLabel;
  type: "image" | "video" | "audio";
};

export type CanvasModelSpec = {
  id: string;
  provider: CanvasModelProvider;
  providerModelId: string;
  name: string;
  category: CanvasModelCategory;
  inputs: CanvasPortSpec[];
  output: CanvasModelOutputSpec;
  presets: string[];
  defaultPresetId: string;
  basePriceUsd: number;
  defaultDurationSeconds?: number;
  minDurationSeconds?: number;
  maxDurationSeconds?: number;
  supportsAspectRatio?: boolean;
  supportsResolution?: boolean;
  runtimeStatus?: MentalokRuntimeStatus;
  available?: boolean;
};

export const MENTALOK_CATALOG_CACHE_TTL_MS = 60_000;

// Shared port builders keep bilingual zh-Hant / en labels consistent across all 26 models.
function promptPort(required = true): CanvasPortSpec {
  return {
    id: "prompt",
    label: "提示詞 Prompt",
    labels: { "zh-Hant": "提示詞", en: "Prompt" },
    type: "text",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

function imagePort(required = true): CanvasPortSpec {
  return {
    id: "image",
    label: "輸入圖片 Image",
    labels: { "zh-Hant": "輸入圖片", en: "Image" },
    type: "image",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

function startImagePort(required = false): CanvasPortSpec {
  return {
    id: "startImage",
    label: "起始圖 Start Image",
    labels: { "zh-Hant": "起始圖", en: "Start Image" },
    type: "image",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

function endImagePort(required = false): CanvasPortSpec {
  return {
    id: "endImage",
    label: "結束圖 End Image",
    labels: { "zh-Hant": "結束圖", en: "End Image" },
    type: "image",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

function refImagesPort(maxConnections: number): CanvasPortSpec {
  return {
    id: "refImages",
    label: "參考圖 Ref Images",
    labels: { "zh-Hant": "參考圖", en: "Ref Images" },
    type: "image",
    required: false,
    multiple: true,
    maxConnections,
  };
}

function videoPort(required = true): CanvasPortSpec {
  return {
    id: "video",
    label: "輸入影片 Video",
    labels: { "zh-Hant": "輸入影片", en: "Video" },
    type: "video",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

function videosPort(maxConnections = 8): CanvasPortSpec {
  return {
    id: "videos",
    label: "多段影片 Videos",
    labels: { "zh-Hant": "多段影片", en: "Videos" },
    type: "video",
    required: true,
    multiple: true,
    maxConnections,
  };
}

function refAudioPort(required = false): CanvasPortSpec {
  return {
    id: "refAudio",
    label: "參考音訊 Audio",
    labels: { "zh-Hant": "參考音訊", en: "Audio" },
    type: "audio",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

function imageOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出圖片 Image",
    labels: { "zh-Hant": "輸出圖片", en: "Image" },
    type: "image",
  };
}

function videoOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出影片 Video",
    labels: { "zh-Hant": "輸出影片", en: "Video" },
    type: "video",
  };
}

function audioOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出音訊 Audio",
    labels: { "zh-Hant": "輸出音訊", en: "Audio" },
    type: "audio",
  };
}

// 16 Mentalok AI Studio commercial-safe models (Section 3.2).
const MENTALOK_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: "mentalok:flux-schnell",
    provider: "mentalok",
    providerModelId: "flux-schnell",
    name: "FLUX.1 [schnell]",
    category: "image",
    inputs: [promptPort(true)],
    output: imageOutput(),
    presets: ["flux-square-1024", "flux-portrait-768", "flux-landscape-1024"],
    defaultPresetId: "flux-square-1024",
    basePriceUsd: 0.0012,
    available: true,
  },
  {
    id: "mentalok:sdxl-lightning",
    provider: "mentalok",
    providerModelId: "sdxl-lightning",
    name: "SDXL Lightning",
    category: "image",
    inputs: [promptPort(true)],
    output: imageOutput(),
    presets: ["sdxl-square-1024", "sdxl-portrait-832", "sdxl-landscape-1216"],
    defaultPresetId: "sdxl-square-1024",
    basePriceUsd: 0.0008,
    available: true,
  },
  {
    id: "mentalok:flux-2-klein-4b",
    provider: "mentalok",
    providerModelId: "flux-2-klein-4b",
    name: "FLUX.2 [klein] 4B",
    category: "image",
    inputs: [promptPort(true)],
    output: imageOutput(),
    presets: ["flux2-klein-square", "flux2-klein-portrait", "flux2-klein-landscape"],
    defaultPresetId: "flux2-klein-square",
    basePriceUsd: 0.0012,
    available: true,
  },
  {
    id: "mentalok:minimax-h3-image",
    provider: "mentalok",
    providerModelId: "minimax-h3-image",
    name: "MiniMax-H3-Image",
    category: "image",
    inputs: [promptPort(true), refImagesPort(4)],
    output: imageOutput(),
    presets: ["h3-image-2k", "h3-image-portrait", "h3-image-landscape", "h3-image-4k"],
    defaultPresetId: "h3-image-2k",
    basePriceUsd: 0.015,
    available: true,
  },
  {
    id: "mentalok:wan-2-1",
    provider: "mentalok",
    providerModelId: "wan-2-1",
    name: "Wan 2.1 Video",
    category: "video",
    inputs: [promptPort(true), startImagePort(false)],
    output: videoOutput(),
    presets: ["wan-480p", "wan-720p"],
    defaultPresetId: "wan-480p",
    basePriceUsd: 0.08,
    available: true,
  },
  {
    id: "mentalok:ltx-video",
    provider: "mentalok",
    providerModelId: "ltx-video",
    name: "LTX-Video",
    category: "video",
    inputs: [promptPort(true), startImagePort(false)],
    output: videoOutput(),
    presets: ["ltx-standard-768", "ltx-landscape-960"],
    defaultPresetId: "ltx-standard-768",
    basePriceUsd: 0.035,
    available: true,
  },
  {
    id: "mentalok:wan-2-2",
    provider: "mentalok",
    providerModelId: "wan-2-2",
    name: "Wan 2.2 TI2V-5B",
    category: "video",
    inputs: [promptPort(true), startImagePort(false)],
    output: videoOutput(),
    presets: ["wan22-720p", "wan22-480p", "wan22-portrait"],
    defaultPresetId: "wan22-720p",
    basePriceUsd: 0.08,
    available: true,
  },
  {
    id: "mentalok:ltx-2-5",
    provider: "mentalok",
    providerModelId: "ltx-2-5",
    name: "LTX-2.5 (Audio+Video)",
    category: "video",
    inputs: [promptPort(true), startImagePort(false), endImagePort(false)],
    output: videoOutput(),
    presets: ["ltx25-720p", "ltx25-480p", "ltx25-portrait"],
    defaultPresetId: "ltx25-720p",
    basePriceUsd: 0.045,
    available: true,
  },
  {
    id: "mentalok:minimax-h3-ref2va",
    provider: "mentalok",
    providerModelId: "minimax-h3-ref2va",
    name: "MiniMax-H3 Ref2VA",
    category: "video",
    inputs: [
      promptPort(true),
      startImagePort(false),
      endImagePort(false),
      refImagesPort(4),
      refAudioPort(false),
    ],
    output: videoOutput(),
    presets: ["h3-ref2va-480p", "h3-ref2va-768p", "h3-ref2va-portrait"],
    defaultPresetId: "h3-ref2va-480p",
    basePriceUsd: 0.21,
    available: true,
  },
  {
    id: "mentalok:qwen-image-edit-2511",
    provider: "mentalok",
    providerModelId: "qwen-image-edit-2511",
    name: "Qwen-Image-Edit (2511)",
    category: "editing",
    inputs: [promptPort(true), imagePort(true), refImagesPort(3)],
    output: imageOutput(),
    presets: ["qwen-edit-4step", "qwen-edit-8step"],
    defaultPresetId: "qwen-edit-4step",
    basePriceUsd: 0.012,
    available: true,
  },
  {
    id: "mentalok:sam-3-1",
    provider: "mentalok",
    providerModelId: "sam-3-1",
    name: "SAM 3.1 (Image)",
    category: "segmentation",
    inputs: [promptPort(true), imagePort(true)],
    output: imageOutput(),
    presets: ["sam31-standard", "sam31-hq", "sam31-fast"],
    defaultPresetId: "sam31-standard",
    basePriceUsd: 0.0012,
    available: true,
  },
  {
    id: "mentalok:sam-3-1-video",
    provider: "mentalok",
    providerModelId: "sam-3-1-video",
    name: "SAM 3.1 (Video)",
    category: "segmentation",
    inputs: [promptPort(true), videoPort(true)],
    output: videoOutput(),
    presets: ["sam31-vid-standard", "sam31-vid-hq", "sam31-vid-fast"],
    defaultPresetId: "sam31-vid-standard",
    basePriceUsd: 0.015,
    available: true,
  },
  {
    id: "mentalok:birefnet",
    provider: "mentalok",
    providerModelId: "birefnet",
    name: "BiRefNet",
    category: "segmentation",
    inputs: [imagePort(true)],
    output: imageOutput(),
    presets: ["birefnet-auto"],
    defaultPresetId: "birefnet-auto",
    basePriceUsd: 0.0008,
    available: true,
  },
  {
    id: "mentalok:seedvr2-image",
    provider: "mentalok",
    providerModelId: "seedvr2-image",
    name: "SeedVR2 (Image)",
    category: "upscale",
    inputs: [imagePort(true)],
    output: imageOutput(),
    presets: ["seedvr2-img-2x", "seedvr2-img-4x", "seedvr2-img-1x"],
    defaultPresetId: "seedvr2-img-2x",
    basePriceUsd: 0.004,
    available: true,
  },
  {
    id: "mentalok:seedvr2-video",
    provider: "mentalok",
    providerModelId: "seedvr2-video",
    name: "SeedVR2 (Video)",
    category: "upscale",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["seedvr2-vid-2x", "seedvr2-vid-1x"],
    defaultPresetId: "seedvr2-vid-2x",
    basePriceUsd: 0.035,
    available: true,
  },
  {
    id: "mentalok:relayvsr",
    provider: "mentalok",
    providerModelId: "relayvsr",
    name: "RelayVSR 2x",
    category: "upscale",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["relayvsr-2x"],
    defaultPresetId: "relayvsr-2x",
    basePriceUsd: 0.015,
    available: true,
  },
];

// 10 curated OpenRouter production image & video models (Section 3.2).
const OPENROUTER_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: `openrouter:${OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    name: "Seedream 5.0 Pro",
    category: "image",
    inputs: [promptPort(true), refImagesPort(14)],
    output: imageOutput(),
    presets: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    defaultPresetId: "16:9",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: true,
    supportsResolution: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL,
    name: "Seedream 5.0 Lite",
    category: "image",
    inputs: [promptPort(true), refImagesPort(14)],
    output: imageOutput(),
    presets: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    defaultPresetId: "16:9",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: true,
    supportsResolution: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL,
    name: "Nano Banana 2.1",
    category: "image",
    inputs: [promptPort(true), refImagesPort(14)],
    output: imageOutput(),
    presets: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    defaultPresetId: "16:9",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: true,
    supportsResolution: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_GPT_5_IMAGE_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_GPT_5_IMAGE_MODEL,
    name: "GPT-5 Image",
    category: "image",
    inputs: [promptPort(true), refImagesPort(4)],
    output: imageOutput(),
    presets: ["1:1", "16:9", "9:16"],
    defaultPresetId: "1:1",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_HAILUO_3_VIDEO_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_HAILUO_3_VIDEO_MODEL,
    name: "MiniMax Hailuo 3",
    category: "video",
    inputs: [promptPort(true), startImagePort(false), endImagePort(false), refImagesPort(4)],
    output: videoOutput(),
    presets: ["16:9", "9:16", "1:1"],
    defaultPresetId: "16:9",
    basePriceUsd: videoCostUsd(5),
    defaultDurationSeconds: 5,
    minDurationSeconds: 5,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_SEEDANCE_2_VIDEO_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_SEEDANCE_2_VIDEO_MODEL,
    name: "Seedance 2.0",
    category: "video",
    inputs: [promptPort(true), startImagePort(false), endImagePort(false), refImagesPort(4)],
    output: videoOutput(),
    presets: ["16:9", "9:16", "1:1"],
    defaultPresetId: "16:9",
    basePriceUsd: videoCostUsd(5),
    defaultDurationSeconds: 5,
    minDurationSeconds: 5,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_SEEDANCE_2_FAST_VIDEO_MODEL,
    name: "Seedance 2.0 Fast",
    category: "video",
    inputs: [promptPort(true), startImagePort(false), endImagePort(false), refImagesPort(4)],
    output: videoOutput(),
    presets: ["16:9", "9:16", "1:1"],
    defaultPresetId: "16:9",
    basePriceUsd: videoCostUsd(5),
    defaultDurationSeconds: 5,
    minDurationSeconds: 5,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_SEEDANCE_2_MINI_VIDEO_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_SEEDANCE_2_MINI_VIDEO_MODEL,
    name: "Seedance 2.0 Mini",
    category: "video",
    inputs: [promptPort(true), startImagePort(false), endImagePort(false), refImagesPort(4)],
    output: videoOutput(),
    presets: ["16:9", "9:16", "1:1"],
    defaultPresetId: "16:9",
    basePriceUsd: videoCostUsd(5),
    defaultDurationSeconds: 5,
    minDurationSeconds: 5,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_WAN_3_VIDEO_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_WAN_3_VIDEO_MODEL,
    name: "Alibaba Wan 3.0",
    category: "video",
    inputs: [promptPort(true), startImagePort(false), endImagePort(false)],
    output: videoOutput(),
    presets: ["16:9", "9:16", "1:1"],
    defaultPresetId: "16:9",
    basePriceUsd: videoCostUsd(5),
    defaultDurationSeconds: 5,
    minDurationSeconds: 5,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: `openrouter:${OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL}`,
    provider: "openrouter",
    providerModelId: OPENROUTER_HEYGEN_AVATAR_IV_VIDEO_MODEL,
    name: "HeyGen Avatar IV",
    category: "video",
    inputs: [startImagePort(true), refAudioPort(true), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: talkingHeadVideoCostUsd(5),
    defaultDurationSeconds: 5,
    minDurationSeconds: 5,
    maxDurationSeconds: 60,
    supportsAspectRatio: true,
    available: true,
  },
];

// 7 Scro production tool nodes (`scro:*`).
export const SCRO_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: "scro:talking-head",
    provider: "scro",
    providerModelId: "talking-head",
    name: "Talking Head 口播",
    category: "scro-tool",
    inputs: [promptPort(false), startImagePort(false), refAudioPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: talkingHeadVideoCostUsd(15),
    defaultDurationSeconds: 15,
    minDurationSeconds: 5,
    maxDurationSeconds: 120,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "scro:explainer",
    provider: "scro",
    providerModelId: "explainer",
    name: "Explainer 解說短片",
    category: "scro-tool",
    inputs: [promptPort(true), refImagesPort(4)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: 3.75,
    defaultDurationSeconds: 30,
    minDurationSeconds: 15,
    maxDurationSeconds: 60,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "scro:swap",
    provider: "scro",
    providerModelId: "swap",
    name: "Scro Swap 換角",
    category: "scro-tool",
    inputs: [videoPort(true), refImagesPort(6), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: 0.75,
    defaultDurationSeconds: 6,
    minDurationSeconds: 2,
    maxDurationSeconds: 15,
    supportsAspectRatio: false,
    available: true,
  },
  {
    id: "scro:teleport",
    provider: "scro",
    providerModelId: "teleport",
    name: "Teleport 實景換場",
    category: "scro-tool",
    inputs: [videoPort(true), imagePort(false), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: 0.75,
    defaultDurationSeconds: 6,
    minDurationSeconds: 2,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "scro:life",
    provider: "scro",
    providerModelId: "life",
    name: "Life 生活照",
    category: "scro-tool",
    inputs: [promptPort(false), refImagesPort(2)],
    output: imageOutput(),
    presets: ["9:16", "1:1", "16:9", "3:4"],
    defaultPresetId: "9:16",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "scro:poster",
    provider: "scro",
    providerModelId: "poster",
    name: "Poster 海報貼文",
    category: "scro-tool",
    inputs: [promptPort(true), refImagesPort(4)],
    output: imageOutput(),
    presets: ["9:16", "1:1", "16:9", "2:3"],
    defaultPresetId: "9:16",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "scro:tts",
    provider: "scro",
    providerModelId: "tts",
    name: "ElevenLabs TTS 配音",
    category: "audio",
    inputs: [promptPort(true)],
    output: audioOutput(),
    presets: ["natural"],
    defaultPresetId: "natural",
    basePriceUsd: 0.02,
    supportsAspectRatio: false,
    available: true,
  },
];

// 5 Vast.ai Worker FFmpeg utility nodes (`ffmpeg:*`).
export const FFMPEG_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: "ffmpeg:concat",
    provider: "ffmpeg",
    providerModelId: "concat",
    name: "FFmpeg 合併串接",
    category: "ffmpeg",
    inputs: [videosPort(8)],
    output: videoOutput(),
    presets: ["pad-200ms", "cut", "fade"],
    defaultPresetId: "pad-200ms",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
  {
    id: "ffmpeg:audio-mux",
    provider: "ffmpeg",
    providerModelId: "audio-mux",
    name: "FFmpeg 音畫合成",
    category: "ffmpeg",
    inputs: [videoPort(true), refAudioPort(true)],
    output: videoOutput(),
    presets: ["replace", "mix-ducking"],
    defaultPresetId: "replace",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
  {
    id: "ffmpeg:trim-speed",
    provider: "ffmpeg",
    providerModelId: "trim-speed",
    name: "FFmpeg 裁剪變速",
    category: "ffmpeg",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["1.0x", "1.25x", "1.5x"],
    defaultPresetId: "1.0x",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
  {
    id: "ffmpeg:transform",
    provider: "ffmpeg",
    providerModelId: "transform",
    name: "FFmpeg 比例／調色",
    category: "ffmpeg",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: 0,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "ffmpeg:extract-audio",
    provider: "ffmpeg",
    providerModelId: "extract-audio",
    name: "FFmpeg 抽離音訊",
    category: "ffmpeg",
    inputs: [videoPort(true)],
    output: audioOutput(),
    presets: ["mp3-192k"],
    defaultPresetId: "mp3-192k",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
];

export const STATIC_CANVAS_MODELS: readonly CanvasModelSpec[] = [
  ...MENTALOK_STATIC_MODELS,
  ...OPENROUTER_STATIC_MODELS,
  ...SCRO_STATIC_MODELS,
  ...FFMPEG_STATIC_MODELS,
];

type MentalokCatalogCacheEntry = {
  baseUrl: string;
  fetchedAt: number;
  byId: Map<string, MentalokModelSummary>;
};

let mentalokCatalogCache: MentalokCatalogCacheEntry | null = null;

// Clears the in-memory 60-second Mentalok live metadata cache.
export function clearMentalokCatalogCache(): void {
  mentalokCatalogCache = null;
}

// Looks up a canvas model spec by canonical id (or providerModelId fallback).
export function findCanvasModel(
  id: string,
  catalog: readonly CanvasModelSpec[] = STATIC_CANVAS_MODELS,
): CanvasModelSpec | undefined {
  return (
    catalog.find((model) => model.id === id) ??
    catalog.find((model) => model.providerModelId === id)
  );
}

function mergeMentalokLiveData(
  staticModels: readonly CanvasModelSpec[],
  liveById: Map<string, MentalokModelSummary> | null,
  mentalokConfigured: boolean,
): CanvasModelSpec[] {
  return staticModels.map((model) => {
    if (model.provider !== "mentalok") {
      return { ...model };
    }
    if (!mentalokConfigured) {
      return {
        ...model,
        runtimeStatus: "unavailable",
        available: false,
      };
    }
    const live = liveById?.get(model.providerModelId);
    if (!live) {
      return { ...model };
    }
    const presets = live.presets.length > 0 ? live.presets : model.presets;
    const defaultPresetId = presets.includes(model.defaultPresetId)
      ? model.defaultPresetId
      : presets[0] || model.defaultPresetId;
    const runtimeStatus = live.status ?? model.runtimeStatus;
    return {
      ...model,
      basePriceUsd:
        live.priceUsd !== undefined && live.priceUsd > 0 ? live.priceUsd : model.basePriceUsd,
      presets,
      defaultPresetId,
      ...(runtimeStatus ? { runtimeStatus } : {}),
      available: runtimeStatus !== "unavailable",
    };
  });
}

export type GetCanvasModelCatalogOptions = MentalokClientOptions & {
  forceRefresh?: boolean;
  now?: number;
};

// Returns all 26 canvas models, hydrating live Mentalok pricing/presets/status with a 60s TTL cache.
// Falls back cleanly to static specs if Mentalok API key is missing or the upstream call fails.
export async function getCanvasModelCatalog(
  options?: GetCanvasModelCatalogOptions,
): Promise<CanvasModelSpec[]> {
  if (!hasMentalokApiKey(options?.apiKey)) {
    return mergeMentalokLiveData(STATIC_CANVAS_MODELS, null, false);
  }

  const now = options?.now ?? Date.now();
  const baseUrl = mentalokBaseUrl(options?.baseUrl);
  const cacheHit =
    !options?.forceRefresh &&
    mentalokCatalogCache &&
    mentalokCatalogCache.baseUrl === baseUrl &&
    now - mentalokCatalogCache.fetchedAt < MENTALOK_CATALOG_CACHE_TTL_MS;

  if (cacheHit && mentalokCatalogCache) {
    return mergeMentalokLiveData(STATIC_CANVAS_MODELS, mentalokCatalogCache.byId, true);
  }

  try {
    const liveModels = await listMentalokModels({
      apiKey: options?.apiKey,
      baseUrl: options?.baseUrl,
      fetch: options?.fetch,
    });
    const byId = new Map<string, MentalokModelSummary>();
    for (const item of liveModels) {
      byId.set(item.id, item);
    }
    mentalokCatalogCache = { baseUrl, fetchedAt: now, byId };
    return mergeMentalokLiveData(STATIC_CANVAS_MODELS, byId, true);
  } catch {
    const stale = mentalokCatalogCache?.baseUrl === baseUrl ? mentalokCatalogCache.byId : null;
    return mergeMentalokLiveData(STATIC_CANVAS_MODELS, stale, true);
  }
}
