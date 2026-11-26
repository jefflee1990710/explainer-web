// Registry of canvas provider adapters (1 provider = 1 file in this folder).
// Adding a provider means adding its adapter here; submit, dispatch, and poll need no new branch.

import type { CanvasModelProvider } from "@/model/canvas-model";
import { ffmpegProvider } from "@/service/canvas/execution/providers/ffmpeg";
import { googleProvider } from "@/service/canvas/execution/providers/google";
import { mentalokProvider } from "@/service/canvas/execution/providers/mentalok";
import { minimaxProvider } from "@/service/canvas/execution/providers/minimax";
import { openRouterProvider } from "@/service/canvas/execution/providers/openrouter";
import { scroProvider } from "@/service/canvas/execution/providers/scro";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

export type { CanvasDispatchContext, CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

export const CANVAS_PROVIDER_ADAPTERS: Record<CanvasModelProvider, CanvasProviderAdapter> = {
  mentalok: mentalokProvider,
  openrouter: openRouterProvider,
  google: googleProvider,
  minimax: minimaxProvider,
  scro: scroProvider,
  ffmpeg: ffmpegProvider,
};

export function canvasProviderAdapter(provider: string): CanvasProviderAdapter | undefined {
  return Object.hasOwn(CANVAS_PROVIDER_ADAPTERS, provider)
    ? CANVAS_PROVIDER_ADAPTERS[provider as CanvasModelProvider]
    : undefined;
}

// Unknown providers on stored data: sending falls back to Mentalok and polling to OpenRouter,
// which is what the pre-registry branches did.
export function dispatchAdapterFor(provider: string): CanvasProviderAdapter {
  return canvasProviderAdapter(provider) ?? mentalokProvider;
}

export function pollAdapterFor(provider: string): CanvasProviderAdapter {
  return canvasProviderAdapter(provider) ?? openRouterProvider;
}
