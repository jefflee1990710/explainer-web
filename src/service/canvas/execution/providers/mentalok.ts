// Legacy Mentalok AI Studio models (POST /api/v1/jobs). Kept so older graphs still run.

import type { CanvasNode } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import type { MentalokCreateJobPayload, MentalokJobRecord } from "@/service/mentalok/client";
import { buildCanvasBlobPathname, toErrorMessage } from "@/service/canvas/execution/jobs/deps";
import { settleCompletedJob, settleFailedJob } from "@/service/canvas/execution/jobs/settle";
import { completedResult, runningResult } from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";

// Mentalok video models that accept a `keyframes` object (`startImage` / `endImage`).
// Single-frame TI2V models (`wan-2-1`, `wan-2-2`, `ltx-video`) receive `imageUrl` instead.
const MENTALOK_KEYFRAME_MODELS = new Set(["minimax-h3-ref2va", "ltx-2-5"]);

// Maps resolved Canvas inputs to a Mentalok AI Studio POST /api/v1/jobs payload,
// bridging any data: or non-HTTPS URLs through POST /api/v1/uploads.
export async function buildMentalokJobPayload(
  spec: CanvasModelSpec,
  node: CanvasNode,
  inputs: ResolvedCanvasInputs,
  presetId: string,
  ensureUrl: (mediaUrl: string) => Promise<string>,
): Promise<MentalokCreateJobPayload> {
  const payload: MentalokCreateJobPayload = {
    modelId: spec.providerModelId,
    presetId,
  };

  if (inputs.prompt) {
    payload.prompt = inputs.prompt;
  }
  const negativePrompt = node.data.negativePrompt?.trim();
  if (negativePrompt) {
    payload.negativePrompt = negativePrompt;
  }
  if (typeof node.data.seed === "number" && Number.isFinite(node.data.seed)) {
    payload.seed = Math.trunc(node.data.seed);
  }

  if (inputs.image) {
    payload.imageUrl = await ensureUrl(inputs.image);
  }
  if (inputs.video) {
    payload.videoUrl = await ensureUrl(inputs.video);
  }
  if (inputs.refAudio) {
    payload.refAudioUrl = await ensureUrl(inputs.refAudio);
  }
  if (inputs.refImages.length > 0) {
    payload.refImages = await Promise.all(
      inputs.refImages.map((url) => ensureUrl(url)),
    );
  }

  if (inputs.startImage || inputs.endImage) {
    const startImage = inputs.startImage
      ? await ensureUrl(inputs.startImage)
      : undefined;
    const endImage = inputs.endImage ? await ensureUrl(inputs.endImage) : undefined;

    if (MENTALOK_KEYFRAME_MODELS.has(spec.providerModelId)) {
      payload.keyframes = {
        ...(startImage ? { startImage } : {}),
        ...(endImage ? { endImage } : {}),
      };
    } else if (startImage && !payload.imageUrl) {
      // Single-frame TI2V models (`wan-2-1`, `wan-2-2`, `ltx-video`) take `imageUrl`.
      payload.imageUrl = startImage;
    }
  }

  return payload;
}

export const mentalokProvider: CanvasProviderAdapter = {
  provider: "mentalok",
  presetFromCatalog: true,
  credentialError: (_spec, resolved) =>
    resolved.hasMentalokKey()
      ? undefined
      : "Mentalok AI Studio 尚未設定 API Key（MENTALOK_AI_STUDIO_API_KEY），暫時無法執行此模型。",
  dispatch: async (ctx) => {
    const { spec, node, inputs, presetId, resolved } = ctx;
    const payload = await buildMentalokJobPayload(spec, node, inputs, presetId, resolved.ensureMentalokUrl);
    const created = await resolved.createMentalokJob(payload);
    if (created.status === "failed") {
      throw new Error(created.error || "Mentalok 任務送出失敗");
    }

    if (created.status === "completed" && created.outputUrl) {
      const outputKind = spec.output.type;
      const blobPath = buildCanvasBlobPathname(ctx.clerkUserId, ctx.jobIdHex, outputKind, created.outputUrl);
      const permanentUrl = await resolved.persistMedia(created.outputUrl, blobPath);
      return completedResult(ctx, {
        outputUrl: permanentUrl,
        outputKind,
        externalJobId: created.id,
      });
    }

    return runningResult(ctx, { externalJobId: created.id });
  },
  poll: async (job, resolved) => {
    if (!job.externalJobId) return job;
    let remote: MentalokJobRecord;
    try {
      remote = await resolved.getMentalokJob(job.externalJobId);
    } catch (error) {
      console.warn("[canvas-executor] transient Mentalok poll error", {
        jobId: job._id.toHexString(),
        error: toErrorMessage(error, "Mentalok poll failed"),
      });
      return job;
    }

    if (remote.status === "completed") {
      if (!remote.outputUrl) {
        return settleFailedJob(job, "Mentalok 任務已完成但未回傳輸出檔案", resolved);
      }
      return settleCompletedJob(job, remote.outputUrl, resolved);
    }
    if (remote.status === "failed") {
      return settleFailedJob(job, remote.error || "Mentalok 生成失敗", resolved);
    }
    return job;
  },
};
