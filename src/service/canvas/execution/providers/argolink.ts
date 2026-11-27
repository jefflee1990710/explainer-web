// ArgoLink (ARGOLINK_API_KEY): chat text settles immediately; video is async.
// A callback settles a video job; polling is the fallback.

import { argolinkCallbackUrl, argolinkStatusUrl } from "@/service/argolink/client";
import {
  pollGenerationStatus,
  settleVideoSubmitResponse,
} from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";
import { completeCanvasTextJob } from "@/service/canvas/execution/text-charge";

const LABEL = "ArgoLink";

export const argolinkProvider: CanvasProviderAdapter = {
  provider: "argolink",
  presetFromCatalog: false,
  credentialError: (_spec, resolved) =>
    resolved.hasArgolinkKey()
      ? undefined
      : "ArgoLink 尚未設定 API Key（ARGOLINK_API_KEY），暫時無法執行此模型。",
  dispatch: async (ctx) => {
    const { spec, node, inputs } = ctx;
    if (spec.category === "text") {
      const prompt = inputs.prompt?.trim();
      if (!prompt) throw new Error("請先輸入提示詞");
      const result = await ctx.resolved.generateCanvasText({ model: spec.providerModelId, prompt });
      return completeCanvasTextJob(ctx, result);
    }
    const response = await ctx.resolved.submitArgolinkCanvasVideo({
      model: spec.providerModelId,
      prompt: inputs.prompt,
      aspectRatio: node.data.aspectRatio ?? node.data.presetId,
      durationSeconds: node.data.durationSeconds ?? spec.defaultDurationSeconds,
      referenceImageUrls: inputs.refImages,
      videoUrl: inputs.video,
      audioUrl: inputs.refAudio,
      callbackUrl: argolinkCallbackUrl(),
    });
    return settleVideoSubmitResponse(ctx, LABEL, response);
  },
  poll: async (job, resolved) => {
    const statusUrl =
      job.statusUrl || (job.externalJobId ? argolinkStatusUrl(job.externalJobId) : undefined);
    if (!statusUrl) return job;
    return pollGenerationStatus(job, resolved, {
      label: LABEL,
      fetchStatus: () => resolved.fetchArgolinkCanvasVideo(statusUrl),
      outputUrl: (remote) => remote.video?.url,
      missingOutputMessage: "ArgoLink 任務已完成但未回傳影片",
    });
  },
};
