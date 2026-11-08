import type {
  JutsuMode,
  JutsuSourceMediaKind,
  PublicJutsuJob,
} from "@/model/jutsu-job";
import type { PublicTeleportJob } from "@/model/teleport-job";
import type { PublicVideoCard } from "@/presentation/serialize";
import {
  isStandaloneEngineSkillSlug,
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-slugs";
import { teleportTaskTitle } from "@/service/teleport/prompts";
import { computeCardPipelineProgress } from "@/service/video-progress-steps";
import {
  resolvedArchivedAt,
  VIDEO_LIST_FILTERS,
  videoListStage,
  type VideoListFilter,
} from "@/service/video/list-stage";
import type { TranslateFn } from "@/util/i18n";
import { durationPresetLabel, voLanguageLabel } from "@/util/i18n/picker-labels";

export type UnifiedVideoCategory = "all" | "studio" | "scroswap" | "teleport";

export type UnifiedVideoItem = {
  id: string;
  kind: "studio" | "scroswap" | "teleport";
  title: string;
  subtitle?: string;
  createdAt: string;
  aspectRatio: string;
  durationLabel: string;
  languageOrModeLabel: string;
  previewUrls: string[];
  outputVideoUrl?: string;
  outputImageUrl?: string;
  outputGifUrl?: string;
  sourceMediaKind?: "video" | "gif" | "image";
  stage: VideoListFilter;
  isBusy: boolean;
  progressText?: string | null;
  error?: string;
  editorVideoId?: string;
  folderId?: string;
  studioVideo?: PublicVideoCard;
  swapJob?: PublicJutsuJob;
  teleportJob?: PublicTeleportJob;
};

const MAX_PREVIEW_URLS = 4;

function uniquePreviewUrls(urls: Array<string | undefined | null>): string[] {
  const result: string[] = [];
  for (const raw of urls) {
    const clean = raw?.trim();
    if (!clean || result.includes(clean)) continue;
    result.push(clean);
    if (result.length >= MAX_PREVIEW_URLS) break;
  }
  return result;
}

function toTimestampMs(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isStandaloneBackingVideo(
  video: PublicVideoCard,
  job: { targetClipNumber?: number },
): boolean {
  if (isStandaloneEngineSkillSlug(video.skillSlug)) {
    return true;
  }
  if (
    !video.skillSlug &&
    (job.targetClipNumber ?? 1) === 1 &&
    video.videosTotal <= 1
  ) {
    return true;
  }
  return false;
}

function resolveSwapMediaKind(job: PublicJutsuJob): JutsuSourceMediaKind {
  if (
    job.sourceMediaKind === "image" ||
    job.sourceMediaKind === "gif" ||
    job.sourceMediaKind === "video"
  ) {
    return job.sourceMediaKind;
  }
  if (job.outputImageUrl) return "image";
  if (job.outputGifUrl) return "gif";
  return "video";
}

function swapModeLabel(mode: JutsuMode, isEn: boolean): string {
  switch (mode) {
    case "character_swap":
      return isEn ? "Character Swap" : "角色換角";
    case "montage_swap":
      return isEn ? "Montage Swap" : "Montage 轉場換角";
    case "object_swap":
      return isEn ? "Object Swap" : "物件替換";
    case "relight_video":
      return isEn ? "Relight" : "光影重塑";
    case "color_fix":
      return isEn ? "Color Fix" : "色彩校正";
  }
}

function resolveOverride<T>(
  map: Record<string, T> | undefined,
  primaryId: string,
  secondaryId?: string,
): { found: boolean; value: T | undefined } {
  if (!map) return { found: false, value: undefined };
  if (primaryId in map) return { found: true, value: map[primaryId] };
  if (secondaryId && secondaryId in map) {
    return { found: true, value: map[secondaryId] };
  }
  return { found: false, value: undefined };
}

function resolveEngineJobStage(input: {
  status: "prepared" | "rendering" | "completed" | "failed";
  postedAt?: string;
  archivedAt?: string;
}): VideoListFilter {
  if (input.archivedAt) return "archived";
  if (input.status === "completed") {
    return input.postedAt ? "posted" : "pending_post";
  }
  if (input.status === "failed") {
    return "pending_video";
  }
  return "videos";
}

function studioCardProgressText(
  video: PublicVideoCard,
  t: TranslateFn,
): string | null {
  if (video.status === "failed" && video.error) return video.error;
  const info = computeCardPipelineProgress(video);
  if (info.stageId === "storyboard") {
    return t("video.card.step1Detail");
  }
  if (info.stageId === "locks") {
    const done = info.propsDone + info.platesDone;
    const total = Math.max(1, info.propsTotal + info.platesTotal);
    return t("video.card.step2Detail", { done, total });
  }
  if (info.stageId === "frames") {
    if (info.busy) {
      return t("video.card.step3DetailBusy", {
        done: info.scenesDone,
        total: info.scenesTotal,
        busy: info.scenesBusy,
      });
    }
    return t("video.card.step3DetailIdle", {
      done: info.scenesDone,
      total: info.scenesTotal,
    });
  }
  if (info.stageId === "videos") {
    if (info.busy) {
      return t("video.card.step4DetailBusy", {
        done: info.videosDone,
        total: info.videosTotal,
        busy: info.videosBusy,
      });
    }
    return t("video.card.step4DetailIdle", {
      scenesTotal: info.scenesTotal,
      done: info.videosDone,
      total: info.videosTotal,
    });
  }
  if (info.videosTotal > 0) {
    return t("video.card.step5Detail", { total: info.videosTotal });
  }
  return null;
}

function buildSwapProgressText(job: PublicJutsuJob, isEn: boolean): string {
  const mediaKind = resolveSwapMediaKind(job);
  if (job.status === "failed") {
    return job.error || (isEn ? "Swap failed." : "Scro Swap 生成失敗");
  }
  if (job.status === "completed") {
    if (mediaKind === "image") {
      return isEn ? "Swapped 2K image ready" : "已完成 2K 角色換角圖片";
    }
    if (mediaKind === "gif" || job.outputGifUrl) {
      return isEn ? "Looping GIF & MP4 ready" : "已完成循環 GIF 與 MP4";
    }
    return isEn ? "Swapped MP4 ready" : "已完成角色動作遷移 MP4";
  }
  if (job.preparedStartFrameUrl) {
    return isEn
      ? "Keyframes & motion ready — rendering final video…"
      : "已完成角色畫格與動作追蹤，正在渲染最終影片…";
  }
  return isEn
    ? "Preparing character frame & tracking motion in background…"
    : "正在背景準備角色畫格與追蹤原片動作…";
}

function buildTeleportProgressText(
  job: PublicTeleportJob,
  isEn: boolean,
): string {
  if (job.status === "failed") {
    return job.error || (isEn ? "Teleport failed." : "Teleport 換場失敗");
  }
  if (job.status === "completed") {
    return isEn ? "Relocated MP4 ready" : "已完成換場 MP4";
  }
  if (job.preparedStartFrameUrl) {
    return isEn
      ? "Relocated keyframes ready — rendering final video…"
      : "已完成換場畫格，正在渲染最終影片…";
  }
  return isEn ? "Relocating scene in background…" : "正在背景執行換場…";
}

export function buildUnifiedVideoItems(input: {
  videos: PublicVideoCard[];
  swapJobs: PublicJutsuJob[];
  teleportJobs: PublicTeleportJob[];
  postedOverrides?: Record<string, string>;
  archivedOverrides?: Record<string, string | null>;
  isEn?: boolean;
  t: TranslateFn;
}): UnifiedVideoItem[] {
  const isEn = Boolean(input.isEn);
  const { t } = input;
  const videoById = new Map<string, PublicVideoCard>();
  for (const video of input.videos) {
    videoById.set(video.id, video);
  }

  const consumedStandaloneVideoIds = new Set<string>();
  const items: UnifiedVideoItem[] = [];

  for (const swapJob of input.swapJobs) {
    const candidateVideo = swapJob.targetVideoId
      ? videoById.get(swapJob.targetVideoId)
      : undefined;
    const backingVideo =
      candidateVideo && isStandaloneBackingVideo(candidateVideo, swapJob)
        ? candidateVideo
        : undefined;
    if (backingVideo) {
      consumedStandaloneVideoIds.add(backingVideo.id);
    }

    const mediaKind = resolveSwapMediaKind(swapJob);
    const postedOverride = resolveOverride(
      input.postedOverrides,
      swapJob.id,
      backingVideo?.id,
    );
    const archivedOverride = resolveOverride(
      input.archivedOverrides,
      swapJob.id,
      backingVideo?.id,
    );
    const postedAt = postedOverride.value || backingVideo?.postedAt;
    const archivedAt = resolvedArchivedAt(
      backingVideo?.archivedAt,
      archivedOverride.found ? archivedOverride.value : undefined,
    );

    const charName = swapJob.characterName?.trim();
    const objTarget = swapJob.objectTarget?.trim();
    const title = charName
      ? `Scro Swap · ${charName}`
      : objTarget
        ? `Scro Swap · ${objTarget}`
        : backingVideo?.title ||
          (isEn ? "Character Motion Swap" : "Scro Swap 角色動作遷移");
    const subtitle =
      swapJob.editPrompt?.trim() ||
      swapJob.customLightPrompt?.trim() ||
      swapJob.objectChangeTo?.trim() ||
      undefined;

    items.push({
      id: swapJob.id,
      kind: "scroswap",
      title,
      subtitle,
      createdAt: swapJob.createdAt,
      aspectRatio: swapJob.aspectRatio || backingVideo?.aspectRatio || "9:16",
      durationLabel:
        mediaKind === "image" ? "2K Image" : `${swapJob.sectionLength || 6}s`,
      languageOrModeLabel: swapModeLabel(swapJob.mode, isEn),
      previewUrls: uniquePreviewUrls([
        swapJob.outputImageUrl,
        swapJob.preparedStartFrameUrl,
        swapJob.rawStartFrameUrl,
        swapJob.referenceImageUrl,
        swapJob.preparedEndFrameUrl,
        swapJob.rawEndFrameUrl,
        ...(backingVideo?.previewUrls ?? []),
      ]),
      outputVideoUrl: swapJob.outputVideoUrl,
      outputImageUrl: swapJob.outputImageUrl,
      outputGifUrl: swapJob.outputGifUrl,
      sourceMediaKind: mediaKind,
      stage: resolveEngineJobStage({
        status: swapJob.status,
        postedAt,
        archivedAt,
      }),
      isBusy: swapJob.status === "rendering" || swapJob.status === "prepared",
      progressText: buildSwapProgressText(swapJob, isEn),
      error: swapJob.error || backingVideo?.error,
      editorVideoId:
        mediaKind === "image"
          ? undefined
          : (backingVideo?.id ?? swapJob.targetVideoId),
      folderId: backingVideo?.projectId || undefined,
      studioVideo: backingVideo,
      swapJob,
    });
  }

  for (const teleportJob of input.teleportJobs) {
    const candidateVideo = teleportJob.targetVideoId
      ? videoById.get(teleportJob.targetVideoId)
      : undefined;
    const backingVideo =
      candidateVideo && isStandaloneBackingVideo(candidateVideo, teleportJob)
        ? candidateVideo
        : undefined;
    if (backingVideo) {
      consumedStandaloneVideoIds.add(backingVideo.id);
    }

    const postedOverride = resolveOverride(
      input.postedOverrides,
      teleportJob.id,
      backingVideo?.id,
    );
    const archivedOverride = resolveOverride(
      input.archivedOverrides,
      teleportJob.id,
      backingVideo?.id,
    );
    const postedAt = postedOverride.value || backingVideo?.postedAt;
    const archivedAt = resolvedArchivedAt(
      backingVideo?.archivedAt,
      archivedOverride.found ? archivedOverride.value : undefined,
    );

    const promptTitle = teleportJob.scenePrompt?.trim()
      ? `Teleport · ${teleportTaskTitle(teleportJob.scenePrompt)}`
      : "";
    const title = promptTitle || backingVideo?.title || "Teleport";
    const subtitle =
      teleportJob.scenePrompt?.trim() ||
      teleportJob.editPrompt?.trim() ||
      undefined;

    items.push({
      id: teleportJob.id,
      kind: "teleport",
      title,
      subtitle,
      createdAt: teleportJob.createdAt,
      aspectRatio:
        teleportJob.aspectRatio || backingVideo?.aspectRatio || "9:16",
      durationLabel: `${teleportJob.sectionLength || 6}s`,
      languageOrModeLabel: isEn ? "Scene Teleport" : "場景換場",
      previewUrls: uniquePreviewUrls([
        teleportJob.preparedStartFrameUrl,
        teleportJob.sceneImageUrl,
        teleportJob.rawStartFrameUrl,
        teleportJob.preparedEndFrameUrl,
        teleportJob.rawEndFrameUrl,
        ...(backingVideo?.previewUrls ?? []),
      ]),
      outputVideoUrl: teleportJob.outputVideoUrl,
      sourceMediaKind: "video",
      stage: resolveEngineJobStage({
        status: teleportJob.status,
        postedAt,
        archivedAt,
      }),
      isBusy: teleportJob.status === "rendering",
      progressText: buildTeleportProgressText(teleportJob, isEn),
      error: teleportJob.error || backingVideo?.error,
      editorVideoId: backingVideo?.id ?? teleportJob.targetVideoId,
      folderId: backingVideo?.projectId || undefined,
      studioVideo: backingVideo,
      teleportJob,
    });
  }

  for (const video of input.videos) {
    if (consumedStandaloneVideoIds.has(video.id)) continue;

    const kind: UnifiedVideoItem["kind"] =
      video.skillSlug === SCRO_SWAP_STANDALONE_SKILL_SLUG
        ? "scroswap"
        : video.skillSlug === TELEPORT_STANDALONE_SKILL_SLUG
          ? "teleport"
          : "studio";

    const postedOverride = resolveOverride(input.postedOverrides, video.id);
    const archivedOverride = resolveOverride(input.archivedOverrides, video.id);
    const postedAt = postedOverride.value || video.postedAt;
    const archivedAt = resolvedArchivedAt(
      video.archivedAt,
      archivedOverride.found ? archivedOverride.value : undefined,
    );
    const stage = videoListStage({
      status: video.status,
      tags: video.tags,
      postedAt,
      archivedAt,
    });
    const pipelineInfo = computeCardPipelineProgress(video);
    const primaryTitle =
      video.title || video.englishTitle || video.source || t("video.card.unnamed");
    const subtitle =
      video.source && video.source !== primaryTitle ? video.source : undefined;

    const languageOrModeLabel =
      kind === "scroswap"
        ? isEn
          ? "Character Swap"
          : "角色換角"
        : kind === "teleport"
          ? isEn
            ? "Scene Teleport"
            : "場景換場"
          : voLanguageLabel(t, video.language).label;

    items.push({
      id: video.id,
      kind,
      title: primaryTitle,
      subtitle,
      createdAt: video.createdAt,
      aspectRatio: video.aspectRatio,
      durationLabel: durationPresetLabel(t, video.durationPreset).label,
      languageOrModeLabel,
      previewUrls: uniquePreviewUrls(video.previewUrls),
      sourceMediaKind: "video",
      stage,
      isBusy: pipelineInfo.busy,
      progressText: studioCardProgressText(video, t),
      error: video.error,
      editorVideoId: video.id,
      folderId: video.projectId || undefined,
      studioVideo: video,
    });
  }

  items.sort((a, b) => toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt));
  return items;
}

export function filterUnifiedVideoItems(
  items: UnifiedVideoItem[],
  category: UnifiedVideoCategory,
  stages: VideoListFilter[],
): {
  filtered: UnifiedVideoItem[];
  categoryCounts: Record<UnifiedVideoCategory, number>;
  stageCounts: Record<VideoListFilter, number>;
} {
  const categoryCounts: Record<UnifiedVideoCategory, number> = {
    all: items.length,
    studio: 0,
    scroswap: 0,
    teleport: 0,
  };

  const stageCounts = Object.fromEntries(
    VIDEO_LIST_FILTERS.map((id) => [id, 0]),
  ) as Record<VideoListFilter, number>;

  const activeStages = new Set<VideoListFilter>(stages);
  const filtered: UnifiedVideoItem[] = [];

  for (const item of items) {
    categoryCounts[item.kind] += 1;
    const matchesCategory = category === "all" || item.kind === category;
    if (matchesCategory) {
      stageCounts[item.stage] = (stageCounts[item.stage] ?? 0) + 1;
      if (activeStages.has(item.stage)) {
        filtered.push(item);
      }
    }
  }

  return {
    filtered,
    categoryCounts,
    stageCounts,
  };
}
