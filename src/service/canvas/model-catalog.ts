// Canonical catalog for the Interactive Node Canvas Editor (/app/canvas):
// 16 Mentalok models, every OpenRouter image and video model on this account
// except GPT Image and Veo, Gemini image and Omni video on Google AI Studio,
// plus Scro tools and FFmpeg nodes.

import { addUsd, mulUsd } from "@/service/billing/usd";
import {
  EXPLAINER_STILL_COST_USD,
  IMAGE_COST_USD,
  VIDEO_COST_PER_SECOND_USD,
  scroSwapCostUsd,
  talkingHeadVideoCostUsd,
  teleportCostUsd,
} from "@/service/credit-costs";
import {
  type MentalokClientOptions,
  type MentalokModelSummary,
  type MentalokRuntimeStatus,
  hasMentalokApiKey,
  listMentalokModels,
  mentalokBaseUrl,
} from "@/service/mentalok/client";
import {
  OPENROUTER_ACCOUNT_IMAGE_MODELS,
  OPENROUTER_ACCOUNT_VIDEO_MODELS,
} from "@/service/openrouter/account-media-models";
import { GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL } from "@/service/google/studio-image";
import {
  GOOGLE_STUDIO_IMAGE_MODELS,
  GOOGLE_STUDIO_VIDEO_MODELS,
  googleStudioImageSupportsResolution,
  googleStudioImageUserUsd,
  googleStudioVideoUserUsd,
} from "@/service/google/studio-price";
import {
  defaultOpenRouterImageResolution,
  defaultOpenRouterVideoResolution,
  openRouterImageUserUsd,
  openRouterVideoUserUsd,
} from "@/service/openrouter/media-price";
import { CANVAS_HEYGEN_MAX_VIDEO_SECONDS } from "@/service/canvas/pricing";
import {
  MINIMAX_CANVAS_LEGACY_IDS,
  officialMinimaxCanvasModel,
} from "@/service/minimax/official-canvas";

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

export type CanvasModelProvider = "mentalok" | "openrouter" | "google" | "minimax" | "scro" | "ffmpeg";

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
  // Created only by other features (e.g. Explainer expansion); not listed in the sidebar or agent catalog.
  hiddenInSidebar?: boolean;
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

