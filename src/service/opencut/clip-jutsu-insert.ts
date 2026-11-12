import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { ClipFrame, Project, ProjectClip, StoryboardRow } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { insertClips, type ClipOrderProject } from "@/service/clip/clip-order";
import { folderVideoPath } from "@/service/folder-video-path";
import { startScroSwapJob } from "@/service/jutsu/pipeline";
import { startTeleportJob } from "@/service/teleport/pipeline";
import { resolveClipJutsuSectionLength } from "@/service/opencut/clip-jutsu";
import { mediaSrc } from "@/util/media-src";

export type ExtendableProject = Omit<ClipOrderProject, "clips" | "frames"> & {
  clips: ProjectClip[];
  frames?: ClipFrame[];
};

export type BuildJutsuClipInsertionInput<T extends ExtendableProject> = {
  project: T;
  sourceClipNumber?: number;
  sourceVideoUrl?: string;
  insertAt: number;
  mode: "swap" | "teleport";
  nowIso: string;
};

export function buildJutsuClipInsertion<T extends ExtendableProject>(
  input: BuildJutsuClipInsertionInput<T>,
):
  | {
      ok: true;
      project: T;
      newClipNumber: number;
    }
  | { ok: false; error: string } {
  const phaseAClips = input.project.phaseA?.clips ?? [];
  const totalClips = phaseAClips.length;
  if (!input.project.phaseA) {
    return { ok: false, error: "專案不存在" };
  }

  const requestedInsertAt = Number(input.insertAt);
  const insertAt =
    Number.isFinite(requestedInsertAt) && requestedInsertAt >= 1 && requestedInsertAt <= totalClips + 1
      ? Math.round(requestedInsertAt)
      : totalClips + 1;

  const sourceRow = input.sourceClipNumber
    ? phaseAClips.find((c) => c.clipNumber === input.sourceClipNumber)
    : undefined;

  const durationSeconds = resolveClipJutsuSectionLength(
    sourceRow?.durationSeconds,
    6,
  );

  const label = input.mode === "swap" ? "Scro Swap" : "Teleport";
  const newRow: StoryboardRow = {
    clipNumber: insertAt,
    timeRange: `0–${durationSeconds}s`,
    durationSeconds,
    narrativeJob: sourceRow?.narrativeJob ? `${sourceRow.narrativeJob} (${label})` : label,
    startScene: sourceRow?.startScene || `Scene (${label})`,
    explainerScene: sourceRow?.explainerScene || `Scene (${label})`,
    motionCamera: sourceRow?.motionCamera || `Motion (${label})`,
    englishVo: sourceRow?.englishVo || "(no dialogue)",
    bgmSfx: sourceRow?.bgmSfx || "none",
    videoQualityTier: sourceRow?.videoQualityTier || "economy",
  };

  const newClip: ProjectClip = {
    clipNumber: insertAt,
    durationSeconds,
    prompt: newRow.explainerScene,
    status: "in_progress",
    submittedAt: input.nowIso,
  };

    const shifted = insertClips(
      {
        phaseA: input.project.phaseA,
        clips: input.project.clips || [],
        frames: input.project.frames || [],
        subtitlePlates: input.project.subtitlePlates,
        sceneChats: input.project.sceneChats,
        backgroundPlates: input.project.backgroundPlates,
        phaseB: input.project.phaseB,
        autoVideoClips: input.project.autoVideoClips,
        edit: input.project.edit,
      },
      [newRow],
      insertAt,
    );
    if (!shifted.ok) return shifted;

    const updatedClips = [
      ...(shifted.project.clips || []).filter((c) => c.clipNumber !== insertAt),
      newClip,
    ].sort((a, b) => a.clipNumber - b.clipNumber);

    return {
      ok: true,
      project: {
        ...input.project,
        phaseA: shifted.project.phaseA,
        clips: updatedClips,
        frames: shifted.project.frames,
      },
      newClipNumber: insertAt,
    };
  }


export type ApplyClipSwapInsertInput = {
  videoId: string;
  sourceClipNumber?: number;
  sourceVideoUrl?: string;
  insertAt?: number;
  characterId?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
};

