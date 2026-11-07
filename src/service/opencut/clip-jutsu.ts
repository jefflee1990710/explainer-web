import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { ClipFrame, Project, ProjectClip, StoryboardRow } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { markUnsentClipVideos } from "@/service/clip/cancel-pending-video";
import { insertClips, type ClipOrderProject } from "@/service/clip/clip-order";
import { EXTEND_CLIP_DURATION_SECONDS, startExtendJob } from "@/service/extend/pipeline";
import { folderVideoPath } from "@/service/folder-video-path";
import { startScroSwapJob } from "@/service/jutsu/pipeline";
import { startTeleportJob } from "@/service/teleport/pipeline";
import { mediaSrc } from "@/util/media-src";

export type ApplyClipEngineResult =
  | { ok: true; project: PublicVideo; jobId: string; newClipNumber?: number }
  | { ok: false; error: string };

/** Clamp storyboard clip duration to the 2..15s range supported by Scro Swap and Teleport. */
export function resolveClipJutsuSectionLength(
  rowSeconds?: number,
  clipSeconds?: number,
): number {
  const raw = Number(rowSeconds) || Number(clipSeconds) || 6;
  return Math.min(15, Math.max(2, Math.round(raw)));
}

/**
 * Flip the target clip to `in_progress` with a fresh `submittedAt` timestamp.
 * Using `in_progress` (not `queued`) prevents `orphanQueuedClips` from failing it,
 * and the fresh `submittedAt` prevents `reconcileClips` from applying older video jobs.
 */
export function markClipInProgressForEngine(
  clips: ProjectClip[],
  clipNumber: number,
  nowIso: string,
): ProjectClip[] {
  return clips.map((clip) =>
    clip.clipNumber === clipNumber
      ? {
          ...clip,
          status: "in_progress" as const,
          submittedAt: nowIso,
          error: undefined,
          unsent: false,
        }
      : clip,
  );
}

async function loadReadyClip(
  videoId: string,
  clipNumber: number,
  clerkUserId: string,
): Promise<
  | {
      ok: true;
      project: Project;
      sourceVideoUrl: string;
      sectionLength: number;
    }
  | { ok: false; error: string }
> {
  if (!ObjectId.isValid(videoId)) return { ok: false, error: "專案不存在" };
  const videos = await videosCollection();
  const project = await videos.findOne({ _id: new ObjectId(videoId), clerkUserId });
  if (!project?.phaseA) return { ok: false, error: "專案不存在" };

  const row = project.phaseA.clips.find((item) => item.clipNumber === clipNumber);
  if (!row) return { ok: false, error: "找不到這段分鏡" };

  const clip = (project.clips || []).find((item) => item.clipNumber === clipNumber);
  if (!clip) return { ok: false, error: "這段分鏡尚未產生影片" };
  if (clip.status === "queued" || clip.status === "in_progress") {
    return { ok: false, error: "這一段影片正在產生中，請稍候" };
  }
  const sourceVideoUrl = mediaSrc(clip)?.trim() || "";
  if (clip.status !== "completed" || !sourceVideoUrl.startsWith("https://")) {
    return { ok: false, error: "這段分鏡尚未產生完成的影片" };
  }

  return {
    ok: true,
    project,
    sourceVideoUrl,
    sectionLength: resolveClipJutsuSectionLength(row.durationSeconds, clip.durationSeconds),
  };
}

async function persistClipInProgress(
  project: Project,
  clipNumber: number,
): Promise<PublicVideo> {
  const videos = await videosCollection();
  const now = new Date();
  const nextClips = markClipInProgressForEngine(
    project.clips || [],
    clipNumber,
    now.toISOString(),
  );
  await videos.updateOne(
    { _id: project._id },
    { $set: { clips: nextClips, status: "production", updatedAt: now } },
  );
  const updated = (await videos.findOne({ _id: project._id })) ?? {
    ...project,
    clips: nextClips,
    status: "production" as const,
    updatedAt: now,
  };
  try {
    revalidatePath(folderVideoPath(project.projectId?.toHexString(), project._id.toHexString()));
  } catch {
    // Non-request context
  }
  return toPublicVideo(await markUnsentClipVideos(updated));
}

