import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import {
  jutsuJobsCollection,
  teleportJobsCollection,
  videosCollection,
} from "@/dao";
import type { JutsuJob, JutsuSourceMediaKind } from "@/model/jutsu-job";
import type {
  AspectRatio,
  ClipFrame,
  Project,
  ProjectClip,
  ProjectStatus,
} from "@/model/project";
import type { TeleportJob } from "@/model/teleport-job";
import { requireAppUser } from "@/service/auth";
import { folderVideoPath } from "@/service/folder-video-path";

export const SCRO_SWAP_STANDALONE_SKILL_SLUG = "scro-swap-director";
export const TELEPORT_STANDALONE_SKILL_SLUG = "teleport-director";

export function isStandaloneEngineSkillSlug(
  skillSlug?: string | null,
): boolean {
  return (
    skillSlug === SCRO_SWAP_STANDALONE_SKILL_SLUG ||
    skillSlug === TELEPORT_STANDALONE_SKILL_SLUG
  );
}

export type BuildStandaloneEngineProjectInput = {
  userId: ObjectId;
  clerkUserId: string;
  kind: "scroswap" | "teleport";
  title: string;
  sourceVideoUrl: string;
  aspectRatio: AspectRatio;
  durationSeconds: number;
  posterUrl?: string;
  outputVideoUrl?: string;
  status?: "rendering" | "completed" | "failed";
  error?: string;
  now?: Date;
};

