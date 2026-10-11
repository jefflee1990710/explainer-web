"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { VIDEO_LIST_FILTERS, type VideoListFilter } from "@/service/video/list-stage";

const LABEL: Record<VideoListFilter, string> = {
  director: "video.filters.director",
  scenes: "video.filters.scenes",
  videos: "video.filters.videos",
  pending_video: "video.filters.pendingVideo",
  pending_post: "video.filters.pendingPost",
  posted: "video.filters.posted",
};

// Tag chips above the folder grid. Several stages can stay on at once.
export function VideoListFilters({
  counts,
  active,
  onChange,
}: {
  counts: Record<VideoListFilter, number>;
  active: VideoListFilter[];
  onChange: (filters: VideoListFilter[]) => void;
}) {
  const { t } = useI18n();
  const total = VIDEO_LIST_FILTERS.reduce((sum, filter) => sum + counts[filter], 0);
  const allOn = active.length === VIDEO_LIST_FILTERS.length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label={t("video.filters.label")}>
      <FilterChip
        label={t("video.filters.all")}
        count={total}
        pressed={allOn}
        onClick={() => onChange(allOn ? [] : [...VIDEO_LIST_FILTERS])}
      />
      {VIDEO_LIST_FILTERS.map((filter) => (
        <FilterChip
          key={filter}
          label={t(LABEL[filter])}
          count={counts[filter]}
          pressed={active.includes(filter)}
          onClick={() =>
            onChange(
              active.includes(filter) ? active.filter((id) => id !== filter) : [...active, filter],
            )
          }
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        pressed
          ? "bg-accent-ink text-lime shadow-[2px_2px_0_0_rgba(198,242,75,0.9)]"
          : "border border-accent-ink/15 bg-paper text-muted hover:text-foreground"
      } ${count === 0 && !pressed ? "opacity-50" : ""}`}
    >
      {label}
      <span className={`tabular-nums ${pressed ? "text-lime/80" : "text-muted"}`}>{count}</span>
    </button>
  );
}