/** Start a Scro Swap job locked to one completed OpenEdit storyboard clip. */
export async function applyClipScroSwap(input: {
  videoId: string;
  clipNumber: number;
  characterId?: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const started = await startScroSwapJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    sectionStart: 0,
    sectionLength: loaded.sectionLength,
    characterId: input.characterId,
    referenceImageUrl: input.referenceImageUrl,
    referenceImageUrls: input.referenceImageUrls,
    keepSourceAudio: true,
    applyColorFix: true,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: input.clipNumber,
    previousClipVideoUrl: loaded.sourceVideoUrl,
  });
  if (!started.ok) return started;

  const project = await persistClipInProgress(loaded.project, input.clipNumber);
  return { ok: true, project, jobId: started.job.id };
}

/** Start a Teleport job locked to one completed OpenEdit storyboard clip. */
export async function applyClipTeleport(input: {
  videoId: string;
  clipNumber: number;
  sceneImageUrl?: string;
  scenePrompt?: string;
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const started = await startTeleportJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    aspectRatio: loaded.project.aspectRatio,
    sectionStart: 0,
    sectionLength: loaded.sectionLength,
    sceneImageUrl: input.sceneImageUrl,
    scenePrompt: input.scenePrompt,
    keepSourceAudio: true,
    applyColorFix: true,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: input.clipNumber,
    previousClipVideoUrl: loaded.sourceVideoUrl,
  });
  if (!started.ok) return started;

  const project = await persistClipInProgress(loaded.project, input.clipNumber);
  return { ok: true, project, jobId: started.job.id };
}

/**
 * Resolve default Character, Scene, and Props/Product reference image URLs
 * for a given storyboard clip from its per-clip overrides and project-level locks.
 */
export function resolveClipExtendReferences(
  project: Pick<
    Project,
    | "phaseA"
    | "cast"
    | "characterStillUrl"
    | "characterImageUrl"
    | "backgroundPlates"
    | "backgroundImageUrls"
    | "referenceImages"
    | "products"
    | "objectSheetUrl"
  >,
  clipNumber: number,
): {
  characterImageUrls: string[];
  sceneImageUrl?: string;
  propImageUrls: string[];
} {
  const row = project.phaseA?.clips.find((c) => c.clipNumber === clipNumber);

  const castSource = row?.cast && row.cast.length > 0 ? row.cast : project.cast ?? [];
  const characterImageUrls: string[] = [];
  for (const member of castSource) {
    const url = member.imageUrl?.trim();
    if (url && url.startsWith("https://") && !characterImageUrls.includes(url)) {
      characterImageUrls.push(url);
      if (characterImageUrls.length >= 6) break;
    }
  }
  if (characterImageUrls.length === 0) {
    const fallbackChar = (project.characterStillUrl || project.characterImageUrl)?.trim();
    if (fallbackChar && fallbackChar.startsWith("https://")) {
      characterImageUrls.push(fallbackChar);
    }
  }

  let sceneImageUrl: string | undefined;
  if (row?.backgroundSetId) {
    const plateUrl = project.backgroundPlates
      ?.find((p) => p.setId === row.backgroundSetId)
      ?.url?.trim();
    if (plateUrl && plateUrl.startsWith("https://")) {
      sceneImageUrl = plateUrl;
    }
  }
  if (!sceneImageUrl) {
    const bgUrl = (row?.backgroundImageUrls?.[0] || project.backgroundImageUrls?.[0])?.trim();
    if (bgUrl && bgUrl.startsWith("https://")) {
      sceneImageUrl = bgUrl;
    }
  }
  if (!sceneImageUrl && row?.referenceImageIds?.length) {
    for (const refId of row.referenceImageIds) {
      const refUrl = project.referenceImages?.find((r) => r.id === refId)?.url?.trim();
      if (refUrl && refUrl.startsWith("https://")) {
        sceneImageUrl = refUrl;
        break;
      }
    }
  }

  const productSource =
    row?.products && row.products.length > 0 ? row.products : project.products ?? [];
  const propImageUrls: string[] = [];
  for (const prod of productSource) {
    const url = prod.imageUrl?.trim();
    if (url && url.startsWith("https://") && !propImageUrls.includes(url)) {
      propImageUrls.push(url);
      if (propImageUrls.length >= 4) break;
    }
  }
  const sheetUrl = project.objectSheetUrl?.trim();
  if (
    sheetUrl &&
    sheetUrl.startsWith("https://") &&
    !propImageUrls.includes(sheetUrl) &&
    propImageUrls.length < 4
  ) {
    propImageUrls.push(sheetUrl);
  }

  return {
    characterImageUrls,
    ...(sceneImageUrl ? { sceneImageUrl } : {}),
    propImageUrls,
  };
}

