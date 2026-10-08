import { ObjectId, type Filter } from "mongodb";
import { videosCollection } from "@/dao";
import type { GenerationJob, GenerationStatus } from "@/model/generation-job";
import type { CoverStatus, Project } from "@/model/project";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { IMAGE_ROUTE_BY_SCENE_TEXT } from "@/service/generation/image-backend";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { toSent } from "@/service/generation/sent";
import { submitImage } from "@/service/higgsfield/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import { FRAME_COST } from "@/service/production-plan";
import { resolveSceneText } from "@/service/director/scene-text";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import { resolveSubtitleLook, subtitleLookLine, textStyleSampleHint } from "@/service/director/subtitle-look";
import { styleLinesForFrame } from "@/service/style/prompts";
import { frameLockReferenceUrls } from "@/service/character/cast-prompt";
import { logoReferenceUrls } from "@/service/higgsfield/frame-prompts";
import { coverSafeAreaPrompt, parseCoverSafeAreas } from "@/service/video-edit/cover-safe-area";
import type { CoverSafeArea } from "@/model/project";
import { mediaSrc } from "@/util/media-src";
import { toPublicVideo } from "@/presentation/serialize";

const COVER_IN_FLIGHT_MS = 15 * 60 * 1000;
export const COVER_PROMPT_MAX = 500;
// Provider rejects image prompts over 5000 characters. Leave headroom.
export const COVER_SUBMISSION_BUDGET = 4500;

export type GenerateReelCoverResult =
  | { ok: true; project: ReturnType<typeof toPublicVideo> }
  | { ok: false; error: string };

type CoverFlight = { coverStatus?: CoverStatus; coverStartedAt?: Date };

function fail(error: unknown, fallback: string): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

export function parseCoverPrompt(raw: unknown): { ok: true; prompt: string } | { ok: false; error: string } {
  const prompt = typeof raw === "string" ? raw.trim() : "";
  if (prompt.length > COVER_PROMPT_MAX) return { ok: false, error: "封面補充需求最多 500 字" };
  return { ok: true, prompt };
}

