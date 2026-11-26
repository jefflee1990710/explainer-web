// Sends a queued canvas job to the provider that owns its model.
// Callers keep importing dispatchQueuedCanvasJobById from "@/service/canvas/execution/executor".

import { ObjectId } from "mongodb";
import { canvasJobsCollection } from "@/dao";
import type { CanvasJob, CanvasNode } from "@/model/canvas";
import type { AspectRatio } from "@/model/project";
import type { GenerationSubmitResult } from "@/service/alicloud/generate";
import { markJobCompleted, markJobFailed, markJobRunning } from "@/service/canvas/execution/job-ledger";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { normalizeCaptionLanguage } from "@/service/canvas/execution/captions";
import { transcribeCaptionVideo } from "@/service/canvas/execution/caption-transcribe";
import type { MentalokCreateJobPayload } from "@/service/mentalok/client";
import {
  buildCanvasBlobPathname,
  resolveDeps,
  toErrorMessage,
  type CanvasExecutorDeps,
  type SubmitCanvasNodeJobResult,
} from "@/service/canvas/execution/jobs/deps";
import { settleFailedJob } from "@/service/canvas/execution/jobs/settle";

// Mentalok video models that accept a `keyframes` object (`startImage` / `endImage`).
// Single-frame TI2V models (`wan-2-1`, `wan-2-2`, `ltx-video`) receive `imageUrl` instead.
const MENTALOK_KEYFRAME_MODELS = new Set(["minimax-h3-ref2va", "ltx-2-5"]);

function normalizeOpenRouterImageAspectRatio(
  raw?: string,
): AspectRatio | "2:3" | "3:4" {
  if (raw === "9:16" || raw === "1:1" || raw === "2:3" || raw === "3:4") {
    return raw;
  }
  return "16:9";
}

function normalizeOpenRouterVideoAspectRatio(raw?: string): AspectRatio {
  if (raw === "9:16" || raw === "3:4") return "9:16";
  if (raw === "1:1") return "1:1";
  return "16:9";
}

