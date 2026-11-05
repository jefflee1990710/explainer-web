"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generateAllClipsAction } from "@/presentation/actions/clip-production";
import {
  markVideoArchivedAction,
  unarchiveVideoAction,
} from "@/presentation/actions/video-archive";
import { markVideoPostedAction } from "@/presentation/actions/video-post";
import { PreviewStrip } from "@/presentation/components/app/preview-strip";
import { VideoGenerationBadge } from "@/presentation/components/app/projects/[id]/video-generation-badge";
import { VideoGenerationProgress } from "@/presentation/components/app/projects/[id]/video-generation-progress";
import { armBrowserNotifications } from "@/presentation/components/app/tasks/browser-generation-notice";
import {
  holdOptimisticTasks,
  paidKeyTasks,
  releaseOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import {
  beginTaskRefresh,
  endTaskRefresh,
} from "@/presentation/components/app/tasks/task-refresh";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  canGenerateAllVideos,
  type GenerationDetailTag,
} from "@/service/clip-stage";
import { folderVideoPath } from "@/service/folder-video-path";
import type { UnifiedVideoItem } from "@/service/video/unified-video-list";
import { translateAppError } from "@/util/i18n/translate-app-error";

function videosAsBusy(tags: GenerationDetailTag[]): GenerationDetailTag[] {
  return tags.map((tag) =>
    tag.kind === "video" && (tag.state === "pending" || tag.state === "failed")
      ? { ...tag, state: "busy" }
      : tag,
  );
}

function categoryLabel(kind: UnifiedVideoItem["kind"], isEn: boolean): string {
  switch (kind) {
    case "studio":
      return isEn ? "Explainer & Talking Head" : "解說與開講";
    case "scroswap":
      return "Scro Swap";
    case "teleport":
      return "Teleport";
  }
}

function categoryBadgeStyle(kind: UnifiedVideoItem["kind"]): string {
  switch (kind) {
    case "studio":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "scroswap":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "teleport":
      return "border-sky-200 bg-sky-50 text-sky-800";
  }
}

