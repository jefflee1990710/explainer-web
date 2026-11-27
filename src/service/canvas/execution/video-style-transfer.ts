// Builds the style prompt and points the canvas job at the video model the user picked.
// Dispatch then uses that model's existing adapter, with this video as the source.

import type { CanvasAspectRatio, CanvasJob, CanvasNode } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { isStyleId } from "@/model/style-id";
import {
  VIDEO_STYLE_TRANSFER_MODEL_ID,
  clampVideoStyleDuration,
  videoStyleAspectRatio,
  videoStyleTransferModelChoices,
} from "@/service/canvas/catalog/video-style-transfer";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import { resolvedStyle } from "@/service/style/load-style";
import { styleBlockForDirector } from "@/service/style/prompts";

export type VideoStyleTransferPlan = {
  model: CanvasModelSpec;
  styleId: string;
  prompt: string;
  videoUrl: string;
  durationSeconds: number;
  aspectRatio: string;
};

export type VideoStyleTransferPlanResult =
  | { ok: true; plan: VideoStyleTransferPlan }
  | { ok: false; missing: string[]; reason: string };

type StylePrompt = {
  id?: string;
  name: string;
  canvas: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
};

// Tells the video model to restyle the connected clip and leave the action alone.
export function videoStyleTransferPrompt(style: StylePrompt): string {
  return [
    `Restyle the input video into the visual style "${style.name}".`,
    "Keep the same subjects, actions, camera, timing, and framing. Change only how the picture is drawn and how it moves.",
    styleBlockForDirector(style),
  ].join("\n");
}

function missingReason(missing: string[]): string {
  if (missing.includes("video")) return "影片風格轉移需要連接輸入影片";
  if (missing.includes("styleId")) return "請選擇風格";
  if (missing.includes("videoModelId")) return "請選擇影片模型";
  return "影片風格轉移的設定不完整";
}

// Style, video model, and source video required before a job can be priced or sent.
export function planVideoStyleTransfer(input: {
  node: CanvasNode;
  videoUrl?: string;
  catalog: readonly CanvasModelSpec[];
}): VideoStyleTransferPlanResult {
  const missing: string[] = [];
  const videoUrl = input.videoUrl?.trim() ?? "";
  if (!videoUrl) missing.push("video");

  const rawStyle = input.node.data.toolParams?.styleId;
  const styleId = typeof rawStyle === "string" ? rawStyle.trim() : "";
  if (!isStyleId(styleId)) missing.push("styleId");

  const rawModel = input.node.data.toolParams?.videoModelId;
  const videoModelId = typeof rawModel === "string" ? rawModel.trim() : "";
  const model = videoStyleTransferModelChoices(input.catalog).find((spec) => spec.id === videoModelId);
  if (!model) missing.push("videoModelId");

  if (!model || !isStyleId(styleId) || missing.length > 0) {
    return { ok: false, missing, reason: missingReason(missing) };
  }

  const style = resolvedStyle(styleId);
  return {
    ok: true,
    plan: {
      model,
      styleId,
      prompt: videoStyleTransferPrompt(style),
      videoUrl,
      durationSeconds: clampVideoStyleDuration(model, input.node.data.durationSeconds),
      aspectRatio: videoStyleAspectRatio(input.node, model),
    },
  };
}

export type RetargetableCanvasJob = {
  initialJob: CanvasJob;
  spec: CanvasModelSpec;
  node: CanvasNode;
  inputs: ResolvedCanvasInputs;
  presetId: string;
};

type JobCatalog = {
  getCatalog: () => Promise<CanvasModelSpec[]>;
  updateCanvasJob: (
    jobId: CanvasJob["_id"],
    clerkUserId: string,
    update: {
      $set?: Partial<CanvasJob>;
      $unset?: Partial<Record<keyof CanvasJob, "" | 1>>;
    },
  ) => Promise<void>;
};

function canvasAspect(value: string): CanvasAspectRatio | undefined {
  if (value === "16:9" || value === "9:16" || value === "1:1" || value === "4:3" || value === "3:4") {
    return value;
  }
  return undefined;
}

// Leaves every other model alone. A style-transfer job is rewritten onto the picked video model.
export async function retargetVideoStyleTransferJob(
  ctx: RetargetableCanvasJob,
  resolved: JobCatalog,
): Promise<RetargetableCanvasJob> {
  if (ctx.spec.id !== VIDEO_STYLE_TRANSFER_MODEL_ID) return ctx;

  const catalog = await resolved.getCatalog();
  const planned = planVideoStyleTransfer({
    node: ctx.node,
    videoUrl: ctx.inputs.video,
    catalog,
  });
  if (!planned.ok) throw new Error(planned.reason);

  const plan = planned.plan;
  const inputSnapshot: Record<string, unknown> = {
    ...ctx.initialJob.inputSnapshot,
    prompt: plan.prompt,
    video: plan.videoUrl,
    styleId: plan.styleId,
    videoModelId: plan.model.id,
    durationSeconds: plan.durationSeconds,
    aspectRatio: plan.aspectRatio,
  };
  const nextJob: CanvasJob = {
    ...ctx.initialJob,
    provider: plan.model.provider,
    modelId: plan.model.id,
    providerModelId: plan.model.providerModelId,
    presetId: plan.aspectRatio,
    inputSnapshot,
  };
  await resolved.updateCanvasJob(ctx.initialJob._id, ctx.initialJob.clerkUserId, {
    $set: {
      provider: nextJob.provider,
      modelId: nextJob.modelId,
      providerModelId: nextJob.providerModelId,
      presetId: nextJob.presetId,
      inputSnapshot,
    },
  });

  return {
    initialJob: nextJob,
    spec: plan.model,
    node: {
      ...ctx.node,
      data: {
        ...ctx.node.data,
        durationSeconds: plan.durationSeconds,
        aspectRatio: canvasAspect(plan.aspectRatio) ?? ctx.node.data.aspectRatio,
        prompt: plan.prompt,
      },
    },
    inputs: {
      ...ctx.inputs,
      prompt: plan.prompt,
      video: plan.videoUrl,
    },
    presetId: plan.aspectRatio,
  };
}
