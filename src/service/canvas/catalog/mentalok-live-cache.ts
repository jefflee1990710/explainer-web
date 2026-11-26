// 60-second TTL cache and live metadata hydration for Mentalok AI Studio models.

import type { CanvasModelSpec } from "@/model/canvas-model";
import {
  type MentalokClientOptions,
  type MentalokModelSummary,
  hasMentalokApiKey,
  listMentalokModels,
  mentalokBaseUrl,
} from "@/service/mentalok/client";

export const MENTALOK_CATALOG_CACHE_TTL_MS = 60_000;

export type GetCanvasModelCatalogOptions = MentalokClientOptions & {
  forceRefresh?: boolean;
  now?: number;
};

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

export function mergeMentalokLiveData(
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

// Hydrates live Mentalok pricing/presets/status with a 60s TTL cache, falling back to static specs.
export async function hydrateCanvasModelCatalog(
  staticModels: readonly CanvasModelSpec[],
  options?: GetCanvasModelCatalogOptions,
): Promise<CanvasModelSpec[]> {
  if (!hasMentalokApiKey(options?.apiKey)) {
    return mergeMentalokLiveData(staticModels, null, false);
  }

  const now = options?.now ?? Date.now();
  const baseUrl = mentalokBaseUrl(options?.baseUrl);
  const cacheHit =
    !options?.forceRefresh &&
    mentalokCatalogCache &&
    mentalokCatalogCache.baseUrl === baseUrl &&
    now - mentalokCatalogCache.fetchedAt < MENTALOK_CATALOG_CACHE_TTL_MS;

  if (cacheHit && mentalokCatalogCache) {
    return mergeMentalokLiveData(staticModels, mentalokCatalogCache.byId, true);
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
    return mergeMentalokLiveData(staticModels, byId, true);
  } catch {
    const stale = mentalokCatalogCache?.baseUrl === baseUrl ? mentalokCatalogCache.byId : null;
    return mergeMentalokLiveData(staticModels, stale, true);
  }
}