function refImagesPort(maxConnections: number, required = false): CanvasPortSpec {
  return {
    id: "refImages",
    label: "參考圖 Ref Images",
    labels: { "zh-Hant": "參考圖", en: "Ref Images" },
    type: "image",
    required,
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

const CANVAS_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;

const OPENROUTER_NAME_OVERRIDES: Record<string, string> = {
  "bytedance-seed/seedream-5-0-pro": "Seedream 5.0 Pro",
  "bytedance-seed/seedream-5-0-lite": "Seedream 5.0 Lite",
  "minimax/hailuo-3": "MiniMax Hailuo 3",
  "bytedance/seedance-2.0": "Seedance 2.0",
  "bytedance/seedance-2.0-fast": "Seedance 2.0 Fast",
  "bytedance/seedance-2.0-mini": "Seedance 2.0 Mini",
  "alibaba/wan-3.0": "Alibaba Wan 3.0",
  "heygen/avatar-iv": "HeyGen Avatar IV",
};

// These video models already accept extra reference stills on the canvas.
const OPENROUTER_VIDEO_REF_MAX: Record<string, number> = {
  "minimax/hailuo-3": 4,
  "bytedance/seedance-2.0": 4,
  "bytedance/seedance-2.0-fast": 4,
  "bytedance/seedance-2.0-mini": 4,
};

function openRouterDisplayName(id: string, apiName: string): string {
  const override = OPENROUTER_NAME_OVERRIDES[id];
  if (override) return override;
  const split = apiName.split(": ");
  if (split.length < 2) return apiName;
  const product = split.slice(1).join(": ");
  return product.length <= 3 ? `${split[0]} ${product}` : product;
}

function ratioPresets(aspects: readonly string[], fallback: string): string[] {
  const picked = CANVAS_RATIOS.filter((ratio) => aspects.includes(ratio));
  if (picked.length > 0) return [...picked];
  const raw = aspects.filter((ratio) => ratio !== "auto").slice(0, 5);
  return raw.length > 0 ? raw : [fallback];
}

// Turns the usable-account snapshot into canvas specs. 403 models are already absent.
function buildOpenRouterAccountModels(): CanvasModelSpec[] {
  const images = OPENROUTER_ACCOUNT_IMAGE_MODELS.map((model): CanvasModelSpec => {
    const presets = ratioPresets(model.aspects, "1:1");
    const supportsResolution = model.resolutions.some(
      (value) => value === "1K" || value === "2K" || value === "4K",
    );
    const inputs = [promptPort(true)];
    if (model.refMax > 0) inputs.push(refImagesPort(model.refMax, model.refMin > 0));
    return {
      id: `openrouter:${model.id}`,
      provider: "openrouter",
      providerModelId: model.id,
      name: openRouterDisplayName(model.id, model.name),
      category: "image",
      inputs,
      output: imageOutput(),
      presets,
      defaultPresetId: presets.includes("16:9") ? "16:9" : presets[0],
      basePriceUsd: openRouterImageUserUsd(model.id, {
        resolution: defaultOpenRouterImageResolution(model.id),
      }),
      supportsAspectRatio: model.aspects.length > 0,
      ...(supportsResolution ? { supportsResolution: true } : {}),
      available: true,
    };
  });

  const videos = OPENROUTER_ACCOUNT_VIDEO_MODELS.map((model): CanvasModelSpec => {
    const presets = ratioPresets(model.aspects, "16:9");
    const durations = model.durations.filter((value) => value > 0);
    const minDurationSeconds = durations.length > 0 ? Math.min(...durations) : 5;
    // HeyGen length follows the wired voice, up to the canvas cap.
    const maxDurationSeconds = model.avatar
      ? CANVAS_HEYGEN_MAX_VIDEO_SECONDS
      : durations.length > 0
        ? Math.max(...durations)
        : 15;
    const defaultDurationSeconds = durations.includes(5) ? 5 : (durations[0] ?? 5);
    const inputs: CanvasPortSpec[] = [];
    if (model.avatar) {
      inputs.push(startImagePort(true), refAudioPort(true), promptPort(false));
    } else if (model.videoIn) {
      inputs.push(videoPort(true), promptPort(!/upscale/i.test(model.id)));
    } else {
      inputs.push(promptPort(true));
      if (model.frames.includes("first_frame")) inputs.push(startImagePort(false));
      if (model.frames.includes("last_frame")) inputs.push(endImagePort(false));
      const refMax = OPENROUTER_VIDEO_REF_MAX[model.id];
      if (refMax) inputs.push(refImagesPort(refMax));
    }
    const defaultPresetId =
      model.avatar && presets.includes("9:16")
        ? "9:16"
        : presets.includes("16:9")
          ? "16:9"
          : presets[0];
    return {
      id: `openrouter:${model.id}`,
      provider: "openrouter",
      providerModelId: model.id,
      name: openRouterDisplayName(model.id, model.name),
      category: "video",
      inputs,
      output: videoOutput(),
      presets,
      defaultPresetId,
      basePriceUsd: openRouterVideoUserUsd(model.id, {
        durationSeconds: defaultDurationSeconds,
        resolution: defaultOpenRouterVideoResolution(model.id),
      }),
      defaultDurationSeconds,
      minDurationSeconds,
      maxDurationSeconds,
      supportsAspectRatio: model.aspects.length > 0,
      available: true,
    };
  });

  return [...images, ...videos];
}

// MiniMax's OpenRouter routes have no provider endpoints. Those specs call api.minimax.io instead.
function partitionMinimaxModels(models: CanvasModelSpec[]): {
  openrouter: CanvasModelSpec[];
  minimax: CanvasModelSpec[];
} {
  const openrouter: CanvasModelSpec[] = [];
  const minimax: CanvasModelSpec[] = [];
  for (const spec of models) {
    const official = officialMinimaxCanvasModel(spec.providerModelId);
    if (!official) {
      openrouter.push(spec);
      continue;
    }
    minimax.push({
      ...spec,
      id: `minimax:${official}`,
      provider: "minimax",
      providerModelId: official,
    });
  }
  return { openrouter, minimax };
}

const ACCOUNT_MEDIA_MODELS = partitionMinimaxModels(buildOpenRouterAccountModels());
const OPENROUTER_STATIC_MODELS: CanvasModelSpec[] = ACCOUNT_MEDIA_MODELS.openrouter;
const MINIMAX_STATIC_MODELS: CanvasModelSpec[] = ACCOUNT_MEDIA_MODELS.minimax;

export const NANO_BANANA_CANVAS_MODEL_ID = `google:${GOOGLE_STUDIO_NANO_BANANA_2_1_IMAGE_MODEL}`;

// Nano Banana and Gemini Omni run on Google AI Studio (OpenRouter's Gemini media route is ToS-blocked).
const GOOGLE_STATIC_MODELS: CanvasModelSpec[] = [
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
    inputs: [promptPort(true), startImagePort(false), endImagePort(false), refImagesPort(model.referenceImages)],
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

// 7 Scro production tool nodes (`scro:*`).
export const SCRO_STATIC_MODELS: CanvasModelSpec[] = [
  {
    id: "scro:talking-head",
    provider: "scro",
    providerModelId: "talking-head",
    name: "Talking Head Director",
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
    name: "Explainer",
    category: "scro-tool",
    inputs: [promptPort(true), refImagesPort(4)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: addUsd(mulUsd(EXPLAINER_STILL_COST_USD, 5), mulUsd(VIDEO_COST_PER_SECOND_USD, 30)),
    defaultDurationSeconds: 30,
    minDurationSeconds: 15,
    maxDurationSeconds: 60,
    supportsAspectRatio: true,
    available: true,
  },
  {
    // Legacy: older expanded explainers only; new groups use a Nano Banana 2.1 image node.
    id: "scro:explainer-frame",
    provider: "scro",
    providerModelId: "explainer-frame",
    name: "Explainer Frame",
    category: "scro-tool",
    inputs: [promptPort(true)],
    output: imageOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: EXPLAINER_STILL_COST_USD,
    supportsAspectRatio: false,
    hiddenInSidebar: true,
    available: true,
  },
  {
    // Legacy: older Talking Head groups only; new groups use a Seedream 5.0 Pro image node.
    id: "scro:director-frame",
    provider: "scro",
    providerModelId: "director-frame",
    name: "Director Frame",
    category: "scro-tool",
    inputs: [promptPort(true)],
    output: imageOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: IMAGE_COST_USD,
    supportsAspectRatio: false,
    hiddenInSidebar: true,
    available: true,
  },
  {
    id: "scro:swap",
    provider: "scro",
    providerModelId: "swap",
    name: "Scro Swap Director",
    category: "scro-tool",
    inputs: [videoPort(true), refImagesPort(6), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: scroSwapCostUsd({ durationSeconds: 6, mediaKind: "video" }),
    defaultDurationSeconds: 6,
    minDurationSeconds: 2,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    id: "scro:teleport",
    provider: "scro",
    providerModelId: "teleport",
    name: "Teleport Director",
    category: "scro-tool",
    inputs: [videoPort(true), imagePort(false), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: teleportCostUsd({ durationSeconds: 6 }),
    defaultDurationSeconds: 6,
    minDurationSeconds: 2,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    available: true,
  },
  {
    // Group step: the OpenJutsu render only; trim and colour grade are separate FFmpeg nodes.
    id: "scro:swap-render",
    provider: "scro",
    providerModelId: "swap-render",
    name: "Scro Swap Render",
    category: "scro-tool",
    inputs: [videoPort(true), refImagesPort(6), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: scroSwapCostUsd({ durationSeconds: 6, mediaKind: "video" }),
    defaultDurationSeconds: 6,
    minDurationSeconds: 2,
    maxDurationSeconds: 15,
    supportsAspectRatio: false,
    hiddenInSidebar: true,
    available: true,
  },
  {
    id: "scro:teleport-render",
    provider: "scro",
    providerModelId: "teleport-render",
    name: "Teleport Render",
    category: "scro-tool",
    inputs: [videoPort(true), imagePort(true), promptPort(false)],
    output: videoOutput(),
    presets: ["9:16", "16:9", "1:1"],
    defaultPresetId: "9:16",
    basePriceUsd: mulUsd(VIDEO_COST_PER_SECOND_USD, 6),
    defaultDurationSeconds: 6,
    minDurationSeconds: 2,
    maxDurationSeconds: 15,
    supportsAspectRatio: true,
    hiddenInSidebar: true,
    available: true,
  },
  {
    id: "scro:life",
    provider: "scro",
    providerModelId: "life",
    name: "Life Photo",
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
    name: "Poster",
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
    name: "ElevenLabs TTS",
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
    name: "FFmpeg Concat",
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
    name: "FFmpeg Audio Mux",
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
    name: "FFmpeg Trim & Speed",
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
    name: "FFmpeg Ratio & Color",
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
    name: "FFmpeg Extract Audio",
    category: "ffmpeg",
    inputs: [videoPort(true)],
    output: audioOutput(),
    presets: ["mp3-192k"],
    defaultPresetId: "mp3-192k",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
  {
    id: "ffmpeg:color-grade",
    provider: "ffmpeg",
    providerModelId: "color-grade",
    name: "FFmpeg Color Grade",
    category: "ffmpeg",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["jutsu", "talking-head", "talking-head-selfie"],
    defaultPresetId: "jutsu",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
  {
    id: "ffmpeg:smooth-silence",
    provider: "ffmpeg",
    providerModelId: "smooth-silence",
    name: "FFmpeg Smooth Silence",
    category: "ffmpeg",
    inputs: [videoPort(true)],
    output: videoOutput(),
    presets: ["smooth"],
    defaultPresetId: "smooth",
    basePriceUsd: 0,
    supportsAspectRatio: false,
    available: true,
  },
];

export const STATIC_CANVAS_MODELS: readonly CanvasModelSpec[] = [
  ...MENTALOK_STATIC_MODELS,
  ...OPENROUTER_STATIC_MODELS,
  ...MINIMAX_STATIC_MODELS,
  ...GOOGLE_STATIC_MODELS,
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
  const canonical = MINIMAX_CANVAS_LEGACY_IDS[id] ?? id;
  return (
    catalog.find((model) => model.id === canonical) ??
    catalog.find((model) => model.providerModelId === canonical || model.providerModelId === id)
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
