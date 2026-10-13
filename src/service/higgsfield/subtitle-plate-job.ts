import type { ObjectId } from "mongodb";
import sharp from "sharp";
import { generationJobsCollection, videosCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { Project, SubtitlePlate } from "@/model/project";
import { refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { isMagentaKeyPixel, plateIsEmpty, PLATE_EMPTY_ERROR, subtitlePlatePrompt } from "@/service/director/subtitle-plate";
import { resolveSceneText } from "@/service/director/scene-text";
import { subtitleLookLine } from "@/service/director/subtitle-look";
import {
  imageModelForSubmit,
  imageRouteForSceneText,
  resolveImageRoute,
} from "@/service/generation/image-backend";
import { toSent, type Sent } from "@/service/generation/sent";
import { PermanentJobError } from "@/service/generation/task-policy";
import { insertPendingJobs, kickJob } from "@/service/generation/task-store";
import { submitImage } from "@/service/higgsfield/generate";
import { persistBuffer } from "@/service/higgsfield/persist";
import { mergeReadySubtitleFrames } from "@/service/higgsfield/merge-subtitle-frames";
import { PLATE_LINE_CHANGED_ERROR, plateLineStale } from "@/service/video-edit/subtitle-export";

// The graphic is a wide strip; the export filter scales it to the frame width.
const PLATE_ASPECT_RATIO = "16:9" as const;

// Turn #FF00FF into transparency. `ratio` is the share of pixels that stay opaque.
export async function keyMagentaPng(png: Buffer): Promise<{ png: Buffer; ratio: number }> {
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  const rgba = Buffer.alloc(pixels * 4);
  let kept = 0;
  for (let index = 0; index < pixels; index += 1) {
    const r = data[index * 3];
    const g = data[index * 3 + 1];
    const b = data[index * 3 + 2];
    const out = index * 4;
    rgba[out] = r;
    rgba[out + 1] = g;
    rgba[out + 2] = b;
    // Same rule as opaqueRatio(), counted inline so a large plate never builds a pixel array.
    if (isMagentaKeyPixel(r, g, b)) {
      rgba[out + 3] = 0;
    } else {
      rgba[out + 3] = 255;
      kept += 1;
    }
  }
  const keyed = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return { png: keyed, ratio: pixels === 0 ? 0 : kept / pixels };
}

// Look line and optional sample URL: a custom text style sends its sample as image 1.
function plateLook(project: Project) {
  const sample = project.textStyleImageUrl || undefined;
  return {
    sample,
    prompt: (line: string) =>
      subtitlePlatePrompt({
        line,
        language: project.language,
        lookLine: subtitleLookLine(project.subtitleLook),
        sampleImageIndex: sample ? 1 : undefined,
      }),
  };
}

// Queue plates for storyboard clips (all of them, or only `clipNumbers`). The credit is taken
// by the caller. Jobs go in first and rows after, so a row never sits `queued` without a job.
export async function enqueueSubtitlePlateJobs(
  project: Project,
  clipNumbers?: number[],
  options?: { skipOverlayCheck?: boolean },
): Promise<void> {
  if (!project.phaseA) return;
  if (!options?.skipOverlayCheck && project.subtitleOverlay !== true) return;
  const only = clipNumbers ? new Set(clipNumbers) : undefined;
  const clips = project.phaseA.clips.filter((clip) => !only || only.has(clip.clipNumber));
  if (clips.length === 0) return;

  const model = imageRouteForSceneText(resolveSceneText(project).language).model;
  const submittedAt = new Date().toISOString();
  const numbers = new Set(clips.map((clip) => clip.clipNumber));
  const plates: SubtitlePlate[] = clips.map((clip) => ({
    clipNumber: clip.clipNumber,
    status: "queued",
    submittedAt,
    creditsCharged: FRAME_COST,
    // The line this plate is drawn for; a later edit makes it stale.
    line: clip.englishVo?.trim() || undefined,
  }));

  const jobs = await generationJobsCollection();
  const projects = await videosCollection();
  // A re-run replaces any earlier plate job for these clips.
  await jobs.deleteMany({
    projectId: project._id,
    kind: "subtitlePlate",
    clipIndex: { $in: clips.map((clip) => clip.clipNumber - 1) },
  });
  const ids = await insertPendingJobs(
    clips.map((clip) => ({
      projectId: project._id,
      clipIndex: clip.clipNumber - 1,
      kind: "subtitlePlate" as const,
      model,
    })),
  );
  try {
    const kept = (project.subtitlePlates || []).filter((plate) => !numbers.has(plate.clipNumber));
    await projects.updateOne(
      { _id: project._id },
      { $set: { subtitlePlates: [...kept, ...plates], updatedAt: new Date() } },
    );
  } catch (error) {
    // No row points at these jobs, so remove them before anything can send them.
    await jobs.deleteMany({ _id: { $in: ids } }).catch((cleanupError) => {
      console.error("[subtitle-plate] job cleanup failed", { cleanupError });
    });
    throw error;
  }
  ids.forEach((id) => kickJob(id));
}

// Fail a completed plate whose clip line changed, and drop its job. No charge, no refund:
// the plate was already paid for and delivered; the user retries it for FRAME_COST.
export async function invalidatePlatesForChangedVo(
  projectId: ObjectId,
  clipNumbers: number[],
): Promise<void> {
  if (clipNumbers.length === 0) return;
  const projects = await videosCollection();
  const jobs = await generationJobsCollection();
  let failed = false;
  for (const clipNumber of clipNumbers) {
    const result = await projects.updateOne(
      { _id: projectId, subtitlePlates: { $elemMatch: { clipNumber, status: "completed" } } },
      {
        $set: {
          "subtitlePlates.$.status": "failed",
          "subtitlePlates.$.error": PLATE_LINE_CHANGED_ERROR,
          updatedAt: new Date(),
        },
        $unset: { "subtitlePlates.$.blobUrl": "", "subtitlePlates.$.outputUrl": "" },
      },
    );
    if (result.matchedCount > 0) failed = true;
  }
  if (!failed) return;
  await jobs.deleteMany({
    projectId,
    kind: "subtitlePlate",
    clipIndex: { $in: clipNumbers.map((number) => number - 1) },
  });
}

// Send one plate to the image provider. Never a video: the kind has its own branch in sendJob.
export async function sendSubtitlePlate(project: Project, clipNumber: number): Promise<Sent> {
  const clip = project.phaseA?.clips.find((item) => item.clipNumber === clipNumber);
  if (!clip) throw new PermanentJobError("找不到這段分鏡");
  const line = clip.englishVo?.trim();
  if (!line) throw new PermanentJobError("這段沒有字幕內容");
  const look = plateLook(project);
  const sceneText = resolveSceneText(project);
  const route = resolveImageRoute(sceneText.language);
  const model = imageModelForSubmit(route, Boolean(look.sample));
  const submitted = await submitImage({
    model,
    prompt: look.prompt(line),
    aspectRatio: PLATE_ASPECT_RATIO,
    quality: "medium",
    resolution: "1k",
    sceneTextLanguage: sceneText.language,
    // The text-style sample is the only reference image.
    referenceImageUrls: look.sample ? [look.sample] : undefined,
  });
  return toSent(model, submitted);
}

// Fail the plate row once (the status filter is the claim) and refund only the winner.
async function failPlate(
  projectId: ObjectId,
  clipNumber: number,
  error: string,
  refund?: number,
) {
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  if (!project) return;
  const claimed = await projects.updateOne(
    {
      _id: projectId,
      subtitlePlates: {
        $elemMatch: { clipNumber, status: { $in: ["queued", "in_progress"] } },
      },
    },
    {
      $set: {
        "subtitlePlates.$.status": "failed",
        "subtitlePlates.$.error": error,
        updatedAt: new Date(),
      },
    },
  );
  if (claimed.matchedCount === 0) return;
  const plate = project.subtitlePlates?.find((item) => item.clipNumber === clipNumber);
  await refundCredits(project.clerkUserId, refund ?? plate?.creditsCharged ?? FRAME_COST);
}

// Mirror a subtitlePlate job onto the project's plate row. Frames and clip video are untouched.
export async function syncSubtitlePlateJob(
  job: GenerationJob,
  status: GenerationStatus,
  outputUrl?: string,
  // The job's user-facing error, when the caller has one.
  errorMessage?: string,
): Promise<void> {
  if (!job.projectId) return;
  const projectId = job.projectId;
  const clipNumber = job.clipIndex + 1;

  if (status === "failed" || status === "nsfw") {
    const fallback = status === "nsfw" ? "字幕圖未通過內容檢查" : "字幕圖產生失敗";
    const message = errorMessage?.trim() || fallback;
    await failPlate(projectId, clipNumber, message, FRAME_COST);
    return;
  }

  const projects = await videosCollection();
  const project = await projects.findOne({ _id: projectId });
  const plate = project?.subtitlePlates?.find((item) => item.clipNumber === clipNumber);
  if (!project || !plate) return;

  if (status !== "completed" || !outputUrl) {
    if (status === "in_progress" && plate.status === "queued") {
      await projects.updateOne(
        { _id: projectId, subtitlePlates: { $elemMatch: { clipNumber, status: "queued" } } },
        { $set: { "subtitlePlates.$.status": "in_progress", updatedAt: new Date() } },
      );
    }
    return;
  }
  // Already settled (duplicate webhook / poll, or a timeout got there first).
  if (plate.status === "completed" || plate.status === "failed") return;

  // The spoken line changed while this plate was drawing: do not save a stale graphic.
  const clip = project.phaseA?.clips.find((item) => item.clipNumber === clipNumber);
  if (plateLineStale(plate, clip?.englishVo)) {
    await failPlate(projectId, clipNumber, PLATE_LINE_CHANGED_ERROR, plate.creditsCharged);
    return;
  }

  let keyed: { png: Buffer; ratio: number };
  try {
    const response = await fetch(outputUrl);
    if (!response.ok) throw new Error("無法下載字幕圖");
    keyed = await keyMagentaPng(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[subtitle-plate] key failed", { jobId: job._id, error });
    await failPlate(projectId, clipNumber, "字幕圖處理失敗", plate.creditsCharged);
    return;
  }

  if (plateIsEmpty(keyed.ratio)) {
    await failPlate(projectId, clipNumber, PLATE_EMPTY_ERROR, plate.creditsCharged);
    return;
  }

  const blobUrl = await persistBuffer(
    keyed.png,
    `explainer/${projectId.toHexString()}/subtitle-plates/${job._id.toHexString()}.png`,
    "image/png",
  );
  await projects.updateOne(
    {
      _id: projectId,
      subtitlePlates: { $elemMatch: { clipNumber, status: { $in: ["queued", "in_progress"] } } },
    },
    {
      $set: {
        "subtitlePlates.$.status": "completed",
        "subtitlePlates.$.outputUrl": outputUrl,
        "subtitlePlates.$.blobUrl": blobUrl,
        updatedAt: new Date(),
      },
      $unset: { "subtitlePlates.$.error": "" },
    },
  );
  // The stills may already be finished. Burn this plate on, then start video.
  await mergeReadySubtitleFrames(projectId);
  const { queueAutoClipVideos } = await import("@/service/clip/auto-video");
  await queueAutoClipVideos(projectId);
}
