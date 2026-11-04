import assert from "node:assert/strict";
import test from "node:test";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import type { PublicTeleportJob } from "@/model/teleport-job";
import type { PublicVideoCard } from "@/presentation/serialize";
import {
  SCRO_SWAP_STANDALONE_SKILL_SLUG,
  TELEPORT_STANDALONE_SKILL_SLUG,
} from "@/service/opencut/standalone-engine-video";
import { DEFAULT_VIDEO_LIST_FILTERS, VIDEO_LIST_FILTERS } from "@/service/video/list-stage";
import {
  buildUnifiedVideoItems,
  filterUnifiedVideoItems,
} from "@/service/video/unified-video-list";
import type { TranslateFn } from "@/util/i18n";
import { pageCount, pageSlice, VIDEO_PAGE_SIZE } from "@/util/video-page";

const fakeT: TranslateFn = (key, params) => {
  if (!params) return key;
  return `${key}:${JSON.stringify(params)}`;
};

function makeStudioVideo(overrides: Partial<PublicVideoCard> & { id: string }): PublicVideoCard {
  return {
    id: overrides.id,
    projectId: overrides.projectId ?? "folder_1",
    title: overrides.title ?? `Video ${overrides.id}`,
    englishTitle: overrides.englishTitle ?? `Video ${overrides.id}`,
    source: overrides.source ?? `Source ${overrides.id}`,
    skillSlug: overrides.skillSlug ?? "talking-head-director",
    status: overrides.status ?? "ready",
    aspectRatio: overrides.aspectRatio ?? "9:16",
    durationPreset: overrides.durationPreset ?? "short",
    language: overrides.language ?? "yue",
    createdAt: overrides.createdAt ?? "2026-11-05T10:00:00.000Z",
    previewUrls: overrides.previewUrls ?? ["https://blob.vercel-storage.com/v-frame.webp"],
    error: overrides.error,
    videosDone: overrides.videosDone ?? 1,
    videosTotal: overrides.videosTotal ?? 1,
    tags: overrides.tags ?? [
      { clipNumber: 1, kind: "scene", state: "ready" },
      { clipNumber: 1, kind: "video", state: "ready" },
    ],
    locksBusy: overrides.locksBusy,
    propsTotal: overrides.propsTotal,
    propsDone: overrides.propsDone,
    platesTotal: overrides.platesTotal,
    platesDone: overrides.platesDone,
    postedAt: overrides.postedAt,
    archivedAt: overrides.archivedAt,
  };
}

function makeSwapJob(overrides: Partial<PublicJutsuJob> & { id: string }): PublicJutsuJob {
  return {
    id: overrides.id,
    mode: overrides.mode ?? "character_swap",
    status: overrides.status ?? "completed",
    sourceVideoUrl: overrides.sourceVideoUrl ?? "https://blob.vercel-storage.com/src.mp4",
    sourceMediaKind: overrides.sourceMediaKind ?? "video",
    aspectRatio: overrides.aspectRatio ?? "9:16",
    sectionStart: overrides.sectionStart ?? 0,
    sectionLength: overrides.sectionLength ?? 6,
    rawStartFrameUrl: overrides.rawStartFrameUrl,
    rawEndFrameUrl: overrides.rawEndFrameUrl,
    preparedStartFrameUrl:
      overrides.preparedStartFrameUrl ?? "https://blob.vercel-storage.com/swap-start.webp",
    preparedEndFrameUrl: overrides.preparedEndFrameUrl,
    characterId: overrides.characterId ?? "char_1",
    characterName: overrides.characterName ?? "Alice",
    referenceImageUrl: overrides.referenceImageUrl,
    outputVideoUrl: overrides.outputVideoUrl ?? "https://blob.vercel-storage.com/swap-out.mp4",
    outputGifUrl: overrides.outputGifUrl,
    outputImageUrl: overrides.outputImageUrl,
    targetVideoId: overrides.targetVideoId,
    targetClipNumber: overrides.targetClipNumber,
    error: overrides.error,
    createdAt: overrides.createdAt ?? "2026-11-05T11:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-11-05T11:01:00.000Z",
  };
}

function makeTeleportJob(overrides: Partial<PublicTeleportJob> & { id: string }): PublicTeleportJob {
  return {
    id: overrides.id,
    status: overrides.status ?? "completed",
    sourceVideoUrl: overrides.sourceVideoUrl ?? "https://blob.vercel-storage.com/tp-src.mp4",
    aspectRatio: overrides.aspectRatio ?? "9:16",
    sectionStart: overrides.sectionStart ?? 0,
    sectionLength: overrides.sectionLength ?? 8,
    sceneImageUrl: overrides.sceneImageUrl ?? "https://blob.vercel-storage.com/tp-scene.webp",
    scenePrompt: overrides.scenePrompt ?? "Cyberpunk neon street",
    preparedStartFrameUrl:
      overrides.preparedStartFrameUrl ?? "https://blob.vercel-storage.com/tp-start.webp",
    outputVideoUrl: overrides.outputVideoUrl ?? "https://blob.vercel-storage.com/tp-out.mp4",
    targetVideoId: overrides.targetVideoId,
    targetClipNumber: overrides.targetClipNumber,
    error: overrides.error,
    createdAt: overrides.createdAt ?? "2026-11-05T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-11-05T12:01:00.000Z",
  };
}