/** Pure builder: construct a single-clip `Project` document for standalone Scro Swap / Teleport jobs. */
export function buildStandaloneEngineProjectDoc(
  input: BuildStandaloneEngineProjectInput,
): Project {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const skillSlug =
    input.kind === "scroswap"
      ? SCRO_SWAP_STANDALONE_SKILL_SLUG
      : TELEPORT_STANDALONE_SKILL_SLUG;
  const defaultTitle = input.kind === "scroswap" ? "Scro Swap" : "Teleport";
  const cleanTitle = input.title.trim() || defaultTitle;
  const durationSeconds = Math.max(
    1,
    Math.round(Number(input.durationSeconds) || 6),
  );
  const cleanPosterUrl = input.posterUrl?.trim() || undefined;
  const cleanOutputVideoUrl = input.outputVideoUrl?.trim() || undefined;

  const isCompleted =
    input.status === "completed" && Boolean(cleanOutputVideoUrl);
  const isFailed = input.status === "failed";
  const projectStatus: ProjectStatus = isCompleted ? "ready" : "production";
  const clipStatus: ProjectClip["status"] = isCompleted
    ? "completed"
    : isFailed
      ? "failed"
      : "in_progress";

  const frames: ClipFrame[] = cleanPosterUrl
    ? [
        {
          clipNumber: 1,
          position: "start",
          prompt: cleanTitle,
          status: "completed",
          outputUrl: cleanPosterUrl,
          blobUrl: cleanPosterUrl,
          submittedAt: nowIso,
        },
      ]
    : [];

  const clips: ProjectClip[] = [
    {
      clipNumber: 1,
      durationSeconds,
      prompt: cleanTitle,
      status: clipStatus,
      ...(cleanOutputVideoUrl
        ? { outputUrl: cleanOutputVideoUrl, blobUrl: cleanOutputVideoUrl }
        : {}),
      ...(isFailed ? { error: input.error || "影片渲染失敗" } : {}),
      submittedAt: nowIso,
      unsent: false,
    },
  ];

  const timeRange = `0:00–0:${String(durationSeconds).padStart(2, "0")}`;

  return {
    _id: new ObjectId(),
    userId: input.userId,
    clerkUserId: input.clerkUserId,
    skillId: new ObjectId(),
    skillSlug,
    source: cleanTitle,
    aspectRatio: input.aspectRatio,
    durationPreset: "short",
    styleId: "realistic",
    language: "en",
    narrationEnabled: false,
    sceneTextEnabled: false,
    sceneTextLanguage: "none",
    status: projectStatus,
    phaseA: {
      englishTitle: cleanTitle,
      localizedTitle: cleanTitle,
      targetDuration: `${durationSeconds}s`,
      clipCount: 1,
      loopMode: "linear",
      coreMessage: cleanTitle,
      hookStrategy: cleanTitle,
      aspectRatio: input.aspectRatio,
      visualWorld: defaultTitle,
      narrator: "",
      englishWordCount: 0,
      characterLock: "",
      palette: "",
      bgmDirection: "",
      narrativeArc: cleanTitle,
      clips: [
        {
          clipNumber: 1,
          timeRange,
          durationSeconds,
          narrativeJob: "Hook",
          explainerScene: cleanTitle,
          motionCamera: "Continuous natural motion from source video.",
          englishVo: "(no dialogue)",
          bgmSfx: "Original source audio",
        },
      ],
    },
    frames,
    clips,
    ...(isCompleted && cleanOutputVideoUrl
      ? { reelUrl: cleanOutputVideoUrl, reelStatus: "completed" as const }
      : {}),
    ...(isFailed && input.error ? { error: input.error } : {}),
    creditsCharged: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Insert a standalone single-clip `Project` for a Scro Swap or Teleport job and return its `_id`. */
export async function createStandaloneEngineProject(
  input: BuildStandaloneEngineProjectInput,
): Promise<ObjectId> {
  const doc = buildStandaloneEngineProjectDoc(input);
  const videos = await videosCollection();
  await videos.insertOne(doc);
  return doc._id;
}

/** Pure helper: apply prepared keyframe poster, aspect ratio, and duration to a target `Project`. */
export function applyStandaloneEngineFrameToProject(
  project: Project,
  input: {
    clipNumber?: number;
    aspectRatio?: AspectRatio;
    durationSeconds?: number;
    posterUrl?: string;
    now?: Date;
  },
): Pick<Project, "aspectRatio" | "phaseA" | "frames" | "clips" | "updatedAt"> {
  const now = input.now ?? new Date();
  const clipNumber = input.clipNumber ?? 1;
  const isStandalone = isStandaloneEngineSkillSlug(project.skillSlug);
  const nextAspectRatio: AspectRatio =
    isStandalone && input.aspectRatio ? input.aspectRatio : project.aspectRatio;
  const safeDuration =
    input.durationSeconds &&
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds > 0
      ? Math.max(1, Math.round(input.durationSeconds))
      : undefined;
  const cleanPosterUrl = input.posterUrl?.trim() || undefined;

  const targetClip = (project.clips || []).find(
    (clip) => clip.clipNumber === clipNumber,
  );
  const existingFrames = project.frames || [];
  let nextFrames = existingFrames;

  if (cleanPosterUrl) {
    const hasStart = existingFrames.some(
      (frame) => frame.clipNumber === clipNumber && frame.position === "start",
    );
    if (hasStart) {
      nextFrames = existingFrames.map((frame) =>
        frame.clipNumber === clipNumber && frame.position === "start"
          ? {
              ...frame,
              status: "completed" as const,
              outputUrl: cleanPosterUrl,
              blobUrl: cleanPosterUrl,
              error: undefined,
            }
          : frame,
      );
    } else {
      nextFrames = [
        ...existingFrames,
        {
          clipNumber,
          position: "start" as const,
          prompt: project.source || "Scene frame",
          status: "completed" as const,
          outputUrl: cleanPosterUrl,
          blobUrl: cleanPosterUrl,
          submittedAt: targetClip?.submittedAt ?? now.toISOString(),
        },
      ];
    }
  }

  const nextPhaseA =
    isStandalone && project.phaseA
      ? {
          ...project.phaseA,
          aspectRatio: nextAspectRatio,
          ...(safeDuration ? { targetDuration: `${safeDuration}s` } : {}),
          clips: project.phaseA.clips.map((row) =>
            row.clipNumber === clipNumber && safeDuration
              ? {
                  ...row,
                  durationSeconds: safeDuration,
                  timeRange: `0:00–0:${String(safeDuration).padStart(2, "0")}`,
                }
              : row,
          ),
        }
      : project.phaseA;

  const nextClips =
    isStandalone && safeDuration
      ? (project.clips || []).map((clip) =>
          clip.clipNumber === clipNumber
            ? { ...clip, durationSeconds: safeDuration }
            : clip,
        )
      : project.clips || [];

  return {
    aspectRatio: nextAspectRatio,
    phaseA: nextPhaseA,
    frames: nextFrames,
    clips: nextClips,
    updatedAt: now,
  };
}

/** Sync prepared keyframe poster, aspect ratio, and section duration onto the linked `Project`. */
export async function syncStandaloneEngineFrame(input: {
  targetVideoId?: ObjectId;
  targetClipNumber?: number;
  aspectRatio?: AspectRatio;
  durationSeconds?: number;
  posterUrl?: string;
}): Promise<void> {
  if (!input.targetVideoId) return;
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: input.targetVideoId });
  if (!project) return;

  const patch = applyStandaloneEngineFrameToProject(project, {
    clipNumber: input.targetClipNumber ?? 1,
    aspectRatio: input.aspectRatio,
    durationSeconds: input.durationSeconds,
    posterUrl: input.posterUrl,
  });

  await videos.updateOne(
    { _id: project._id },
    {
      $set: {
        aspectRatio: patch.aspectRatio,
        ...(patch.phaseA ? { phaseA: patch.phaseA } : {}),
        frames: patch.frames,
        clips: patch.clips,
        updatedAt: patch.updatedAt,
      },
    },
  );

  try {
    revalidatePath("/app/videos");
    revalidatePath(
      folderVideoPath(
        project.projectId?.toHexString(),
        project._id.toHexString(),
      ),
    );
  } catch {
    // Non-request background / cron context
  }
}

/** Delete the backing standalone `Project` when a standalone Scro Swap or Teleport job is deleted. */
export async function deleteStandaloneEngineProjectIfOwned(
  targetVideoId: ObjectId | undefined,
  clerkUserId: string,
): Promise<void> {
  if (!targetVideoId) return;
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: targetVideoId, clerkUserId });
  if (!project || !isStandaloneEngineSkillSlug(project.skillSlug)) return;
  await videos.deleteOne({ _id: project._id, clerkUserId });
}