// Character and setting from the storyboard, so the cover stays this video.
function clipField(value: string | undefined, max: number) {
  const text = value?.trim() ?? "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function coverContinuity(project: Project): string {
  const phase = project.phaseA;
  const cast = project.cast ?? [];
  const character = cast.length
    ? `${cast.map((member) => member.name).join(", ")}. Keep this exact character. Appearance follows the attached blueprint.`
    : phase?.characterLock?.trim();
  return [
    phase?.visualWorld?.trim() && `Setting: ${clipField(phase.visualWorld, 180)}`,
    phase?.palette?.trim() && `Palette: ${clipField(phase.palette, 120)}`,
    character && `Character: ${clipField(character, 180)}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

// Spoken line only. The video title is a file name and must not be lettered.
function coverSpokenLine(project: Project) {
  const clip = project.phaseA?.clips[0];
  const full = clip?.englishVo?.trim();
  if (full) return clipField(full, 180);
  const parts = [clip?.startVo, clip?.endVo].map((part) => part?.trim()).filter(Boolean);
  return parts.length ? clipField(parts.join(" "), 180) : "";
}

function coverBrief(project: Project) {
  const line = coverSpokenLine(project);
  return [
    line
      ? `On-screen text, exactly once: "${line}". Every word stays inside the safe rectangle.`
      : "",
    "Do not write a title or the video name.",
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n");
}

// Style lines sit in front. Cut the tail so the provider accepts the prompt.
export function joinCoverSubmission(parts: string[], budget = COVER_SUBMISSION_BUDGET) {
  const text = parts.map((part) => part.trim()).filter(Boolean).join("\n");
  if (text.length <= budget) return text;
  const head = text.slice(0, budget - 1);
  const cut = head.lastIndexOf("\n");
  return (cut > budget / 2 ? head.slice(0, cut) : head).trim();
}

// Which attached image locks the still, the character, and the logo.
export function coverReferenceNote(counts: { still: number; character: number; logo: number }) {
  const lines: string[] = [];
  let index = 1;
  if (counts.still) {
    lines.push(
      `Attached image ${index} is a still from this video. Match its character, setting, palette, and style. Do not copy its framing or any words on it.`,
    );
    index += counts.still;
  }
  if (counts.character) {
    const end = index + counts.character - 1;
    const label = counts.character === 1 ? `Attached image ${index}` : `Attached images ${index}–${end}`;
    lines.push(
      `${label} lock how the character looks. Draw one instance of that character. Do not copy the sheet layout.`,
    );
    index = end + 1;
  }
  if (counts.logo) {
    lines.push(`Attached image ${index} is the brand logo. Keep it intact. Do not add a title next to it.`);
  }
  return lines.join("\n");
}

// Title, message, hook, and clip lines plus the video's visual style.
export function reelCoverPrompt(project: Project): string {
  const extra = project.coverPrompt?.trim() ?? "";
  const safeArea = coverSafeAreaPrompt(project.coverSafeAreas);
  return [
    safeArea,
    "Single cover still for a finished explainer reel.",
    "No device chrome, no play button, no UI mockup.",
    `Aspect ratio ${project.aspectRatio}.`,
    coverContinuity(project),
    coverBrief(project),
    extra ? `Extra requirement: ${extra}` : "",
  ]
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

export function reelCoverInFlight(doc: CoverFlight, now: Date): boolean {
  if (doc.coverStatus !== "generating" || !doc.coverStartedAt) return false;
  return now.getTime() - doc.coverStartedAt.getTime() < COVER_IN_FLIGHT_MS;
}

// Video-tab poller: cover jobs live in generationJobs, same as frames.
export function isCoverRunning(project: { coverStatus?: CoverStatus }) {
  return project.coverStatus === "generating";
}

function coverClaimFilter(input: { videoId: ObjectId; clerkUserId: string; now: Date }): Filter<Project> {
  const staleAt = new Date(input.now.getTime() - COVER_IN_FLIGHT_MS);
  return {
    _id: input.videoId,
    clerkUserId: input.clerkUserId,
    $or: [
      { coverStatus: { $ne: "generating" } },
      { coverStartedAt: { $exists: false } },
      { coverStartedAt: { $lte: staleAt } },
    ],
  };
}

function ownedCoverFilter(videoId: ObjectId, clerkUserId: string, coverStartedAt: Date) {
  return { _id: videoId, clerkUserId, coverStartedAt };
}

async function claimCoverRefund(videoId: ObjectId, clerkUserId: string, coverStartedAt: Date) {
  const videos = await videosCollection();
  const claimed = await videos.updateOne(
    { ...ownedCoverFilter(videoId, clerkUserId, coverStartedAt), coverCreditsCharged: true },
    {
      $set: {
        coverStatus: "failed",
        coverCreditsCharged: false,
        updatedAt: new Date(),
      },
    },
  );
  if (claimed.matchedCount !== 1) return;
  try {
    await refundCredits(clerkUserId, FRAME_COST);
  } catch (error) {
    await videos.updateOne(ownedCoverFilter(videoId, clerkUserId, coverStartedAt), {
      $set: { coverCreditsCharged: true, updatedAt: new Date() },
    });
    throw error;
  }
}

// Remember the checked apps on this video. Opening the cover dialog again
// restores them, so the user does not tick the same boxes twice.
export async function saveCoverSafeAreasAction(
  videoId: string,
  safeAreas: CoverSafeArea[],
): Promise<GenerateReelCoverResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "找不到影片" };
    const safe = parseCoverSafeAreas(safeAreas);
    if (!safe.ok) return safe;

    const videos = await videosCollection();
    const now = new Date();
    const updated = await videos.findOneAndUpdate(
      { _id: new ObjectId(videoId), clerkUserId: user.clerkUserId },
      safe.areas.length
        ? { $set: { coverSafeAreas: safe.areas, updatedAt: now } }
        : { $set: { updatedAt: now }, $unset: { coverSafeAreas: "" } },
      { returnDocument: "after" },
    );
    return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
  } catch (error) {
    return fail(error, "封面安全區無效");
  }
}

// Claim the slot, charge once, then queue a reelCover still.
export async function generateReelCoverAction(
  videoId: string,
  extraPrompt?: string,
  safeAreas?: CoverSafeArea[],
): Promise<GenerateReelCoverResult> {
  let spendKey: string | undefined;
  let jobQueued = false;
  let id: ObjectId | undefined;
  let coverStartedAt: Date | undefined;
  let ownerClerkUserId = "";

  try {
    const user = await requireAppUser();
    ownerClerkUserId = user.clerkUserId;
    if (!ObjectId.isValid(videoId)) return { ok: false, error: "找不到影片" };

    const videos = await videosCollection();
    const video = await videos.findOne({ _id: new ObjectId(videoId), clerkUserId: user.clerkUserId });
    if (!video) return { ok: false, error: "找不到影片" };
    if (!video.phaseA) return { ok: false, error: "還沒有分鏡內容，無法產生封面" };

    const parsed = parseCoverPrompt(extraPrompt);
    if (!parsed.ok) return parsed;
    const safe = parseCoverSafeAreas(safeAreas);
    if (!safe.ok) return safe;

    const now = new Date();
    id = video._id;
    coverStartedAt = now;
    const unset: Record<string, ""> = {};
    if (!parsed.prompt) unset.coverPrompt = "";
    if (safe.areas.length === 0) unset.coverSafeAreas = "";
    const claimed = await videos.updateOne(coverClaimFilter({ videoId: video._id, clerkUserId: user.clerkUserId, now }), {
      $set: {
        coverStatus: "generating",
        coverStartedAt: now,
        updatedAt: now,
        ...(parsed.prompt ? { coverPrompt: parsed.prompt } : {}),
        ...(safe.areas.length ? { coverSafeAreas: safe.areas } : {}),
      },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    });
    if (claimed.matchedCount !== 1) return { ok: false, error: "封面生成中" };

    try {
      await assertCanSpendCredits(user, FRAME_COST);
      spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);
    } catch (error) {
      await videos.updateOne(ownedCoverFilter(video._id, user.clerkUserId, now), {
        $set: { coverStatus: "idle", updatedAt: new Date() },
      });
      return fail(error, "封面生成失敗");
    }

    const charged = await videos.updateOne(ownedCoverFilter(video._id, user.clerkUserId, now), {
      $set: { coverCreditsCharged: true, updatedAt: new Date() },
    });
    if (charged.matchedCount !== 1) return { ok: false, error: "封面生成中" };

    let jobId: ObjectId;
    try {
      const sceneText = resolveSceneText(video);
      jobId = await insertPendingJob({
        kind: "reelCover",
        projectId: video._id,
        clipIndex: 0,
        model: IMAGE_ROUTE_BY_SCENE_TEXT[sceneText.language].model,
      });
    } catch (error) {
      await videos.updateOne(ownedCoverFilter(video._id, user.clerkUserId, now), {
        $set: { coverStatus: "idle", coverCreditsCharged: false, updatedAt: new Date() },
      });
      if (spendKey) await refundCredits(user.clerkUserId, FRAME_COST, spendKey);
      return fail(error, "封面排隊失敗");
    }
    jobQueued = true;
    kickJob(jobId);

    const updated = await videos.findOne({ _id: video._id });
    return updated ? { ok: true, project: toPublicVideo(updated) } : { ok: false, error: "找不到影片" };
  } catch (error) {
    if (spendKey && !jobQueued && id && coverStartedAt) {
      try {
        await claimCoverRefund(id, ownerClerkUserId, coverStartedAt);
      } catch (refundError) {
        return fail(refundError, "封面排隊失敗");
      }
    }
    return fail(error, "封面生成失敗");
  }
}

export async function sendReelCover(project: Project) {
  const style = await loadRenderableStyle({
    styleId: project.styleId,
    ownerClerkUserId: project.clerkUserId,
  });
  const sceneText = resolveSceneText(project);
  const startFrame = project.frames?.find((frame) => frame.position === "start" && (frame.blobUrl || frame.outputUrl));
  const stillUrl = startFrame ? mediaSrc(startFrame) : "";
  const characterUrls = frameLockReferenceUrls(project);
  const logoUrls = logoReferenceUrls(project);
    const model = IMAGE_ROUTE_BY_SCENE_TEXT[sceneText.language].model;
    const submitted = await submitImage({
      model,
      prompt: joinCoverSubmission([
        ...styleLinesForFrame(style),
        project.textStyleImageUrl
          ? textStyleSampleHint()
          : subtitleLookLine(resolveSubtitleLook(project.subtitleLook)),
        "Lettering follows that Look. Do not copy typography from the visual style.",
        reelCoverPrompt(project),
        coverReferenceNote({
          still: stillUrl ? 1 : 0,
          character: characterUrls.length,
          logo: logoUrls.length,
        }),
      ]),
    aspectRatio: project.aspectRatio,
    quality: "medium",
    resolution: "1k",
    sceneTextLanguage: sceneText.language,
    referenceImageUrls: [stillUrl, ...characterUrls, ...logoUrls],
  });
  return toSent(model, submitted);
}

function isCurrentCover(doc: { coverStartedAt?: Date }, job: GenerationJob) {
  if (!doc.coverStartedAt) return true;
  return doc.coverStartedAt.getTime() <= job.createdAt.getTime();
}

// Write the finished still onto the video, or refund this attempt once.
export async function syncReelCoverJob(job: GenerationJob, status: GenerationStatus, outputUrl?: string) {
  if (!job.projectId) return;
  const videos = await videosCollection();
  const doc = await videos.findOne({ _id: job.projectId });
  if (!doc?.coverStartedAt || !isCurrentCover(doc, job)) return;
  const startedAt = doc.coverStartedAt;

  if (status === "completed" && outputUrl) {
    const stored = await persistMedia(
      outputUrl,
      `explainer/reel-covers/${doc._id.toHexString()}/${job._id.toHexString()}`,
    );
    await videos.updateOne(ownedCoverFilter(doc._id, doc.clerkUserId, startedAt), {
      $set: {
        coverUrl: stored,
        coverStatus: "idle",
        coverCreditsCharged: false,
        updatedAt: new Date(),
      },
      $unset: { coverInset: "" as const },
    });
    return;
  }

  if (status === "failed" || status === "nsfw") {
    await claimCoverRefund(doc._id, doc.clerkUserId, startedAt);
  }
}
