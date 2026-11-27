// Canonical catalog facade for the Interactive Node Canvas Editor (/app/canvas).
// Aggregates modular provider catalogs from `./catalog/*` and re-exports pure spec types.

import type {
  CanvasBilingualLabel,
  CanvasModelCategory,
  CanvasModelOutputSpec,
  CanvasModelProvider,
  CanvasModelRuntimeStatus,
  CanvasModelSpec,
  CanvasPortSpec,
  CanvasPortType,
} from "@/model/canvas-model";
import { ARGOLINK_STATIC_MODELS } from "@/service/canvas/catalog/argolink-models";
import { FFMPEG_STATIC_MODELS } from "@/service/canvas/catalog/ffmpeg-models";
import {
  GOOGLE_STATIC_MODELS,
  NANO_BANANA_CANVAS_MODEL_ID,
} from "@/service/canvas/catalog/google-models";
import {
  type GetCanvasModelCatalogOptions,
  MENTALOK_CATALOG_CACHE_TTL_MS,
  clearMentalokCatalogCache,
  hydrateCanvasModelCatalog,
} from "@/service/canvas/catalog/mentalok-live-cache";
import { MENTALOK_STATIC_MODELS } from "@/service/canvas/catalog/mentalok-models";
import {
  MINIMAX_STATIC_MODELS,
  OPENROUTER_STATIC_MODELS,
} from "@/service/canvas/catalog/openrouter-minimax-models";
import { SCRO_STATIC_MODELS } from "@/service/canvas/catalog/scro-models";
import { MINIMAX_CANVAS_LEGACY_IDS } from "@/service/minimax/official-canvas";

export type {
  CanvasBilingualLabel,
  CanvasModelCategory,
  CanvasModelOutputSpec,
  CanvasModelProvider,
  CanvasModelRuntimeStatus,
  CanvasModelSpec,
  CanvasPortSpec,
  CanvasPortType,
  GetCanvasModelCatalogOptions,
};

export {
  FFMPEG_STATIC_MODELS,
  MENTALOK_CATALOG_CACHE_TTL_MS,
  NANO_BANANA_CANVAS_MODEL_ID,
  SCRO_STATIC_MODELS,
  clearMentalokCatalogCache,
};

export const STATIC_CANVAS_MODELS: readonly CanvasModelSpec[] = [
  ...MENTALOK_STATIC_MODELS,
  ...OPENROUTER_STATIC_MODELS,
  ...MINIMAX_STATIC_MODELS,
  ...GOOGLE_STATIC_MODELS,
  ...ARGOLINK_STATIC_MODELS,
  ...SCRO_STATIC_MODELS,
  ...FFMPEG_STATIC_MODELS,
];

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

// Returns all canvas models, hydrating live Mentalok pricing/presets/status with a 60s TTL cache.
export async function getCanvasModelCatalog(
  options?: GetCanvasModelCatalogOptions,
): Promise<CanvasModelSpec[]> {
  return hydrateCanvasModelCatalog(STATIC_CANVAS_MODELS, options);
}