/**
 * Pure helper: insert a new extended `Clip N+1` right after `sourceClipNumber`,
 * seed its start frame from `Clip N`'s end/start frame, and mark `Clip N+1` `in_progress`.
 */
export function buildExtendedClipInsertion<
  T extends ClipOrderProject & {
    clips: ProjectClip[];
    frames?: ClipFrame[];
  },
>(input: {
  project: T;
  sourceClipNumber: number;
  extensionPrompt: string;
  nowIso: string;
}):
  | {
      ok: true;
      project: T;
      newClipNumber: number;
      posterUrl?: string;
    }
  | { ok: false; error: string } {
  const cleanPrompt = input.extensionPrompt.trim().slice(0, 1200);
  if (!cleanPrompt) {
    return { ok: false, error: "請輸入延展動作描述" };
  }
  const sourceRow = input.project.phaseA?.clips.find(
    (c) => c.clipNumber === input.sourceClipNumber,
  );
  if (!input.project.phaseA || !sourceRow) {
    return { ok: false, error: "找不到這段分鏡" };
  }

  const endFrame = input.project.frames?.find(
    (f) =>
      f.clipNumber === input.sourceClipNumber &&
      f.position === "end" &&
      f.status === "completed",
  );
  const startFrame = input.project.frames?.find(
    (f) =>
      f.clipNumber === input.sourceClipNumber &&
      f.position === "start" &&
      f.status === "completed",
  );
  const posterUrl = mediaSrc(endFrame) || mediaSrc(startFrame) || undefined;

  const newClipNumber = input.sourceClipNumber + 1;
  const newRow: StoryboardRow = {
    clipNumber: newClipNumber,
    timeRange: "0–6s",
    durationSeconds: EXTEND_CLIP_DURATION_SECONDS,
    narrativeJob: "Extend",
    explainerScene: cleanPrompt,
    motionCamera: cleanPrompt,
    englishVo: "(no dialogue)",
    bgmSfx: "Continue ambient soundscape",
    ...(sourceRow.styleId ? { styleId: sourceRow.styleId } : {}),
    ...(sourceRow.skillSlug ? { skillSlug: sourceRow.skillSlug } : {}),
    ...(sourceRow.cast ? { cast: sourceRow.cast } : {}),
    ...(sourceRow.products ? { products: sourceRow.products } : {}),
    ...(sourceRow.backgroundSetId ? { backgroundSetId: sourceRow.backgroundSetId } : {}),
    ...(sourceRow.referenceImageIds ? { referenceImageIds: sourceRow.referenceImageIds } : {}),
  };

  const inserted = insertClips(input.project, [newRow], newClipNumber);
  if (!inserted.ok) return inserted;

  const nextClips: ProjectClip[] = [
    ...inserted.project.clips,
    {
      clipNumber: newClipNumber,
      durationSeconds: EXTEND_CLIP_DURATION_SECONDS,
      prompt: cleanPrompt,
      status: "in_progress",
      submittedAt: input.nowIso,
      unsent: false,
    },
  ].sort((a, b) => a.clipNumber - b.clipNumber);

  const nextFrames: ClipFrame[] | undefined = posterUrl
    ? [
        ...(inserted.project.frames ?? []),
        {
          clipNumber: newClipNumber,
          position: "start" as const,
          prompt: cleanPrompt,
          status: "completed" as const,
          outputUrl: posterUrl,
          blobUrl: posterUrl,
          submittedAt: input.nowIso,
        },
      ].sort((a, b) => a.clipNumber - b.clipNumber)
    : inserted.project.frames;

  return {
    ok: true,
    project: {
      ...inserted.project,
      clips: nextClips,
      ...(nextFrames ? { frames: nextFrames } : {}),
    },
    newClipNumber,
    posterUrl,
  };
}

