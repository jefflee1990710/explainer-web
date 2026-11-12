import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { videosCollection } from "@/dao";
import type { ProjectClip, ReferenceImage, StoryboardRow, VideoQualityTier } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits } from "@/service/billing/credits";
import { insertClips } from "@/service/clip/clip-order";
import { queueAutoClipVideos } from "@/service/clip/auto-video";
import { FRAME_COST } from "@/service/credit-costs";
import { folderVideoPath } from "@/service/folder-video-path";
import { enqueueClipFrameJobs } from "@/service/higgsfield/pipeline";

export type AppendSimpleClipInput = {
  videoId: string;
  insertAt?: number;
  prompt: string;
  durationSeconds?: number;
  firstFrameUrl?: string;
  characterId?: string;
  referenceImageUrls?: string[];
  refVideoUrl?: string;
  refAudioUrl?: string;
  videoQualityTier?: VideoQualityTier;
};

export function buildSimpleClipDraftRow(input: {
  prompt: string;
  durationSeconds?: number;
  clipNumber: number;
  characterId?: string;
  refVideoUrl?: string;
  refAudioUrl?: string;
  referenceImageIds?: string[];
  videoQualityTier?: VideoQualityTier;
}): StoryboardRow {
  const cleanPrompt = String(input.prompt || "").trim();
  const durationSeconds = Math.max(
    5,
    Math.min(12, Math.round(Number(input.durationSeconds) || 6)),
  );
  return {
    clipNumber: input.clipNumber,
    timeRange: `0–${durationSeconds}s`,
    durationSeconds,
    narrativeJob: `Shot ${input.clipNumber}`,
    startScene: cleanPrompt,
    explainerScene: cleanPrompt,
    motionCamera: cleanPrompt,
    englishVo: "(no dialogue)",
    bgmSfx: "none",
    videoQualityTier: input.videoQualityTier || "economy",
    ...(input.characterId ? { characterIds: [input.characterId] } : {}),
    ...(input.referenceImageIds?.length
      ? { referenceImageIds: input.referenceImageIds }
      : {}),
    ...(input.refVideoUrl ? { referenceVideoUrl: input.refVideoUrl } : {}),
    ...(input.refAudioUrl ? { referenceAudioUrl: input.refAudioUrl } : {}),
  };
}

