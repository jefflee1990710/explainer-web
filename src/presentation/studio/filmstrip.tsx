"use client";

import { Spinner } from "@/presentation/components/spinner";
import type { StudioClipItem } from "@/presentation/studio/clip-item";

// Bottom filmstrip. The playhead marks the selected clip; it does not scrub.
export function Filmstrip({
  items,
  selectedId,
  onSelect,
}: {
  items: StudioClipItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="flex h-full items-center px-4 text-sm text-[var(--studio-muted)]">
        尚未有片段
      </p>
    );
  }

  return (
    <ol role="tablist" aria-label="Clip 時間軸" className="flex h-full min-w-max items-stretch gap-2 px-3 py-2">
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <li key={item.id} className="relative h-full">
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
                  <span className="absolute bottom-1 right-1 rounded-sm bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
                    需重做
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