/** Insert a new `Clip N+1` after `clipNumber` and start a Vast H3 `ref2va` 39-frame latent extension job. */
export async function applyClipExtend(input: {
  videoId: string;
  clipNumber: number;
  prompt: string;
  characterImageUrls?: string[];
  sceneImageUrl?: string;
  propImageUrls?: string[];
}): Promise<ApplyClipEngineResult> {
  const user = await requireAppUser();
  const loaded = await loadReadyClip(input.videoId, input.clipNumber, user.clerkUserId);
  if (!loaded.ok) return loaded;

  const now = new Date();
  const inserted = buildExtendedClipInsertion({
    project: loaded.project,
    sourceClipNumber: input.clipNumber,
    extensionPrompt: input.prompt,
    nowIso: now.toISOString(),
  });
  if (!inserted.ok) return inserted;

  const defaults = resolveClipExtendReferences(loaded.project, input.clipNumber);
  const characterImageUrls =
    input.characterImageUrls !== undefined
      ? input.characterImageUrls
      : defaults.characterImageUrls;
  const sceneImageUrl =
    input.sceneImageUrl !== undefined ? input.sceneImageUrl : defaults.sceneImageUrl;
  const propImageUrls =
    input.propImageUrls !== undefined ? input.propImageUrls : defaults.propImageUrls;

  const started = await startExtendJob({
    sourceVideoUrl: loaded.sourceVideoUrl,
    sourceDurationSeconds: loaded.sectionLength,
    aspectRatio: loaded.project.aspectRatio,
    prompt: input.prompt,
    characterImageUrls,
    sceneImageUrl,
    propImageUrls,
    posterFrameUrl: inserted.posterUrl,
    targetVideoId: loaded.project._id.toHexString(),
    targetClipNumber: inserted.newClipNumber,
  });
  if (!started.ok) return started;

  const videos = await videosCollection();
  const nextDoc = inserted.project;
  await videos.updateOne(
    { _id: loaded.project._id },
    {
      $set: {
        phaseA: nextDoc.phaseA,
        clips: nextDoc.clips,
        ...(nextDoc.frames ? { frames: nextDoc.frames } : {}),
        ...(nextDoc.subtitlePlates ? { subtitlePlates: nextDoc.subtitlePlates } : {}),
        ...(nextDoc.sceneChats ? { sceneChats: nextDoc.sceneChats } : {}),
        ...(nextDoc.backgroundPlates ? { backgroundPlates: nextDoc.backgroundPlates } : {}),
        ...(nextDoc.phaseB ? { phaseB: nextDoc.phaseB } : {}),
        ...(nextDoc.autoVideoClips ? { autoVideoClips: nextDoc.autoVideoClips } : {}),
        ...(nextDoc.edit ? { edit: nextDoc.edit } : {}),
        status: "production",
        updatedAt: now,
      },
      $unset: {
        reelUrl: "",
        reelStatus: "",
        reelFingerprint: "",
        reelError: "",
        reelStep: "",
        reelAttempts: "",
      },
    },
  );

  const updated = (await videos.findOne({ _id: loaded.project._id })) ?? {
    ...nextDoc,
    status: "production" as const,
    updatedAt: now,
  };
  try {
    revalidatePath(
      folderVideoPath(loaded.project.projectId?.toHexString(), loaded.project._id.toHexString()),
    );
  } catch {
    // Non-request context
  }
  const project = toPublicVideo(await markUnsentClipVideos(updated));
  return {
    ok: true,
    project,
    jobId: started.job.id,
    newClipNumber: inserted.newClipNumber,
  };
}
