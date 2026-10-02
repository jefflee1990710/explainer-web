"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { EditTimelineItem } from "@/service/video-edit/edit-timeline";

export function VideoEditTimeline({
  items,
  activeId,
  onPlayFrom,
}: {
  items: EditTimelineItem[];
  activeId: string;
  onPlayFrom: (id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex w-full max-w-3xl items-start justify-center overflow-x-auto px-1">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start">
          {index > 0 ? (
            <span className="mt-6 h-px w-3 shrink-0 bg-[var(--studio-line)]" aria-hidden />
          ) : null}
          <TimelineCard
            label={
              item.kind === "clip"
                ? t("video.preview.clip", { n: item.clipNumber ?? index })
                : t(item.kind === "intro" ? "video.preview.intro" : "video.preview.outro")
            }
            item={item}
            active={activeId === item.id}
            onClick={() => onPlayFrom(item.id)}
          />
        </div>
      ))}
    </div>
  );
}

function TimelineCard({
  label,
  item,
  active,
  onClick,
}: {
  label: string;
  item: EditTimelineItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-20 shrink-0 flex-col overflow-hidden rounded-md border text-left text-[11px] font-semibold ${
        active ? "border-2 border-[var(--studio-teal)]" : "border-[var(--studio-line)]"
      }`}
    >
      <span className="relative block aspect-video bg-[var(--studio-fill)]">
        <CardThumb item={item} />
      </span>
      <span className="bg-white px-1.5 py-1">{label}</span>
    </button>
  );
}

function CardThumb({ item }: { item: EditTimelineItem }) {
  const { t } = useI18n();
  if (item.mediaKind === "video" && item.src) {
    return <video src={item.src} muted playsInline className="absolute inset-0 h-full w-full object-cover" />;
  }
  if (item.mediaKind === "image" && item.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  if (item.poster) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 border border-dashed border-[var(--studio-muted)] bg-[var(--studio-panel)] text-[9px] font-semibold leading-none text-[var(--studio-muted)]">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.4" />
        <path d="M7 16l3.2-3.2L13 15l2-2 3 3" />
      </svg>
      {t("video.layers.unset")}
    </span>
  );
}
