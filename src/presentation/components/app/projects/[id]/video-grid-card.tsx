"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoGenerationProgress } from "@/presentation/components/app/projects/[id]/video-generation-progress";
import { durationPresetLabel, voLanguageLabel } from "@/util/i18n/picker-labels";
import { PreviewStrip } from "@/presentation/components/app/preview-strip";
import type { PublicVideoCard } from "@/presentation/serialize";
import { folderVideoPath } from "@/service/folder-video-path";

const ease = [0.22, 1, 0.36, 1] as const;

// One video in the folder grid. Click opens the editor in this tab.
export function VideoGridCard({
  folderId,
  video,
}: {
  folderId: string;
  video: PublicVideoCard;
}) {
  const { t, locale } = useI18n();
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
      className="studio-card group flex flex-col overflow-hidden border border-[var(--studio-line)]"
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
          <VideoGenerationProgress tags={video.tags} status={video.status} />
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-2.5">
          <span className="line-clamp-2 text-xs font-medium leading-snug">{title}</span>
          {progress ? <span className="text-[11px] leading-snug text-muted">{progress}</span> : null}
          <span className="mt-auto text-[11px] leading-snug text-muted">
            {video.aspectRatio} · {duration} · {language}
          </span>
          <span className="text-[11px] text-muted">{created}</span>
        </span>
      </Link>
    </motion.article>
  );
}
