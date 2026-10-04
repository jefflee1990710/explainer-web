"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoEditTransitionDialog } from "@/presentation/components/app/projects/new/video-edit-transition-dialog";
import type { EditTimelineItem } from "@/service/video-edit/edit-timeline";
import { resolveTransition, timelineGaps, type TimelineGap } from "@/service/video-edit/edit-transition";
import type { EditTransition, VideoEdit } from "@/model/video-edit";

export type EditSlot = "cover" | "intro" | "outro";

export function VideoEditTimeline({
  items,
  edit,
  activeId,
  coverUrl,
  coverBusy,
  onPlayFrom,
  onTransitionChange,
  onOpenSlot,
}: {
  items: EditTimelineItem[];
  edit: VideoEdit;
  activeId: string;
  coverUrl?: string;
  coverBusy?: boolean;
  onPlayFrom: (id: string) => void;
  onTransitionChange: (fromId: string, toId: string, transition: EditTransition) => void;
  onOpenSlot: (slot: EditSlot) => void;
}) {
  const { t } = useI18n();
  const gaps = timelineGaps(items);
  const [editing, setEditing] = useState<TimelineGap | null>(null);

  function itemLabel(id: string) {
    const item = items.find((row) => row.id === id);
    if (item?.kind === "clip") return t("video.preview.clip", { n: item.clipNumber ?? 0 });
    if (id === "intro") return t("video.preview.intro");
    return t("video.preview.outro");
  }

  function clickItem(item: EditTimelineItem) {
    if (item.kind === "intro" || item.kind === "outro") {
      onOpenSlot(item.kind);
      return;
    }
    onPlayFrom(item.id);
  }

  return (
    <>
      <div className="w-full max-w-3xl overflow-x-auto px-1">
        <div className="mx-auto flex w-max min-w-full items-start justify-center">
          <CoverCard src={coverUrl} busy={coverBusy} onClick={() => onOpenSlot("cover")} />
          <span className="w-2 shrink-0" aria-hidden />
          {items.map((item, index) => {
            const gap = index > 0 ? gaps[index - 1] : undefined;
            const transition = gap ? resolveTransition(edit, gap.fromId, gap.toId) : undefined;
            return (
              <div key={item.id} className="flex shrink-0 items-start">
                {gap ? (
                  <TransitionButton
                    active={transition?.effect !== "none"}
                    label={t("video.transition.aria")}
                    onClick={() => setEditing(gap)}
                  />
                ) : null}
                <TimelineCard
                  label={
                    item.kind === "clip"
                      ? t("video.preview.clip", { n: item.clipNumber ?? index })
                      : t(item.kind === "intro" ? "video.preview.intro" : "video.preview.outro")
                  }
                  item={item}
                  active={activeId === item.id}
                  onClick={() => clickItem(item)}
                />
              </div>
            );
          })}
        </div>
      </div>
      {editing ? (
        <VideoEditTransitionDialog
          fromLabel={itemLabel(editing.fromId)}
          toLabel={itemLabel(editing.toId)}
          value={resolveTransition(edit, editing.fromId, editing.toId)}
          onSave={(transition) => onTransitionChange(editing.fromId, editing.toId, transition)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function TransitionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="flex w-8 shrink-0 flex-col items-center pt-5">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`grid h-6 w-6 place-items-center rounded-full border text-[9px] font-bold ${
          active
            ? "border-[var(--studio-teal)] bg-[var(--studio-teal)] text-[#12141c]"
            : "border-[var(--studio-line)] bg-white text-[var(--studio-muted)]"
        }`}
      >
        FX
      </button>
    </div>
  );
}

function CoverCard({
  src,
  busy,
  onClick,
}: {
  src?: string;
  busy?: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-20 shrink-0 cursor-pointer flex-col overflow-hidden rounded-md border border-[var(--studio-line)] text-left text-[11px] font-semibold hover:border-[var(--studio-teal)]"
    >
      <span className="relative block aspect-video bg-[var(--studio-fill)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 border border-dashed border-[var(--studio-muted)] bg-[var(--studio-panel)] text-[9px] font-semibold leading-none text-[var(--studio-muted)]">
            {busy ? "…" : t("video.layers.unset")}
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-[10px] font-semibold text-white">
            …
          </span>
        ) : null}
      </span>
      <span className="bg-white px-1.5 py-1">{t("video.slots.cover")}</span>
    </button>
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
      className={`flex w-20 shrink-0 cursor-pointer flex-col overflow-hidden rounded-md border text-left text-[11px] font-semibold ${
        active ? "border-2 border-[var(--studio-teal)]" : "border-[var(--studio-line)] hover:border-[var(--studio-teal)]"
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