test("buildUnifiedVideoItems merges Studio videos, Scro Swap jobs, and Teleport jobs sorted by createdAt descending", () => {
  const studio = makeStudioVideo({
    id: "vid_1",
    title: "Explainer Hook",
    createdAt: "2026-11-05T09:00:00.000Z",
  });
  const swap = makeSwapJob({
    id: "swap_1",
    characterName: "Leo",
    createdAt: "2026-11-05T11:00:00.000Z",
  });
  const teleport = makeTeleportJob({
    id: "tp_1",
    scenePrompt: "Tokyo Shibuya Crossing",
    createdAt: "2026-11-05T10:00:00.000Z",
  });

  const items = buildUnifiedVideoItems({
    videos: [studio],
    swapJobs: [swap],
    teleportJobs: [teleport],
    isEn: true,
    t: fakeT,
  });

  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((item) => ({ id: item.id, kind: item.kind })),
    [
      { id: "swap_1", kind: "scroswap" },
      { id: "tp_1", kind: "teleport" },
      { id: "vid_1", kind: "studio" },
    ],
  );
  assert.equal(items[0]?.title, "Scro Swap · Leo");
  assert.equal(items[1]?.title, "Teleport · Tokyo Shibuya Crossing");
  assert.equal(items[2]?.title, "Explainer Hook");
  assert.equal(items[2]?.editorVideoId, "vid_1");
});

test("buildUnifiedVideoItems deduplicates standalone wrapper projects while retaining editorVideoId and posted/archived flags", () => {
  const backingSwapProject = makeStudioVideo({
    id: "standalone_swap_vid",
    skillSlug: SCRO_SWAP_STANDALONE_SKILL_SLUG,
    title: "Scro Swap · Alice",
    createdAt: "2026-11-05T11:00:00.000Z",
    postedAt: "2026-11-05T12:00:00.000Z",
  });
  const swapJob = makeSwapJob({
    id: "swap_job_1",
    characterName: "Alice",
    targetVideoId: "standalone_swap_vid",
    targetClipNumber: 1,
    createdAt: "2026-11-05T11:00:00.000Z",
  });

  const backingTeleportProject = makeStudioVideo({
    id: "standalone_tp_vid",
    skillSlug: TELEPORT_STANDALONE_SKILL_SLUG,
    title: "Teleport · Mars Colony",
    createdAt: "2026-11-05T11:30:00.000Z",
    archivedAt: "2026-11-05T12:30:00.000Z",
  });
  const teleportJob = makeTeleportJob({
    id: "tp_job_1",
    scenePrompt: "Mars Colony",
    targetVideoId: "standalone_tp_vid",
    targetClipNumber: 1,
    createdAt: "2026-11-05T11:30:00.000Z",
  });

  // Also test an orphan standalone project whose engine job was outside the 50-job query slice
  const orphanStandaloneProject = makeStudioVideo({
    id: "orphan_swap_vid",
    skillSlug: SCRO_SWAP_STANDALONE_SKILL_SLUG,
    title: "Scro Swap · Older Job",
    createdAt: "2026-11-05T08:00:00.000Z",
  });

  // Also test a multi-clip Studio video that had clip 2 swapped in-place in OpenCut
  const multiClipStudio = makeStudioVideo({
    id: "studio_multi",
    skillSlug: "explainer-director",
    title: "3-Clip Brand Story",
    videosDone: 3,
    videosTotal: 3,
    createdAt: "2026-11-05T07:00:00.000Z",
  });
  const inPlaceClipSwap = makeSwapJob({
    id: "swap_clip_2",
    characterName: "Bob",
    targetVideoId: "studio_multi",
    targetClipNumber: 2,
    createdAt: "2026-11-05T07:30:00.000Z",
  });

  const items = buildUnifiedVideoItems({
    videos: [
      backingSwapProject,
      backingTeleportProject,
      orphanStandaloneProject,
      multiClipStudio,
    ],
    swapJobs: [swapJob, inPlaceClipSwap],
    teleportJobs: [teleportJob],
    isEn: true,
    t: fakeT,
  });

  // 2 deduplicated standalone jobs + 1 orphan standalone + 1 multi-clip studio + 1 in-place clip swap = 5 items
  assert.equal(items.length, 5);

  const tpItem = items.find((i) => i.id === "tp_job_1");
  assert.ok(tpItem);
  assert.equal(tpItem.kind, "teleport");
  assert.equal(tpItem.editorVideoId, "standalone_tp_vid");
  assert.equal(tpItem.stage, "archived");
  assert.equal(tpItem.studioVideo?.id, "standalone_tp_vid");

  const swapItem = items.find((i) => i.id === "swap_job_1");
  assert.ok(swapItem);
  assert.equal(swapItem.kind, "scroswap");
  assert.equal(swapItem.editorVideoId, "standalone_swap_vid");
  assert.equal(swapItem.stage, "posted");
  assert.equal(swapItem.studioVideo?.id, "standalone_swap_vid");

  const orphanItem = items.find((i) => i.id === "orphan_swap_vid");
  assert.ok(orphanItem);
  assert.equal(orphanItem.kind, "scroswap");
  assert.equal(orphanItem.editorVideoId, "orphan_swap_vid");

  const studioItem = items.find((i) => i.id === "studio_multi");
  assert.ok(studioItem);
  assert.equal(studioItem.kind, "studio");
});

