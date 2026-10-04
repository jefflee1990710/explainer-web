"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { StudioClipItem, StudioClipTone } from "@/presentation/studio/clip-item";
import { FilmstripGenerating } from "@/presentation/studio/filmstrip-generating";
import { FilmstripMediaTags } from "@/presentation/studio/filmstrip-media-tags";

// Status band colour under each thumbnail.
const TONE_CLASS: Record<StudioClipTone, string> = {
  idle: "bg-[var(--studio-line)]",
  busy: "bg-[var(--studio-teal)] animate-pulse",
  done: "bg-emerald-500",
  failed: "bg-[var(--accent)]",
  stale: "bg-amber-500",
};

// Top filmstrip. Selected clip uses an ink+teal frame; it does not scrub.
// Passing `onToggleCheck` adds a checkbox per clip for batch actions.
export function Filmstrip({
  items,
  selectedId,
  onSelect,
  checkedIds = [],
  onToggleCheck,
}: {
  items: StudioClipItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  checkedIds?: string[];
  onToggleCheck?: (id: string) => void;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <p className="flex items-center px-4 py-6 text-sm text-[var(--studio-muted)]">
        {t("production.filmstrip.empty")}
      </p>
    );
  }

  // Once anything is checked every checkbox stays visible.
  const checking = checkedIds.length > 0;

  return (
    <ol role="tablist" aria-label={t("production.filmstrip.timelineAria")} className="flex min-w-max items-stretch gap-2 px-3 py-2">
      {items.map((item) => {
        const selected = item.id === selectedId;
        const checked = checkedIds.includes(item.id);
        return (
          <li key={item.id} className={`group relative ${selected ? "z-10" : ""}`}>
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${item.title} ${item.durationLabel} ${item.statusLabel}${item.hasScene ? t("production.filmstrip.sceneDoneSuffix") : ""}${item.hasVideo ? t("production.filmstrip.videoDoneSuffix") : ""}`}
              onClick={() => onSelect(item.id)}
              className={`flex w-[148px] cursor-pointer flex-col overflow-hidden rounded-sm border bg-white text-left transition ${
                selected
                  ? "border-2 border-[var(--studio-ink)] shadow-[0_0_0_3px_var(--studio-teal)]"
                  : "border border-[var(--studio-line)] opacity-80 hover:opacity-100"
              }`}
            >
              {/* Only the selected clip keeps the bright teal title bar. */}
              <span
                className={`flex h-5 shrink-0 items-center gap-1 px-1.5 text-[10px] font-semibold leading-none ${
                  selected
                    ? "bg-[var(--studio-teal)] text-white"
                    : "bg-[var(--studio-fill)] text-[var(--studio-muted)]"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="shrink-0 tabular-nums">{item.durationLabel}</span>
                {item.busy ? <Spinner className="h-2.5 w-2.5 shrink-0" /> : null}
              </span>
              <span className="relative aspect-square w-full">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover ${item.busy ? "opacity-40" : ""}`}
                  />
                ) : (
                  <span className="absolute inset-0 bg-[var(--studio-canvas)]" aria-hidden />
                )}
                {item.busy ? <FilmstripGenerating /> : null}
                <FilmstripMediaTags hasScene={item.hasScene} hasVideo={item.hasVideo} />
                {item.stale ? (
                  <span className="absolute bottom-1.5 right-1 rounded-sm bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
                    {t("production.filmstrip.needsRedo")}
                  </span>
                ) : null}
              </span>
              <span aria-hidden className={`h-[3px] shrink-0 ${TONE_CLASS[item.tone]}`} />
            </button>
            {onToggleCheck ? (
              <label
                className={`absolute left-1.5 top-6 z-20 grid h-6 w-6 cursor-pointer place-items-center rounded-sm bg-white/90 shadow-sm transition ${
                  checking || checked
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleCheck(item.id)}
                  aria-label={t("production.filmstrip.selectClip", { title: item.title })}
                  className="h-4 w-4 cursor-pointer accent-[var(--studio-teal)]"
                />
              </label>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
