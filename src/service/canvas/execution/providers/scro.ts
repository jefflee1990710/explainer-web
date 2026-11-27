// Scro Tool nodes (`scro:*`): auto captions and TTS / Life / Poster finish in the request;
// every other tool hands off to a Scro domain job (video, jutsu, teleport, explainer frame).

import type { CanvasOutputKind } from "@/model/canvas";
import { normalizeCaptionLanguage } from "@/service/canvas/core/captions";
import { transcribeCaptionVideo } from "@/service/canvas/execution/caption-transcribe";
import { markJobCompleted } from "@/service/canvas/execution/job-ledger";
import { settleCompletedJob, settleFailedJob } from "@/service/canvas/execution/jobs/settle";
import { validateScroToolInputs } from "@/service/canvas/execution/scro-dispatch";
import { completedResult, runningResult } from "@/service/canvas/execution/providers/shared";
import type { CanvasProviderAdapter } from "@/service/canvas/execution/providers/types";
import { isElevenLabsConfigured } from "@/service/voice/elevenlabs";
import { cleanSpeechVideo } from "@/service/canvas/execution/clean-speech";
import { smartReframeVideo } from "@/service/canvas/execution/smart-reframe";
import { DEFAULT_SPEECH_CUT_OPTIONS } from "@/service/canvas/core/speech-cuts";
import { REFRAME_ASPECTS, type ReframeAspect } from "@/service/canvas/core/smart-reframe";

const SYNC_TOOL_IDS = new Set(["scro:tts", "scro:life", "scro:poster", "scro:character"]);

export const scroProvider: CanvasProviderAdapter = {
  provider: "scro",
  presetFromCatalog: false,
  credentialError: (spec) => {
    if ((spec.id === "scro:auto-captions" || spec.id === "scro:clean-speech") && !isElevenLabsConfigured()) {
      return "ElevenLabs 尚未設定 API Key（ELEVENLABS_API_KEY），暫時無法辨識語音。";
    }
    if (spec.id === "scro:smart-reframe" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
      return "Google AI Studio 尚未設定 API Key（GOOGLE_GENERATIVE_AI_API_KEY），暫時無法追蹤主體。";
    }
    return undefined;
  },
  validateInputs: (spec, node, inputs) => validateScroToolInputs(spec.id, node, inputs),
  dispatch: async (ctx) => {
    const { spec, node, inputs, resolved } = ctx;
    const params = node.data.toolParams ?? {};

    if (spec.id === "scro:clean-speech") {
      if (!inputs.video) throw new Error("智慧去口誤需要輸入有聲音的影片");
      const out = await cleanSpeechVideo({
        videoUrl: inputs.video,
        language: normalizeCaptionLanguage(params.captionLanguage ?? node.data.presetId),
        options: {
          fillers: params.cleanFillers !== false,
          repeats: params.cleanRepeats !== false,
          maxPauseSec:
            typeof params.cleanMaxPauseSec === "number"
              ? Math.min(5, Math.max(0, params.cleanMaxPauseSec))
              : DEFAULT_SPEECH_CUT_OPTIONS.maxPauseSec,
        },
        pathname: `canvas/${ctx.clerkUserId}/${ctx.jobIdHex}.mp4`,
      });
      return completedResult(ctx, {
        outputUrl: out.outputUrl,
        outputKind: "video",
        extraNodePatch: { text: out.report, ...(out.outputMeta ? { outputMeta: out.outputMeta } : {}) },
      });
    }

    if (spec.id === "scro:smart-reframe") {
      if (!inputs.video) throw new Error("智慧重新構圖需要輸入影片");
      const aspect = String(params.reframeAspect ?? "9:16");
      const out = await smartReframeVideo({
        videoUrl: inputs.video,
        aspect: (REFRAME_ASPECTS as readonly string[]).includes(aspect) ? (aspect as ReframeAspect) : "9:16",
        resolution: params.reframeResolution === "720p" ? "720p" : "1080p",
        motion: params.reframeMotion === "follow" ? "follow" : "steady",
        focus: typeof params.reframeFocus === "string" ? params.reframeFocus.slice(0, 200) : "",
        pathname: `canvas/${ctx.clerkUserId}/${ctx.jobIdHex}.mp4`,
      });
      return completedResult(ctx, {
        outputUrl: out.outputUrl,
        outputKind: "video",
        extraNodePatch: { text: out.report, ...(out.outputMeta ? { outputMeta: out.outputMeta } : {}) },
      });
    }

    if (spec.id === "scro:auto-captions") {
      const videoUrl = inputs.video;
      if (!videoUrl) throw new Error("自動字幕需要輸入有聲音的影片");
      const language = normalizeCaptionLanguage(node.data.toolParams?.captionLanguage ?? node.data.presetId);
      const out = await transcribeCaptionVideo({
        videoUrl,
        language,
        pathname: `canvas/${ctx.clerkUserId}/${ctx.jobIdHex}.srt`,
      });
      return completedResult(ctx, {
        outputUrl: out.outputUrl,
        outputKind: "text",
        extraNodePatch: { text: out.srt },
      });
    }

    if (SYNC_TOOL_IDS.has(spec.id)) {
      const out = await resolved.executeScroSyncNode({
        clerkUserId: ctx.clerkUserId,
        jobIdHex: ctx.jobIdHex,
        modelId: spec.id,
        node,
        inputs,
      });
      return completedResult(ctx, { outputUrl: out.outputUrl, outputKind: out.outputKind });
    }

    const submitted = await resolved.submitScroAsyncNode({
      clerkUserId: ctx.clerkUserId,
      canvasIdHex: ctx.canvasIdHex,
      jobIdHex: ctx.jobIdHex,
      modelId: spec.id,
      node,
      inputs,
    });
    return runningResult(ctx, {
      domainKind: submitted.domainKind,
      externalJobId: submitted.externalJobId,
    });
  },
  poll: async (job, resolved) => {
    if (
      !job.externalJobId ||
      (job.domainKind !== "video" &&
        job.domainKind !== "jutsu" &&
        job.domainKind !== "teleport" &&
        job.domainKind !== "explainer_frame")
    ) {
      return job;
    }
    const pollRes = await resolved
      .pollScroAsyncJob({
        clerkUserId: job.clerkUserId,
        domainKind: job.domainKind,
        externalJobId: job.externalJobId,
      })
      .catch(() => ({ status: "running" as const }));

    if (pollRes.status === "failed") {
      return settleFailedJob(job, pollRes.error, resolved);
    }
    if (pollRes.status === "completed") {
      // Scro domain jobs that already wrote to Vercel Blob need no second copy.
      if (pollRes.outputUrl.includes(".public.blob.vercel-storage.com/")) {
        const outputKind: CanvasOutputKind = job.outputKind ?? "video";
        return markJobCompleted(job, { outputUrl: pollRes.outputUrl, outputKind }, resolved);
      }
      return settleCompletedJob(job, pollRes.outputUrl, resolved);
    }
    return job;
  },
};
