"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { generateAllClipsAction } from "@/presentation/actions/clip-production";
import { VideoGenerationBadge } from "@/presentation/components/app/projects/[id]/video-generation-badge";
import { VideoGenerationProgress } from "@/presentation/components/app/projects/[id]/video-generation-progress";
import {
  beginTaskRefresh,
  endTaskRefresh,
} from "@/presentation/components/app/tasks/task-refresh";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import {
  holdOptimisticTasks,
  paidKeyTasks,
  releaseOptimisticTasks,
} from "@/presentation/components/app/tasks/optimistic-tasks";
import { durationPresetLabel, voLanguageLabel } from "@/util/i18n/picker-labels";
import { translateAppError } from "@/util/i18n/translate-app-error";
import { PreviewStrip } from "@/presentation/components/app/preview-strip";
import type { PublicVideoCard } from "@/presentation/serialize";
import { canGenerateAllVideos, type GenerationDetailTag } from "@/service/clip-stage";
import { folderVideoPath } from "@/service/folder-video-path";

const ease = [0.22, 1, 0.36, 1] as const;

// Click shows the generating badge before the list refreshes.
function videosAsBusy(tags: GenerationDetailTag[]): GenerationDetailTag[] {
  return tags.map((tag) =>
    tag.kind === "video" && (tag.state === "pending" || tag.state === "failed")
      ? { ...tag, state: "busy" }
      : tag,
  );
}

// One video in the folder grid. Click opens the editor in this tab.
export function VideoGridCard({
  folderId,
  video,
}: {
  folderId: string;
  video: PublicVideoCard;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const ready = canGenerateAllVideos(video.tags);
  const tags = submitting ? videosAsBusy(video.tags) : video.tags;

  useEffect(() => {
    if (submitting && !canGenerateAllVideos(video.tags)) setSubmitting(false);
  }, [submitting, video.tags]);

  async function generateAll() {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    const keys = video.tags
      .filter((tag) => tag.kind === "video" && (tag.state === "pending" || tag.state === "failed"))
      .map((tag) => `video:${tag.clipNumber}`);
    const held = holdOptimisticTasks(
      paidKeyTasks({
        videoId: video.id,
        projectId: folderId,
        title: video.title || t("video.card.unnamed"),
        keys,
      }),
    );
    beginTaskRefresh();
    notifyTasksChanged();
    try {
      const result = await generateAllClipsAction(video.id);
      if (!result.ok) {
        releaseOptimisticTasks(held);
        notifyTasksChanged();
        setSubmitting(false);
        setError(translateAppError(result.error, t));
        return;
      }
      notifyTasksChanged();
      router.refresh();
    } catch {
      releaseOptimisticTasks(held);
      notifyTasksChanged();
      setSubmitting(false);
      setError(t("errors.genericRetry"));
    } finally {
      endTaskRefresh();
    }
  }

  const previews = video.previewUrls;
  const title = video.title || t("video.card.unnamed");
  const progress =
    (video.status === "production" || video.status === "ready") && video.videosTotal > 0
      ? t("video.card.progress", { done: video.videosDone, total: video.videosTotal })
      : video.status === "failed" && video.error
        ? video.error
        : null;
  const duration = durationPresetLabel(t, video.durationPreset).label;
  const language = voLanguageLabel(t, video.language).label;
  const created = new Date(video.createdAt).toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="studio-card group relative flex flex-col overflow-hidden border border-[var(--studio-line)]"
    >
      <Link
        href={folderVideoPath(folderId, video.id)}
        className="flex h-full cursor-pointer flex-col text-left"
      >
        <span className="relative block aspect-video overflow-hidden bg-accent-ink/5">
          {previews.length ? (
            <PreviewStrip urls={previews} />
          ) : (
            <span className="grid h-full w-full place-items-center">
              <span className="h-9 w-16 rounded-md border-2 border-dashed border-accent-ink/25" />
            </span>
          )}
          <VideoGenerationProgress tags={tags} status={video.status} />
          {ready && !submitting ? null : <VideoGenerationBadge tags={tags} />}
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-2.5">
          <span className="line-clamp-2 text-xs font-medium leading-snug">{title}</span>
          {progress ? <span className="text-[11px] leading-snug text-muted">{progress}</span> : null}
          {error ? <span className="text-[11px] font-medium leading-snug text-accent">{error}</span> : null}
          <span className="mt-auto text-[11px] leading-snug text-muted">
            {video.aspectRatio} · {duration} · {language}
          </span>
          <span className="text-[11px] text-muted">{created}</span>
        </span>
      </Link>
      {ready && !submitting ? (
        <button
          type="button"
          onClick={() => void generateAll()}
          className="absolute right-2 top-2 z-20 inline-flex cursor-pointer items-center rounded-full bg-[var(--studio-ink)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm hover:opacity-90"
        >
          {t("video.card.generateAllVideos")}
        </button>
      ) : null}
    </motion.article>
  );
}
