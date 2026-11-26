// OpenRouter: synchronous images and async videos polled through GET /api/v1/videos/{id}.

import { OPENROUTER_VIDEOS_URL } from "@/service/openrouter/generate";
import {
  dispatchSyncImage,
  pollGenerationStatus,
  providerVideoInput,
  settleVideoSubmitResponse,
} from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

const LABEL = "OpenRouter";

export const openRouterProvider: CanvasProviderAdapter = {
  provider: "openrouter",
  presetFromCatalog: false,
  credentialError: (_spec, resolved) =>
    resolved.hasOpenRouterKey()
      ? undefined
      : "OpenRouter 尚未設定 API Key（OPENROUTER_API_KEY），暫時無法執行此模型。",
  dispatch: async (ctx) => {
    if (ctx.spec.category === "image") {
      return dispatchSyncImage(ctx, LABEL, (input) => ctx.resolved.submitOpenRouterImage(input));
    }
    const response = await ctx.resolved.submitOpenRouterCanvasVideo(providerVideoInput(ctx));
    return settleVideoSubmitResponse(ctx, LABEL, response);
  },
  poll: async (job, resolved) => {
    const statusUrl =
      job.statusUrl ||
      (job.externalJobId
        ? `${OPENROUTER_VIDEOS_URL}/${encodeURIComponent(job.externalJobId)}`
        : undefined);
    if (!statusUrl) return job;
    return pollGenerationStatus(job, resolved, {
      label: LABEL,
      fetchStatus: () => resolved.fetchOpenRouterStatus(statusUrl),
      outputUrl: (remote) => remote.video?.url || remote.images?.[0]?.url,
      missingOutputMessage: "OpenRouter 任務已完成但未回傳輸出檔案",
    });
  },
};
