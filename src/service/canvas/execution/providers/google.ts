// Google AI Studio (GOOGLE_GENERATIVE_AI_API_KEY): synchronous Gemini images and Omni videos
// whose interaction is polled until it finishes.

import { mentalokProvider } from "@/service/canvas/execution/providers/mentalok";
import {
  dispatchSyncImage,
  pollGenerationStatus,
  settleVideoSubmitResponse,
} from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

const LABEL = "Google AI Studio";

export const googleProvider: CanvasProviderAdapter = {
  provider: "google",
  presetFromCatalog: false,
  credentialError: (_spec, resolved) =>
    resolved.hasGoogleStudioKey()
      ? undefined
      : "Google AI Studio 尚未設定 API Key（GOOGLE_GENERATIVE_AI_API_KEY），暫時無法執行此模型。",
  dispatch: async (ctx) => {
    const { spec, node, inputs, resolved } = ctx;
    if (spec.category === "image") {
      return dispatchSyncImage(ctx, LABEL, (input) => resolved.submitGoogleStudioImage(input));
    }
    if (spec.category !== "video") {
      // Google lists only image and video models; any other kind keeps the Mentalok fallback.
      return mentalokProvider.dispatch(ctx);
    }
    const response = await resolved.submitGoogleStudioVideo({
      model: spec.providerModelId,
      prompt: inputs.prompt,
      aspectRatio: node.data.aspectRatio ?? node.data.presetId,
      durationSeconds: node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 10,
      startImageUrl: inputs.startImage,
      endImageUrl: inputs.endImage,
      referenceImageUrls: inputs.refImages,
    });
    return settleVideoSubmitResponse(ctx, LABEL, response);
  },
  poll: async (job, resolved) => {
    const interactionId = job.externalJobId;
    if (!interactionId || job.outputKind !== "video") return job;
    return pollGenerationStatus(job, resolved, {
      label: LABEL,
      fetchStatus: () => resolved.fetchGoogleStudioVideo(interactionId),
      outputUrl: (remote) => remote.video?.url,
      missingOutputMessage: "Google AI Studio 任務已完成但未回傳影片",
    });
  },
};