test("filterUnifiedVideoItems filters by category and stage pills and computes accurate counts", () => {
  const studioReady = makeStudioVideo({
    id: "v_ready",
    createdAt: "2026-11-05T10:00:00.000Z",
  });
  const studioGenerating = makeStudioVideo({
    id: "v_gen",
    status: "production",
    videosDone: 0,
    videosTotal: 1,
    tags: [
      { clipNumber: 1, kind: "scene", state: "ready" },
      { clipNumber: 1, kind: "video", state: "busy" },
    ],
    createdAt: "2026-11-05T11:00:00.000Z",
  });
  const swapRendering = makeSwapJob({
    id: "s_rendering",
    status: "rendering",
    outputVideoUrl: undefined,
    createdAt: "2026-11-05T12:00:00.000Z",
  });
  const swapFailed = makeSwapJob({
    id: "s_failed",
    status: "failed",
    outputVideoUrl: undefined,
    error: "Model timeout",
    createdAt: "2026-11-05T12:30:00.000Z",
  });
  const teleportCompleted = makeTeleportJob({
    id: "t_done",
    status: "completed",
    createdAt: "2026-11-05T13:00:00.000Z",
  });

  const items = buildUnifiedVideoItems({
    videos: [studioReady, studioGenerating],
    swapJobs: [swapRendering, swapFailed],
    teleportJobs: [teleportCompleted],
    postedOverrides: { v_ready: "2026-11-05T14:00:00.000Z" },
    archivedOverrides: { t_done: "2026-11-05T14:05:00.000Z" },
    isEn: true,
    t: fakeT,
  });

  const allDefault = filterUnifiedVideoItems(items, "all", DEFAULT_VIDEO_LIST_FILTERS);
  assert.deepEqual(allDefault.categoryCounts, {
    all: 5,
    studio: 2,
    scroswap: 2,
    teleport: 1,
  });
  assert.equal(allDefault.stageCounts.videos, 2); // v_gen + s_rendering
  assert.equal(allDefault.stageCounts.pending_video, 1); // s_failed
  assert.equal(allDefault.stageCounts.posted, 1); // v_ready
  assert.equal(allDefault.stageCounts.archived, 1); // t_done
  // Default filters exclude posted & archived
  assert.deepEqual(
    allDefault.filtered.map((i) => i.id),
    ["s_failed", "s_rendering", "v_gen"],
  );

  // Category filter: scroswap only
  const swapOnly = filterUnifiedVideoItems(items, "scroswap", [...VIDEO_LIST_FILTERS]);
  assert.equal(swapOnly.filtered.length, 2);
  assert.equal(swapOnly.stageCounts.videos, 1);
  assert.equal(swapOnly.stageCounts.pending_video, 1);
  assert.equal(swapOnly.stageCounts.posted, 0);
});

test("unified list items slice cleanly into pages of VIDEO_PAGE_SIZE (12)", () => {
  const videos = Array.from({ length: 15 }, (_, idx) =>
    makeStudioVideo({
      id: `vid_${idx + 1}`,
      createdAt: new Date(Date.UTC(2026, 10, 5, 0, idx)).toISOString(),
    }),
  );

  const items = buildUnifiedVideoItems({
    videos,
    swapJobs: [],
    teleportJobs: [],
    isEn: true,
    t: fakeT,
  });
  const { filtered } = filterUnifiedVideoItems(items, "all", DEFAULT_VIDEO_LIST_FILTERS);

  assert.equal(VIDEO_PAGE_SIZE, 12);
  assert.equal(pageCount(filtered.length), 2);

  const page1 = pageSlice(filtered, 1);
  const page2 = pageSlice(filtered, 2);
  assert.equal(page1.length, 12);
  assert.equal(page2.length, 3);
  assert.equal(page1[0]?.id, "vid_15");
  assert.equal(page2[2]?.id, "vid_1");
});
