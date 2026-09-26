"use client";

import { motion } from "framer-motion";
import { StatusBadge } from "@/presentation/components/project/status-badge";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { productionCounts } from "@/service/clip-stage";
import { videoPreviewUrl, type PublicVideo } from "@/presentation/serialize";

const ease = [0.22, 1, 0.36, 1] as const;

// One video in the folder grid. Click opens the editor.
export function VideoGridCard({
  video,
  onSelect,
}: {
  video: PublicVideo;
  onSelect: (id: string) => void;
}) {
  const preview = videoPreviewUrl(video);
  const title = video.phaseA?.localizedTitle || "未命名影片";
  const counts =
    video.status === "production" || video.status === "ready"
      ? productionCounts(video)
      : null;
  const progress =
    counts && counts.total > 0
      ? `影片 ${counts.videosDone}/${counts.total}`
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
      whileHover={{ y: -3 }}
      className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-accent-ink/10 bg-paper/85 shadow-[4px_4px_0_0_rgba(18,20,28,0.06)] transition-shadow hover:shadow-[6px_6px_0_0_rgba(198,242,75,0.55)]"
    >
      <button
        type="button"
        onClick={() => onSelect(video.id)}
        className="flex h-full cursor-pointer flex-col text-left"
      >
        <span className="relative block aspect-video overflow-hidden bg-accent-ink/5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="grid h-full w-full place-items-center">
              <span className="h-9 w-16 rounded-md border-2 border-dashed border-accent-ink/25" />
            </span>
          )}
          <StatusBadge status={video.status} className="absolute left-3 top-3 shadow-sm" />
        </span>
        <span className="flex flex-1 flex-col gap-2 p-4">
          <span className="font-display line-clamp-2 text-base font-bold leading-snug">{title}</span>
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
