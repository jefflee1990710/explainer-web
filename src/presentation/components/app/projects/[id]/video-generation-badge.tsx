"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { ProjectStatus } from "@/model/project";
import { cardGenerationBadge, type GenerationDetailTag } from "@/service/clip-stage";

// Top-right 5-step pill on a video card showing 1/5 .. 4/5 status while active or awaiting action.
export function VideoGenerationBadge({
  tags,
  status,
  locksBusy,
}: {
  tags: GenerationDetailTag[];
  status?: ProjectStatus;
  locksBusy?: boolean;
}) {
  const { t } = useI18n();

  if (status === "phase_a") {
    return (
      <span className="absolute right-2 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-medium leading-4 text-white shadow-sm backdrop-blur-sm tabular-nums">
        <span
          aria-hidden
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)] motion-reduce:animate-none"
        />
        {t("video.card.badgeStoryboard")}
      </span>
    );
  }

  if (locksBusy) {
    return (
      <span className="absolute right-2 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-medium leading-4 text-white shadow-sm backdrop-blur-sm tabular-nums">
        <span
          aria-hidden
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--studio-teal)] motion-reduce:animate-none"
        />
        {t("video.card.badgeLocks")}
      </span>
    );
  }

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
    <span className="absolute right-2 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-medium leading-4 text-white shadow-sm backdrop-blur-sm tabular-nums">
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
