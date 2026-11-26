// Official MiniMax API (MINIMAX_API_KEY): synchronous images and async videos polled by status URL.

import {
  dispatchSyncImage,
  pollGenerationStatus,
  providerVideoInput,
  settleVideoSubmitResponse,
} from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

const LABEL = "MiniMax";

export const minimaxProvider: CanvasProviderAdapter = {
  provider: "minimax",
  presetFromCatalog: false,
  credentialError: (_spec, resolved) =>
    resolved.hasMinimaxKey()
      ? undefined
      : "MiniMax 尚未設定 API Key（MINIMAX_API_KEY），暫時無法執行此模型。",
  dispatch: async (ctx) => {
    if (ctx.spec.category === "image") {
      return dispatchSyncImage(ctx, LABEL, (input) => ctx.resolved.submitMinimaxCanvasImage(input));
    }
    const response = await ctx.resolved.submitMinimaxCanvasVideo(providerVideoInput(ctx));
    return settleVideoSubmitResponse(ctx, LABEL, response);
  },
  poll: async (job, resolved) => {
    const statusUrl = job.statusUrl;
    if (!statusUrl) return job;
    return pollGenerationStatus(job, resolved, {
      label: LABEL,
      fetchStatus: () => resolved.fetchMinimaxCanvasVideo(statusUrl),
      outputUrl: (remote) => remote.video?.url,
      missingOutputMessage: "MiniMax 任務已完成但未回傳影片",
    });
  },
};