function resolveStageBadge(
  item: UnifiedVideoItem,
  isEn: boolean,
  t: (key: string) => string,
): { label: string; className: string } {
  if (item.stage === "archived") {
    return {
      label: t("video.card.archived"),
      className: "bg-accent-ink text-white",
    };
  }
  if (item.stage === "posted") {
    return {
      label: t("video.card.posted"),
      className: "bg-lime text-accent-ink",
    };
  }
  const hasFailedStatus =
    item.studioVideo?.status === "failed" ||
    item.swapJob?.status === "failed" ||
    item.teleportJob?.status === "failed";
  if (hasFailedStatus) {
    return {
      label: isEn ? "Failed" : "失敗",
      className: "bg-red-100 text-red-700",
    };
  }
  if (item.isBusy) {
    return {
      label: isEn ? "Generating" : "生成中",
      className: "bg-amber-100 text-amber-900",
    };
  }
  if (item.stage === "pending_post") {
    return {
      label: isEn ? "Ready" : "可發佈",
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (item.stage === "pending_video") {
    return {
      label: t("video.filters.pendingVideo"),
      className: "bg-amber-50 text-amber-800 border border-amber-200",
    };
  }
  return {
    label: isEn ? "In Progress" : "進行中",
    className: "bg-zinc-100 text-zinc-700",
  };
}

export function VideoListRow({
  item,
  onPosted,
  onArchived,
  onUnarchived,
  onDeleteSwap,
  onDeleteTeleport,
}: {
  item: UnifiedVideoItem;
  onPosted: (itemId: string, videoId?: string) => void;
  onArchived: (itemId: string, videoId?: string) => void;
  onUnarchived: (itemId: string, videoId?: string) => void;
  onDeleteSwap: (jobId: string) => void;
  onDeleteTeleport: (jobId: string) => void;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const router = useRouter();

  const [submittingClips, setSubmittingClips] = useState(false);
  const [posting, setPosting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localError, setLocalError] = useState("");

  const studioVideo = item.studioVideo;
  const targetVideoId = studioVideo?.id ?? item.editorVideoId;
  const directEditorHref =
    studioVideo && item.editorVideoId
      ? folderVideoPath(item.folderId, item.editorVideoId)
      : null;

  const readyToGenerateAll = studioVideo
    ? canGenerateAllVideos(studioVideo.tags)
    : false;
  const isGeneratingAll = submittingClips && readyToGenerateAll;
  const tags = studioVideo
    ? isGeneratingAll
      ? videosAsBusy(studioVideo.tags)
      : studioVideo.tags
    : [];

  async function handleGenerateAll() {
    if (!studioVideo || isGeneratingAll) return;
    armBrowserNotifications();
    setLocalError("");
    setSubmittingClips(true);
    const keys = studioVideo.tags
      .filter(
        (tag) =>
          tag.kind === "video" &&
          (tag.state === "pending" || tag.state === "failed"),
      )
      .map((tag) => `video:${tag.clipNumber}`);
    const held = holdOptimisticTasks(
      paidKeyTasks({
        videoId: studioVideo.id,
        projectId: studioVideo.projectId || item.folderId || "",
        title: studioVideo.title || t("video.card.unnamed"),
        keys,
      }),
    );
    beginTaskRefresh();
    notifyTasksChanged();
    try {
      const result = await generateAllClipsAction(studioVideo.id);
      if (!result.ok) {
        releaseOptimisticTasks(held);
        notifyTasksChanged();
        setSubmittingClips(false);
        setLocalError(translateAppError(result.error, t));
        return;
      }
      notifyTasksChanged();
      router.refresh();
    } catch {
      releaseOptimisticTasks(held);
      notifyTasksChanged();
      setSubmittingClips(false);
      setLocalError(t("errors.genericRetry"));
    } finally {
      endTaskRefresh();
    }
  }

  async function handleMarkPosted() {
    if (!targetVideoId || posting) return;
    setLocalError("");
    setPosting(true);
    try {
      const result = await markVideoPostedAction(targetVideoId);
      if (!result.ok) {
        setLocalError(translateAppError(result.error, t));
        return;
      }
      onPosted(item.id, targetVideoId);
      router.refresh();
    } catch {
      setLocalError(t("errors.genericRetry"));
    } finally {
      setPosting(false);
    }
  }

  async function handleArchive() {
    if (!studioVideo || archiving) return;
    setLocalError("");
    setArchiving(true);
    try {
      const result = await markVideoArchivedAction(studioVideo.id);
      if (!result.ok) {
        setLocalError(translateAppError(result.error, t));
        return;
      }
      onArchived(item.id, studioVideo.id);
      router.refresh();
    } catch {
      setLocalError(t("errors.genericRetry"));
    } finally {
      setArchiving(false);
    }
  }

  async function handleUnarchive() {
    if (!studioVideo || archiving) return;
    setLocalError("");
    setArchiving(true);
    try {
      const result = await unarchiveVideoAction(studioVideo.id);
      if (!result.ok) {
        setLocalError(translateAppError(result.error, t));
        return;
      }
      onUnarchived(item.id, studioVideo.id);
      router.refresh();
    } catch {
      setLocalError(t("errors.genericRetry"));
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      if (item.swapJob) {
        await onDeleteSwap(item.swapJob.id);
      } else if (item.teleportJob) {
        await onDeleteTeleport(item.teleportJob.id);
      }
    } finally {
      setDeleting(false);
    }
  }

  const stageBadge = resolveStageBadge(item, isEn, t);
  const formattedCreatedAt = new Date(item.createdAt).toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const displayError = localError || item.error;

  const thumbnailContent = (
    <>
      {item.previewUrls.length > 0 ? (
        <PreviewStrip urls={item.previewUrls} alt={item.title} />
      ) : (
        <span className="grid h-full w-full place-items-center bg-zinc-900">
          <span className="h-8 w-14 rounded-md border-2 border-dashed border-white/25" />
        </span>
      )}
      {studioVideo ? (
        <>
          <VideoGenerationProgress tags={tags} status={studioVideo.status} />
          {readyToGenerateAll && !isGeneratingAll ? null : (
            <VideoGenerationBadge
              tags={tags}
              status={studioVideo.status}
              locksBusy={studioVideo.locksBusy}
            />
          )}
        </>
      ) : item.isBusy ? (
        <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-medium leading-4 text-white shadow-sm backdrop-blur-sm">
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)]"
          />
          {isEn ? "Rendering…" : "渲染中…"}
        </span>
      ) : null}
    </>
  );

  return (
    <article className="group flex flex-col gap-4 p-4 transition hover:bg-zinc-50/70 sm:flex-row sm:items-center">
      {/* Left Thumbnail */}
      {directEditorHref ? (
        <Link
          href={directEditorHref}
          className="relative aspect-video w-full shrink-0 cursor-pointer overflow-hidden rounded-xl bg-zinc-900 sm:w-44"
        >
          {thumbnailContent}
        </Link>
      ) : (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-zinc-900 sm:w-44">
          {thumbnailContent}
        </div>
      )}

      {/* Middle Metadata Column */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${categoryBadgeStyle(
              item.kind,
            )}`}
          >
            {categoryLabel(item.kind, isEn)}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${stageBadge.className}`}
          >
            {stageBadge.label}
          </span>
        </div>

        <div className="min-w-0">
          {directEditorHref ? (
            <Link
              href={directEditorHref}
              className="block truncate font-display text-sm font-bold text-[#12141c] hover:underline"
            >
              {item.title}
            </Link>
          ) : (
            <h3 className="truncate font-display text-sm font-bold text-[#12141c]">
              {item.title}
            </h3>
          )}
        </div>

        {item.progressText ? (
          <p className="line-clamp-1 text-xs text-zinc-600">
            {item.progressText}
          </p>
        ) : null}

        {displayError ? (
          <p className="line-clamp-1 text-xs font-medium text-red-600">
            {displayError}
          </p>
        ) : null}

        <p className="text-[11px] text-zinc-500">
          {item.aspectRatio} · {item.durationLabel} · {item.languageOrModeLabel}{" "}
          · {formattedCreatedAt}
        </p>
      </div>

      {/* Right Actions Column */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {studioVideo &&
        readyToGenerateAll &&
        !isGeneratingAll &&
        item.stage !== "archived" ? (
          <button
            type="button"
            onClick={() => void handleGenerateAll()}
            className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-300 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-800"
          >
            {t("video.card.generateAllVideos")}
          </button>
        ) : null}

        {item.outputVideoUrl ? (
          <a
            href={item.outputVideoUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {isEn ? "Download MP4" : "下載 MP4"}
          </a>
        ) : null}

        {item.outputGifUrl ? (
          <a
            href={item.outputGifUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {isEn ? "Download GIF" : "下載 GIF"}
          </a>
        ) : null}

        {item.outputImageUrl ? (
          <a
            href={item.outputImageUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {isEn ? "Download 2K Image" : "下載 2K 圖片"}
          </a>
        ) : null}

        {targetVideoId && item.stage === "pending_post" ? (
          <button
            type="button"
            disabled={posting}
            onClick={() => void handleMarkPosted()}
            className="inline-flex cursor-pointer items-center rounded-xl bg-lime px-2.5 py-1.5 text-xs font-bold text-accent-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("video.card.markPosted")}
          </button>
        ) : null}

        {studioVideo ? (
          item.stage === "archived" ? (
            <button
              type="button"
              disabled={archiving}
              onClick={() => void handleUnarchive()}
              className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("video.card.unarchive")}
            </button>
          ) : (
            <button
              type="button"
              disabled={archiving}
              onClick={() => void handleArchive()}
              className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("video.card.markArchive")}
            </button>
          )
        ) : null}

        {item.swapJob || item.teleportJob ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            title={isEn ? "Delete" : "刪除"}
            className="inline-flex cursor-pointer items-center rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEn ? "Delete" : "刪除"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
