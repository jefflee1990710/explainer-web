"use client";

import { motion } from "framer-motion";
import { StatusBadge } from "@/presentation/components/project/status-badge";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { PreviewStrip } from "@/presentation/components/app/preview-strip";
import type { PublicVideoCard } from "@/presentation/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// One video in the folder grid. Click opens the editor.
export function VideoGridCard({
  video,
  onSelect,
}: {
  video: PublicVideoCard;
  onSelect: (id: string) => void;
}) {
  const previews = video.previewUrls;
  const title = video.title || "未命名影片";
  const progress =
    (video.status === "production" || video.status === "ready") && video.videosTotal > 0
      ? `影片 ${video.videosDone}/${video.videosTotal}`
      : video.status === "failed" && video.error
        ? video.error
        : null;
  const duration = DURATION_PRESETS[video.durationPreset]?.label ?? video.durationPreset;
  const language = LANGUAGE_PRESETS[video.language]?.label ?? video.language;
  const created = new Date(video.createdAt).toLocaleString("zh-Hant", {
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
      <button
        type="button"
        onClick={() => onSelect(video.id)}
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
          <StatusBadge status={video.status} className="absolute left-3 top-3 shadow-sm" />
        </span>
        <span className="flex flex-1 flex-col gap-2 p-4">
          <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
          {progress ? <span className="text-xs text-muted">{progress}</span> : null}
          <span className="mt-auto text-xs text-muted">
            {video.aspectRatio} · {duration} · {language}
          </span>
          <span className="text-xs text-muted">{created}</span>
        </span>
      </button>
    </motion.article>
  );
}
