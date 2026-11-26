// OpenRouter account image/video models and official MiniMax API partition for Canvas.

import {
  CANVAS_HEYGEN_MAX_VIDEO_SECONDS,
  type CanvasModelSpec,
  type CanvasPortSpec,
} from "@/model/canvas-model";
import {
  endImagePort,
  imageOutput,
  promptPort,
  refAudioPort,
  refImagesPort,
  startImagePort,
  videoOutput,
  videoPort,
} from "@/service/canvas/catalog/ports";
import { officialMinimaxCanvasModel } from "@/service/minimax/official-canvas";
import {
  OPENROUTER_ACCOUNT_IMAGE_MODELS,
  OPENROUTER_ACCOUNT_VIDEO_MODELS,
} from "@/service/openrouter/account-media-models";
import {
  defaultOpenRouterImageResolution,
  defaultOpenRouterVideoResolution,
  openRouterImageUserUsd,
  openRouterVideoUserUsd,
} from "@/service/openrouter/media-price";

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

// Video models that accept extra reference stills on the canvas.
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

export const OPENROUTER_STATIC_MODELS: CanvasModelSpec[] = ACCOUNT_MEDIA_MODELS.openrouter;
export const MINIMAX_STATIC_MODELS: CanvasModelSpec[] = ACCOUNT_MEDIA_MODELS.minimax;
