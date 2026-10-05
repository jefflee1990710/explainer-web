"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { cardGenerationBadge, type GenerationDetailTag } from "@/service/clip-stage";

// Top-right pill on a video card while its images or clip videos are in flight,
// or once every image is done and the videos have not started.
export function VideoGenerationBadge({ tags }: { tags: GenerationDetailTag[] }) {
  const { t } = useI18n();
  const badge = cardGenerationBadge(tags);
  if (!badge) return null;

  const busy = badge !== "awaiting_video";
  const label =
    badge === "images"
      ? t("video.card.badgeImages")
      : badge === "videos"
        ? t("video.card.badgeVideos")
        : t("video.card.badgeAwaitingVideo");

  return (
    <span className="absolute right-2 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium leading-4 text-white shadow-sm backdrop-blur-sm">
      <span
        aria-hidden
        className={
          busy
            ? "h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)] motion-reduce:animate-none"
            : "h-1.5 w-1.5 rounded-full bg-amber-300"
        }
      />
      {label}
    </span>
  );
}
