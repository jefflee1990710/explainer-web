// Dispatch and poll steps shared by the OpenRouter, Google AI Studio, and MiniMax adapters.

import type { CanvasJob } from "@/model/canvas";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { withCanvasWardrobeLock } from "@/service/canvas/core/character-wardrobe";
import { markJobCompleted, markJobRunning } from "@/service/canvas/execution/job-ledger";
import {
  buildCanvasBlobPathname,
  toErrorMessage,
  type CanvasExecutorDeps,
  type SubmitCanvasNodeJobResult,
} from "@/service/canvas/execution/jobs/deps";
import { settleCompletedJob, settleFailedJob } from "@/service/canvas/execution/jobs/settle";
import type { CanvasDispatchContext } from "@/service/canvas/execution/providers/types";

const NSFW_REFUND_MESSAGE = "內容觸發安全審核限制，已自動退還 USD Credit";

export function normalizeOpenRouterImageAspectRatio(raw?: string): AspectRatio | "2:3" | "3:4" {
  if (raw === "9:16" || raw === "1:1" || raw === "2:3" || raw === "3:4") {
    return raw;
  }
  return "16:9";
}

export function normalizeOpenRouterVideoAspectRatio(raw?: string): AspectRatio {
  if (raw === "9:16" || raw === "3:4") return "9:16";
  if (raw === "1:1") return "1:1";
  return "16:9";
}

// Marks the job completed and returns it with the user's fresh balance.
export async function completedResult(
  ctx: CanvasDispatchContext,
  output: Parameters<typeof markJobCompleted>[1],
): Promise<SubmitCanvasNodeJobResult> {
  const job = await markJobCompleted(ctx.initialJob, output, ctx.resolved);
  const creditUsd = await ctx.resolved.getUserCreditUsd(ctx.clerkUserId);
  return { ok: true, job, creditUsd };
}

// Marks the job running (polled later) and returns it with the user's fresh balance.
export async function runningResult(
  ctx: CanvasDispatchContext,
  update: Parameters<typeof markJobRunning>[1],
): Promise<SubmitCanvasNodeJobResult> {
  const job = await markJobRunning(ctx.initialJob, update, ctx.resolved);
  const creditUsd = await ctx.resolved.getUserCreditUsd(ctx.clerkUserId);
  return { ok: true, job, creditUsd };
}

// Synchronous image: the response already holds the picture, so it goes straight to Blob.
export async function dispatchSyncImage(
  ctx: CanvasDispatchContext,
  label: string,
  submit: (input: {
    model: string;
    prompt: string;
    aspectRatio: AspectRatio | "2:3" | "3:4";
    resolution?: "1k" | "2k" | "4k";
    referenceImageUrls?: Array<string | undefined>;
  }) => Promise<GenerationSubmitResult>,
): Promise<SubmitCanvasNodeJobResult> {
  const { spec, node, inputs } = ctx;
  const response = await submit({
    model: spec.providerModelId,
    prompt: withCanvasWardrobeLock(inputs.prompt || "", inputs.characterRefPositions),
    aspectRatio: normalizeOpenRouterImageAspectRatio(node.data.aspectRatio ?? node.data.presetId),
    resolution: node.data.resolution,
    referenceImageUrls: inputs.refImages,
  });

  const rawOutputUrl = response.images?.[0]?.url;
  if (response.status === "nsfw" || response.status === "failed" || !rawOutputUrl) {
    throw new Error(response.error || `${label} 圖片生成失敗`);
  }

  const blobPath = buildCanvasBlobPathname(ctx.clerkUserId, ctx.jobIdHex, "image", rawOutputUrl);
  const permanentUrl = await ctx.resolved.persistMedia(rawOutputUrl, blobPath);
  return completedResult(ctx, {
    outputUrl: permanentUrl,
    outputKind: "image",
    externalJobId: response.request_id,
  });
}

// Async video request shared by OpenRouter and the official MiniMax API.
export function providerVideoInput(ctx: CanvasDispatchContext) {
  const { spec, node, inputs } = ctx;
  return {
    model: spec.providerModelId,
    prompt: inputs.prompt,
    aspectRatio: normalizeOpenRouterVideoAspectRatio(node.data.aspectRatio ?? node.data.presetId),
    durationSeconds: node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 5,
    resolution: node.data.resolution,
    startImageUrl: inputs.startImage,
    endImageUrl: inputs.endImage,
    referenceImageUrls: inputs.refImages,
    audioUrl: inputs.refAudio,
    videoUrl: inputs.video,
  };
}

// Persist a provider video that finished in the submit response, or leave it running for polling.
export async function settleSubmittedVideo(
  ctx: CanvasDispatchContext,
  response: GenerationSubmitResult,
): Promise<SubmitCanvasNodeJobResult> {
  if (response.status === "completed" && response.video?.url) {
    const blobPath = buildCanvasBlobPathname(ctx.clerkUserId, ctx.jobIdHex, "video", response.video.url);
    const permanentUrl = await ctx.resolved.persistMedia(response.video.url, blobPath);
    return completedResult(ctx, {
      outputUrl: permanentUrl,
      outputKind: "video",
      externalJobId: response.request_id,
      statusUrl: response.status_url,
    });
  }
  return runningResult(ctx, {
    externalJobId: response.request_id,
    statusUrl: response.status_url,
  });
}

// Fails the submit when the provider rejected the video, otherwise settles or keeps polling.
export async function settleVideoSubmitResponse(
  ctx: CanvasDispatchContext,
  label: string,
  response: GenerationSubmitResult,
): Promise<SubmitCanvasNodeJobResult> {
  if (response.status === "failed" || response.status === "nsfw") {
    throw new Error(response.error || `${label} 影片生成失敗`);
  }
  return settleSubmittedVideo(ctx, response);
}

// Reads one provider status. Network errors keep the job running for the next poll.
export async function pollGenerationStatus(
  job: CanvasJob,
  resolved: CanvasExecutorDeps,
  options: {
    label: string;
    fetchStatus: () => Promise<GenerationSubmitResult>;
    outputUrl: (remote: GenerationSubmitResult) => string | undefined;
    missingOutputMessage: string;
  },
): Promise<CanvasJob> {
  let remote: GenerationSubmitResult;
  try {
    remote = await options.fetchStatus();
  } catch (error) {
    console.warn(`[canvas-executor] transient ${options.label} poll error`, {
      jobId: job._id.toHexString(),
      error: toErrorMessage(error, `${options.label} poll failed`),
    });
    return job;
  }

  if (remote.status === "completed") {
    const rawUrl = options.outputUrl(remote);
    if (!rawUrl) return settleFailedJob(job, options.missingOutputMessage, resolved);
    return settleCompletedJob(job, rawUrl, resolved);
  }
  if (remote.status === "failed" || remote.status === "nsfw") {
    const defaultMsg = remote.status === "nsfw" ? NSFW_REFUND_MESSAGE : `${options.label} 影片生成失敗`;
    return settleFailedJob(job, remote.error || defaultMsg, resolved);
  }
  return job;
}