export async function appendSimpleClipAction(
  input: AppendSimpleClipInput,
): Promise<{ ok: true; project: PublicVideo } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    const cleanPrompt = String(input.prompt || "").trim();
    if (!cleanPrompt) {
      return { ok: false, error: "請輸入影片動作或畫面描述（Prompt）" };
    }
    if (!ObjectId.isValid(input.videoId)) {
      return { ok: false, error: "專案不存在" };
    }

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(input.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) {
      return { ok: false, error: "專案不存在" };
    }

    const existingClips = project.phaseA.clips ?? [];
    const totalExisting = existingClips.length;
    const requestedInsertAt = Number(input.insertAt);
    const insertAt =
      Number.isFinite(requestedInsertAt) && requestedInsertAt >= 1 && requestedInsertAt <= totalExisting + 1
        ? Math.round(requestedInsertAt)
        : totalExisting + 1;

    const durationSeconds = Math.max(
      5,
      Math.min(12, Math.round(Number(input.durationSeconds) || 6)),
    );
    const videoCost = durationSeconds * 2;
    const firstFrameUrl = input.firstFrameUrl?.trim();
    const hasFirstFrame = Boolean(firstFrameUrl && firstFrameUrl.startsWith("https://"));
    const initialCost = hasFirstFrame ? 0 : FRAME_COST;

    try {
      await assertCanSpendCredits(user, initialCost + videoCost);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "點數不足，無法新增分鏡" };
    }

    const refImages: ReferenceImage[] = (input.referenceImageUrls || [])
      .map((u) => u.trim())
      .filter((u) => u.startsWith("https://"))
      .slice(0, 4)
      .map((url, idx) => ({
        id: `R${idx + 1}`,
        url,
        description: "Scene or character reference",
      }));

    const newRow = buildSimpleClipDraftRow({
      prompt: cleanPrompt,
      durationSeconds,
      clipNumber: insertAt,
      characterId: input.characterId,
      referenceImageIds: refImages.map((r) => r.id),
      refVideoUrl: input.refVideoUrl,
      refAudioUrl: input.refAudioUrl,
      videoQualityTier: input.videoQualityTier,
    });

    const now = new Date();
    const nowIso = now.toISOString();

    const newFrame = hasFirstFrame
      ? {
          clipNumber: insertAt,
          position: "start" as const,
          url: firstFrameUrl!,
          blobUrl: firstFrameUrl!,
          prompt: cleanPrompt,
          status: "completed" as const,
          createdAt: nowIso,
          updatedAt: nowIso,
        }
      : {
          clipNumber: insertAt,
          position: "start" as const,
          prompt: cleanPrompt,
          status: "queued" as const,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

    const newClip: ProjectClip = {
      clipNumber: insertAt,
      durationSeconds,
      prompt: cleanPrompt,
      status: "queued" as const,
      submittedAt: nowIso,
      ...(input.refVideoUrl ? { referenceVideoUrl: input.refVideoUrl } : {}),
      ...(input.refAudioUrl ? { referenceAudioUrl: input.refAudioUrl } : {}),
    };

    // Use pure insertClips to shift existing clips and frames
    const shifted = insertClips(
      {
        phaseA: project.phaseA,
        clips: project.clips || [],
        frames: project.frames || [],
        subtitlePlates: project.subtitlePlates,
        sceneChats: project.sceneChats,
        backgroundPlates: project.backgroundPlates,
        phaseB: project.phaseB,
        autoVideoClips: project.autoVideoClips,
        edit: project.edit,
      },
      [newRow],
      insertAt,
    );
    if (!shifted.ok) {
      return { ok: false, error: shifted.error };
    }

    // Place new frame and new clip at insertAt
    const updatedFrames = [
      ...(shifted.project.frames || []).filter((f) => f.clipNumber !== insertAt),
      newFrame,
    ].sort((a, b) => a.clipNumber - b.clipNumber);

    const updatedClips = [
      ...(shifted.project.clips || []).filter((c) => c.clipNumber !== insertAt),
      newClip,
    ].sort((a, b) => a.clipNumber - b.clipNumber);

    const updatedAutoVideoClips = Array.from(
      new Set([...(shifted.project.autoVideoClips || []), insertAt]),
    );

    if (initialCost > 0) {
      await consumeCredits(user.clerkUserId, initialCost);
    }

    const mergedRefImages = [
      ...(project.referenceImages || []).filter((img) => !refImages.some((r) => r.url === img.url)),
      ...refImages,
    ];

    await videos.updateOne(
      { _id: project._id },
      {
        $set: {
          phaseA: shifted.project.phaseA,
          clips: updatedClips,
          frames: updatedFrames,
          autoVideoClips: updatedAutoVideoClips,
          referenceImages: mergedRefImages,
          updatedAt: now,
        },
      },
    );

    const updatedProject = await videos.findOne({ _id: project._id });
    if (!updatedProject) {
      return { ok: false, error: "更新專案失敗" };
    }

    try {
      revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
    } catch {
      // Non-request context
    }

    // Trigger frame job if queued, or auto-video if frame is already present
    after(async () => {
      try {
        if (newFrame.status === "queued") {
          await enqueueClipFrameJobs(updatedProject, [insertAt]);
        } else {
          await queueAutoClipVideos(project._id);
        }
      } catch (err) {
        console.error("[appendSimpleClipAction] queue error", err);
      }
    });

    return { ok: true, project: toPublicVideo(updatedProject) };
  } catch (err) {
    console.error("[appendSimpleClipAction] error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "新增簡易影片片段失敗",
    };
  }
}
