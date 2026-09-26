"use client";

import { Spinner } from "@/presentation/components/spinner";
import type { StudioClipItem, StudioClipTone } from "@/presentation/studio/clip-item";

// Status band colour under each thumbnail.
const TONE_CLASS: Record<StudioClipTone, string> = {
  idle: "bg-[var(--studio-line)]",
  busy: "bg-[var(--studio-teal)] animate-pulse",
  done: "bg-emerald-500",
  failed: "bg-[var(--accent)]",
  stale: "bg-amber-500",
};

// Bottom filmstrip. The playhead marks the selected clip; it does not scrub.
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
  if (items.length === 0) {
    return (
      <p className="flex h-full items-center px-4 text-sm text-[var(--studio-muted)]">
        尚未有片段
      </p>
    );
  }

  // Once anything is checked every checkbox stays visible.
  const checking = checkedIds.length > 0;

  return (
    <ol role="tablist" aria-label="Clip 時間軸" className="flex h-full min-w-max items-stretch gap-2 px-3 py-2">
      {items.map((item) => {
        const selected = item.id === selectedId;
        const checked = checkedIds.includes(item.id);
        return (
          <li key={item.id} className="group relative h-full">
            {selected ? (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-0.5 bg-[var(--studio-ink)]"
              />
            ) : null}
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${item.title} ${item.durationLabel} ${item.statusLabel}`}
              onClick={() => onSelect(item.id)}
              className={`flex h-full w-[148px] cursor-pointer flex-col overflow-hidden rounded-sm border bg-white text-left ${
                selected ? "border-2 border-[var(--studio-teal)]" : "border border-[var(--studio-line)]"
              }`}
            >
              <span className="flex h-5 shrink-0 items-center gap-1 bg-[var(--studio-teal)] px-1.5 text-[10px] font-semibold leading-none text-white">
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="shrink-0 tabular-nums">{item.durationLabel}</span>
                {item.busy ? <Spinner className="h-2.5 w-2.5 shrink-0" /> : null}
              </span>
              <span className="relative min-h-0 flex-1">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 bg-[var(--studio-canvas)]" aria-hidden />
                )}
                {item.stale ? (
                  <span className="absolute bottom-1.5 right-1 rounded-sm bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
                    需重做
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
                  aria-label={`選取 ${item.title}`}
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