export async function applyClipScroSwapInsertAction(
  input: ApplyClipSwapInsertInput,
): Promise<{ ok: true; project: PublicVideo; jobId: string } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(input.videoId)) return { ok: false, error: "專案不存在" };

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(input.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };

    let sourceVideoUrl = input.sourceVideoUrl?.trim() || "";
    let sectionLength = 6;

    if (input.sourceClipNumber) {
      const sourceClip = (project.clips || []).find(
        (c) => c.clipNumber === input.sourceClipNumber,
      );
      if (sourceClip && sourceClip.status === "completed") {
        sourceVideoUrl = mediaSrc(sourceClip) || "";
        sectionLength = resolveClipJutsuSectionLength(sourceClip.durationSeconds, 6);
      }
    }

    if (!sourceVideoUrl.startsWith("https://")) {
      return { ok: false, error: "請提供有效的來源影片或選取已完成的分鏡" };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const totalClips = project.phaseA.clips.length;
    const insertAt = input.insertAt && input.insertAt >= 1 && input.insertAt <= totalClips + 1
      ? Math.round(input.insertAt)
      : totalClips + 1;

    const inserted = buildJutsuClipInsertion({
      project,
      sourceClipNumber: input.sourceClipNumber,
      sourceVideoUrl,
      insertAt,
      mode: "swap",
      nowIso,
    });
    if (!inserted.ok) return inserted;

    await videos.updateOne(
      { _id: project._id },
      {
        $set: {
          phaseA: inserted.project.phaseA,
          clips: inserted.project.clips,
          frames: inserted.project.frames,
          updatedAt: now,
        },
      },
    );

    const started = await startScroSwapJob({
      sourceVideoUrl,
      sectionStart: 0,
      sectionLength,
      characterId: input.characterId,
      referenceImageUrl: input.referenceImageUrl,
      referenceImageUrls: input.referenceImageUrls,
      keepSourceAudio: true,
      applyColorFix: true,
      targetVideoId: project._id.toHexString(),
      targetClipNumber: inserted.newClipNumber,
      previousClipVideoUrl: sourceVideoUrl,
    });

    if (!started.ok) return started;

    const updated = await videos.findOne({ _id: project._id });
    try {
      revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
    } catch {
      // Non-request context
    }

    return {
      ok: true,
      project: toPublicVideo(updated || project),
      jobId: started.job.id,
    };
  } catch (err) {
    console.error("[applyClipScroSwapInsertAction] error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "新增 Scro Swap 片段失敗",
    };
  }
}

export type ApplyClipTeleportInsertInput = {
  videoId: string;
  sourceClipNumber?: number;
  sourceVideoUrl?: string;
  insertAt?: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
};

export async function applyClipTeleportInsertAction(
  input: ApplyClipTeleportInsertInput,
): Promise<{ ok: true; project: PublicVideo; jobId: string } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(input.videoId)) return { ok: false, error: "專案不存在" };

    const videos = await videosCollection();
    const project = await videos.findOne({
      _id: new ObjectId(input.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!project?.phaseA) return { ok: false, error: "專案不存在" };

    let sourceVideoUrl = input.sourceVideoUrl?.trim() || "";
    let sectionLength = 6;

    if (input.sourceClipNumber) {
      const sourceClip = (project.clips || []).find(
        (c) => c.clipNumber === input.sourceClipNumber,
      );
      if (sourceClip && sourceClip.status === "completed") {
        sourceVideoUrl = mediaSrc(sourceClip) || "";
        sectionLength = resolveClipJutsuSectionLength(sourceClip.durationSeconds, 6);
      }
    }

    if (!sourceVideoUrl.startsWith("https://")) {
      return { ok: false, error: "請提供有效的來源影片或選取已完成的分鏡" };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const totalClips = project.phaseA.clips.length;
    const insertAt = input.insertAt && input.insertAt >= 1 && input.insertAt <= totalClips + 1
      ? Math.round(input.insertAt)
      : totalClips + 1;

    const inserted = buildJutsuClipInsertion({
      project,
      sourceClipNumber: input.sourceClipNumber,
      sourceVideoUrl,
      insertAt,
      mode: "teleport",
      nowIso,
    });
    if (!inserted.ok) return inserted;

    await videos.updateOne(
      { _id: project._id },
      {
        $set: {
          phaseA: inserted.project.phaseA,
          clips: inserted.project.clips,
          frames: inserted.project.frames,
          updatedAt: now,
        },
      },
    );

    const started = await startTeleportJob({
      sourceVideoUrl,
      aspectRatio: project.aspectRatio,
      sectionStart: 0,
      sectionLength,
      sceneImageUrl: input.sceneImageUrl,
      scenePrompt: input.scenePrompt,
      keepSourceAudio: true,
      applyColorFix: true,
      targetVideoId: project._id.toHexString(),
      targetClipNumber: inserted.newClipNumber,
      previousClipVideoUrl: sourceVideoUrl,
    });

    if (!started.ok) return started;

    const updated = await videos.findOne({ _id: project._id });
    try {
      revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
    } catch {
      // Non-request context
    }

    return {
      ok: true,
      project: toPublicVideo(updated || project),
      jobId: started.job.id,
    };
  } catch (err) {
    console.error("[applyClipTeleportInsertAction] error", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "新增 Teleport 片段失敗",
    };
  }
}