// Maps resolved Canvas inputs to a Mentalok AI Studio POST /api/v1/jobs payload,
// bridging any data: or non-HTTPS URLs through POST /api/v1/uploads.
async function buildMentalokJobPayload(
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

function inputsFromSnapshot(snapshot: Record<string, unknown>): ResolvedCanvasInputs {
  return {
    prompt: typeof snapshot.prompt === "string" ? snapshot.prompt : undefined,
    image: typeof snapshot.image === "string" ? snapshot.image : undefined,
    startImage: typeof snapshot.startImage === "string" ? snapshot.startImage : undefined,
    endImage: typeof snapshot.endImage === "string" ? snapshot.endImage : undefined,
    refImages: Array.isArray(snapshot.refImages) ? snapshot.refImages.map(String) : [],
    video: typeof snapshot.video === "string" ? snapshot.video : undefined,
    videos: Array.isArray(snapshot.videos) ? snapshot.videos.map(String) : [],
    refAudio: typeof snapshot.refAudio === "string" ? snapshot.refAudio : undefined,
    overlayVideo: typeof snapshot.overlayVideo === "string" ? snapshot.overlayVideo : undefined,
  };
}

export async function dispatchQueuedCanvasJobById(
  jobId: ObjectId,
  deps?: Partial<CanvasExecutorDeps>,
): Promise<CanvasJob | null> {
  const resolved = resolveDeps(deps);
  const job = resolved.findCanvasJobById
    ? await resolved.findCanvasJobById(jobId)
    : await (await canvasJobsCollection()).findOne({ _id: jobId });
  if (!job || job.status !== "queued") return job;

  const project = await resolved.findCanvasProject(job.canvasId, job.clerkUserId);
  const node = project?.nodes.find((n) => n.id === job.nodeId);
  const catalog = await resolved.getCatalog();
  const spec = findCanvasModel(job.modelId, catalog);
  if (!project || !node || !spec) {
    return settleFailedJob(job, "找不到畫布節點或模型規格", resolved);
  }

  const snapshot = job.inputSnapshot ?? {};
  const snapshotDuration =
    typeof snapshot.durationSeconds === "number" && Number.isFinite(snapshot.durationSeconds)
      ? snapshot.durationSeconds
      : undefined;
  const effectiveNode =
    snapshotDuration !== undefined
      ? { ...node, data: { ...node.data, durationSeconds: snapshotDuration } }
      : node;

  const res = await executeDispatchedCanvasJob(
    {
      initialJob: job,
      spec,
      node: effectiveNode,
      inputs: inputsFromSnapshot(snapshot),
      presetId: job.presetId || spec.defaultPresetId,
    },
    resolved,
  );
  return res.job ?? null;
}

// Persist a provider video that finished in the submit response, or leave it running for polling.
async function settleSubmittedVideo(input: {
  response: GenerationSubmitResult;
  initialJob: CanvasJob;
  clerkUserId: string;
  jobIdHex: string;
  resolved: CanvasExecutorDeps;
}): Promise<SubmitCanvasNodeJobResult> {
  const { response, initialJob, clerkUserId, jobIdHex, resolved } = input;
  if (response.status === "completed" && response.video?.url) {
    const blobPath = buildCanvasBlobPathname(clerkUserId, jobIdHex, "video", response.video.url);
    const permanentUrl = await resolved.persistMedia(response.video.url, blobPath);
    const completedJob = await markJobCompleted(
      initialJob,
      {
        outputUrl: permanentUrl,
        outputKind: "video",
        externalJobId: response.request_id,
        statusUrl: response.status_url,
      },
      resolved,
    );
    const creditUsd = await resolved.getUserCreditUsd(clerkUserId);
    return {
      ok: true,
      job: completedJob,
      creditUsd,
    };
  }

  const runningJob = await markJobRunning(
    initialJob,
    {
      externalJobId: response.request_id,
      statusUrl: response.status_url,
    },
    resolved,
  );
  const creditUsd = await resolved.getUserCreditUsd(clerkUserId);
  return {
    ok: true,
    job: runningJob,
    creditUsd,
  };
}

export async function executeDispatchedCanvasJob(
  ctx: {
    initialJob: CanvasJob;
    spec: CanvasModelSpec;
    node: CanvasNode;
    inputs: ResolvedCanvasInputs;
    presetId: string;
  },
  resolved: CanvasExecutorDeps,
): Promise<SubmitCanvasNodeJobResult> {
  const { initialJob, spec, node, inputs, presetId } = ctx;
  const jobId = initialJob._id;
  const jobIdHex = jobId.toHexString();
  const canvasObjectId = initialJob.canvasId;
  const clerkUserId = initialJob.clerkUserId;
  const input = {
    clerkUserId,
    canvasId: canvasObjectId.toHexString(),
  };
  const inputCheck = { inputs };

  try {
    // Branch 1: Synchronous OpenRouter / Google AI Studio image generation -> persist directly to Blob.
    if (
      (spec.provider === "openrouter" || spec.provider === "google" || spec.provider === "minimax") &&
      spec.category === "image"
    ) {
      const imageInput = {
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt || "",
        aspectRatio: normalizeOpenRouterImageAspectRatio(
          node.data.aspectRatio ?? node.data.presetId,
        ),
        resolution: node.data.resolution,
        referenceImageUrls: inputCheck.inputs.refImages,
      };
      const response =
        spec.provider === "google"
          ? await resolved.submitGoogleStudioImage(imageInput)
          : spec.provider === "minimax"
            ? await resolved.submitMinimaxCanvasImage(imageInput)
            : await resolved.submitOpenRouterImage(imageInput);

      const rawOutputUrl = response.images?.[0]?.url;
      if (response.status === "nsfw" || response.status === "failed" || !rawOutputUrl) {
        const fallback =
          spec.provider === "google"
            ? "Google AI Studio 圖片生成失敗"
            : spec.provider === "minimax"
              ? "MiniMax 圖片生成失敗"
              : "OpenRouter 圖片生成失敗";
        throw new Error(response.error || fallback);
      }

      const blobPath = buildCanvasBlobPathname(
        input.clerkUserId,
        jobIdHex,
        "image",
        rawOutputUrl,
      );
      const permanentUrl = await resolved.persistMedia(rawOutputUrl, blobPath);
      const completedJob = await markJobCompleted(
        initialJob,
        {
          outputUrl: permanentUrl,
          outputKind: "image",
          externalJobId: response.request_id,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return { ok: true, job: completedJob, creditUsd };
    }

    // Branch 2: Google AI Studio Omni video. Create returns quickly; polling reads the interaction.
    if (spec.provider === "google" && spec.category === "video") {
      const response = await resolved.submitGoogleStudioVideo({
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt,
        aspectRatio: node.data.aspectRatio ?? node.data.presetId,
        durationSeconds: node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 10,
        startImageUrl: inputCheck.inputs.startImage,
        endImageUrl: inputCheck.inputs.endImage,
        referenceImageUrls: inputCheck.inputs.refImages,
      });
      if (response.status === "failed" || response.status === "nsfw") {
        throw new Error(response.error || "Google AI Studio 影片生成失敗");
      }
      return settleSubmittedVideo({
        response,
        initialJob,
        clerkUserId: input.clerkUserId,
        jobIdHex,
        resolved,
      });
    }

    // Branch 3: Asynchronous video. MiniMax uses the official API; other models stay on OpenRouter.
    if (spec.provider === "openrouter" || spec.provider === "minimax") {
      const videoInput = {
        model: spec.providerModelId,
        prompt: inputCheck.inputs.prompt,
        aspectRatio: normalizeOpenRouterVideoAspectRatio(
          node.data.aspectRatio ?? node.data.presetId,
        ),
        durationSeconds:
          node.data.durationSeconds ?? spec.defaultDurationSeconds ?? 5,
        resolution: node.data.resolution,
        startImageUrl: inputCheck.inputs.startImage,
        endImageUrl: inputCheck.inputs.endImage,
        referenceImageUrls: inputCheck.inputs.refImages,
        audioUrl: inputCheck.inputs.refAudio,
        videoUrl: inputCheck.inputs.video,
      };
      const response = spec.provider === "minimax"
        ? await resolved.submitMinimaxCanvasVideo(videoInput)
        : await resolved.submitOpenRouterCanvasVideo(videoInput);

      if (response.status === "failed" || response.status === "nsfw") {
        throw new Error(
          response.error ||
            (spec.provider === "minimax" ? "MiniMax 影片生成失敗" : "OpenRouter 影片生成失敗"),
        );
      }

      return settleSubmittedVideo({
        response,
        initialJob,
        clerkUserId: input.clerkUserId,
        jobIdHex,
        resolved,
      });
    }

    // Branch 4: Vast.ai Worker FFmpeg utility node.
    if (spec.provider === "ffmpeg") {
      const workerTaskId = await resolved.enqueueFfmpegWorkerTask({
        jobIdHex,
        modelId: spec.id,
        clerkUserId: input.clerkUserId,
      });
      const workerIdHex = workerTaskId.toHexString();
      const runningJob = await markJobRunning(
        initialJob,
        {
          domainKind: "worker_ffmpeg",
          externalJobId: workerIdHex,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: runningJob,
        creditUsd,
      };
    }

    // Branch 5: Scro tool nodes (`scro:*`).
    if (spec.provider === "scro") {
      if (spec.id === "scro:auto-captions") {
        const videoUrl = inputCheck.inputs.video;
        if (!videoUrl) throw new Error("自動字幕需要輸入有聲音的影片");
        const language = normalizeCaptionLanguage(
          node.data.toolParams?.captionLanguage ?? node.data.presetId,
        );
        const out = await transcribeCaptionVideo({
          videoUrl,
          language,
          pathname: `canvas/${input.clerkUserId}/${jobIdHex}.srt`,
        });
        const completedJob = await markJobCompleted(
          initialJob,
          {
            outputUrl: out.outputUrl,
            outputKind: "text",
            extraNodePatch: { text: out.srt },
          },
          resolved,
        );
        const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
        return {
          ok: true,
          job: completedJob,
          creditUsd,
        };
      }

      if (spec.id === "scro:tts" || spec.id === "scro:life" || spec.id === "scro:poster") {
        const out = await resolved.executeScroSyncNode({
          clerkUserId: input.clerkUserId,
          jobIdHex,
          modelId: spec.id,
          node,
          inputs: inputCheck.inputs,
        });
        const completedJob = await markJobCompleted(
          initialJob,
          {
            outputUrl: out.outputUrl,
            outputKind: out.outputKind,
          },
          resolved,
        );
        const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
        return {
          ok: true,
          job: completedJob,
          creditUsd,
        };
      }

      const submitted = await resolved.submitScroAsyncNode({
        clerkUserId: input.clerkUserId,
        canvasIdHex: input.canvasId,
        jobIdHex,
        modelId: spec.id,
        node,
        inputs: inputCheck.inputs,
      });
      const runningJob = await markJobRunning(
        initialJob,
        {
          domainKind: submitted.domainKind,
          externalJobId: submitted.externalJobId,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: runningJob,
        creditUsd,
      };
    }

    // Branch 3: Asynchronous Mentalok AI Studio generation (image/video/editing/segmentation/upscale).
    const mentalokPayload = await buildMentalokJobPayload(
      spec,
      node,
      inputCheck.inputs,
      presetId,
      resolved.ensureMentalokUrl,
    );
    const created = await resolved.createMentalokJob(mentalokPayload);
    if (created.status === "failed") {
      throw new Error(created.error || "Mentalok 任務送出失敗");
    }

    if (created.status === "completed" && created.outputUrl) {
      const outputKind = spec.output.type;
      const blobPath = buildCanvasBlobPathname(
        input.clerkUserId,
        jobIdHex,
        outputKind,
        created.outputUrl,
      );
      const permanentUrl = await resolved.persistMedia(
        created.outputUrl,
        blobPath,
      );
      const completedJob = await markJobCompleted(
        initialJob,
        {
          outputUrl: permanentUrl,
          outputKind,
          externalJobId: created.id,
        },
        resolved,
      );
      const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
      return {
        ok: true,
        job: completedJob,
        creditUsd,
      };
    }

    const runningJob = await markJobRunning(
      initialJob,
      { externalJobId: created.id },
      resolved,
    );
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: true,
      job: runningJob,
      creditUsd,
    };
  } catch (error) {
    const message = toErrorMessage(error, "模型執行失敗，已自動退還 USD Credit");
    const failedJob = await markJobFailed(initialJob, message, resolved);
    const creditUsd = await resolved.getUserCreditUsd(input.clerkUserId);
    return {
      ok: false,
      code: "PROVIDER_ERROR",
      error: message,
      job: failedJob,
      creditUsd,
    };
  }
}