function inferStandaloneMediaKind(
  url: string,
  explicitKind?: JutsuSourceMediaKind,
): JutsuSourceMediaKind {
  if (
    explicitKind === "video" ||
    explicitKind === "gif" ||
    explicitKind === "image"
  ) {
    return explicitKind;
  }
  const clean = (url || "").split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  if (clean.endsWith(".gif")) return "gif";
  if (
    clean.endsWith(".png") ||
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".webp")
  ) {
    return "image";
  }
  return "video";
}

export function buildJutsuStandaloneTitle(
  job: Pick<JutsuJob, "characterName" | "mode">,
): string {
  const name = job.characterName?.trim();
  return name ? `Scro Swap · ${name}` : "Scro Swap";
}

export function buildTeleportStandaloneTitle(
  job: Pick<TeleportJob, "scenePrompt">,
): string {
  const prompt = job.scenePrompt?.trim();
  return prompt ? `Teleport · ${prompt.slice(0, 48)}` : "Teleport";
}

/** Lazily provision or return the OpenCut `Project` ID for a Scro Swap job. */
export async function ensureJutsuJobOpenCutVideo(
  jobId: string,
): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(jobId)) {
      return { ok: false, error: "找不到 Scro Swap 任務" };
    }
    const col = await jutsuJobsCollection();
    const job = (await col.findOne({
      _id: new ObjectId(jobId),
      clerkUserId: user.clerkUserId,
    })) as (JutsuJob & { _id: ObjectId }) | null;
    if (!job) {
      return { ok: false, error: "找不到 Scro Swap 任務" };
    }

    const mediaKind = inferStandaloneMediaKind(
      job.sourceVideoUrl,
      job.sourceMediaKind,
    );
    if (mediaKind === "image") {
      return { ok: false, error: "靜態圖片無法在影片剪輯器開啟" };
    }

    const videos = await videosCollection();
    if (job.targetVideoId) {
      const existing = await videos.findOne({
        _id: job.targetVideoId,
        clerkUserId: user.clerkUserId,
      });
      if (existing) {
        return { ok: true, videoId: existing._id.toHexString() };
      }
    }

    const videoId = await createStandaloneEngineProject({
      userId: job.userId,
      clerkUserId: job.clerkUserId,
      kind: "scroswap",
      title: buildJutsuStandaloneTitle(job),
      sourceVideoUrl: job.sourceVideoUrl,
      aspectRatio: job.aspectRatio || "9:16",
      durationSeconds: job.sectionLength || 6,
      posterUrl:
        job.preparedStartFrameUrl ||
        job.rawStartFrameUrl ||
        job.referenceImageUrl,
      outputVideoUrl: job.outputVideoUrl,
      status:
        job.status === "completed"
          ? "completed"
          : job.status === "failed"
            ? "failed"
            : "rendering",
      error: job.error,
      now: job.createdAt,
    });

    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          targetVideoId: videoId,
          targetClipNumber: 1,
          updatedAt: new Date(),
        },
      },
    );

    return { ok: true, videoId: videoId.toHexString() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "無法開啟剪輯器",
    };
  }
}

/** Lazily provision or return the OpenCut `Project` ID for a Teleport job. */
export async function ensureTeleportJobOpenCutVideo(
  jobId: string,
): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(jobId)) {
      return { ok: false, error: "找不到 Teleport 任務" };
    }
    const col = await teleportJobsCollection();
    const job = (await col.findOne({
      _id: new ObjectId(jobId),
      clerkUserId: user.clerkUserId,
    })) as (TeleportJob & { _id: ObjectId }) | null;
    if (!job) {
      return { ok: false, error: "找不到 Teleport 任務" };
    }

    const videos = await videosCollection();
    if (job.targetVideoId) {
      const existing = await videos.findOne({
        _id: job.targetVideoId,
        clerkUserId: user.clerkUserId,
      });
      if (existing) {
        return { ok: true, videoId: existing._id.toHexString() };
      }
    }

    const videoId = await createStandaloneEngineProject({
      userId: job.userId,
      clerkUserId: job.clerkUserId,
      kind: "teleport",
      title: buildTeleportStandaloneTitle(job),
      sourceVideoUrl: job.sourceVideoUrl,
      aspectRatio: job.aspectRatio || "9:16",
      durationSeconds: job.sectionLength || 6,
      posterUrl:
        job.preparedStartFrameUrl || job.rawStartFrameUrl || job.sceneImageUrl,
      outputVideoUrl: job.outputVideoUrl,
      status:
        job.status === "completed"
          ? "completed"
          : job.status === "failed"
            ? "failed"
            : "rendering",
      error: job.error,
      now: job.createdAt,
    });

    await col.updateOne(
      { _id: job._id },
      {
        $set: {
          targetVideoId: videoId,
          targetClipNumber: 1,
          updatedAt: new Date(),
        },
      },
    );

    return { ok: true, videoId: videoId.toHexString() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "無法開啟剪輯器",
    };
  }
}
