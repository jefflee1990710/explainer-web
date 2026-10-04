"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { BookendClip } from "@/model/video-edit";

export type EditSlot = "cover" | "intro" | "outro";

// Cover / Intro / Outro sit under the timeline; click opens the matching dialog.
export function VideoEditSlotBar({
  coverUrl,
  coverBusy,
  intro,
  outro,
  onOpen,
}: {
  coverUrl?: string;
  coverBusy?: boolean;
  intro?: BookendClip;
  outro?: BookendClip;
  onOpen: (slot: EditSlot) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex w-full max-w-3xl items-start justify-center gap-2 px-1">
      <SlotButton
        label={t("video.slots.cover")}
        src={coverUrl}
        busy={coverBusy}
        onClick={() => onOpen("cover")}
      />
      <SlotButton
        label={t("video.slots.intro")}
        src={intro?.assetUrl}
        kind={intro?.kind}
        onClick={() => onOpen("intro")}
      />
      <SlotButton
        label={t("video.slots.outro")}
        src={outro?.assetUrl}
        kind={outro?.kind}
        onClick={() => onOpen("outro")}
      />
    </div>
  );
}

function SlotButton({
  label,
  src,
  kind,
  busy,
  onClick,
}: {
  label: string;
  src?: string;
  kind?: "image" | "video";
  busy?: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-20 shrink-0 cursor-pointer flex-col overflow-hidden rounded-md border border-[var(--studio-line)] bg-white text-left text-[11px] font-semibold hover:border-[var(--studio-teal)]"
    >
      <span className="relative block aspect-video bg-[var(--studio-fill)]">
        {src && kind === "video" ? (
          <video src={src} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-1 text-center text-[9px] font-semibold leading-tight text-[var(--studio-muted)]">
            {busy ? "…" : t("video.layers.unset")}
          </span>
        )}
      </span>
      <span className="bg-white px-1.5 py-1">{label}</span>
    </button>
  );
}
