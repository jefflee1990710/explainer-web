"use client";

import { useState } from "react";
import { BookendVideoDialog } from "@/presentation/components/app/projects/new/bookend-video-dialog";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import type { BookendClip, VideoEdit } from "@/model/video-edit";
import type { BookendPick } from "@/service/video-edit/edit-state";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/quicktime`;

// Layer list (top of stack first) plus intro / outro slots.
export function VideoEditLayers({
  edit,
  selected,
  busy,
  onSelect,
  onAddLayer,
  onRemoveLayer,
  onMoveLayer,
  onSetBookend,
  onRemoveBookend,
  onError,
}: {
  edit: VideoEdit;
  selected: EditSelection;
  busy: boolean;
  onSelect: (id: EditSelection) => void;
  onAddLayer: (url: string) => void;
  onRemoveLayer: (id: string) => void;
  onMoveLayer: (id: string, delta: -1 | 1) => void;
  onSetBookend: (
    slot: "intro" | "outro",
    asset: { url: string; kind: "image" | "video"; durationSec?: number },
  ) => void;
  onRemoveBookend: (slot: "intro" | "outro") => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const topFirst = [...edit.layers].reverse();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{t("video.layers.title")}</h3>
        <BrandUploadButton
          label={t("video.layers.addImage")}
          accept={IMAGE_ACCEPT}
          disabled={busy}
          onUploaded={(asset) => onAddLayer(asset.url)}
          onError={onError}
        />
      </div>
      {topFirst.length === 0 ? (
        <p className="text-xs text-[var(--studio-muted)]">{t("video.layers.emptyHint")}</p>
      ) : (
        <ul className="space-y-1">
          {topFirst.map((layer, i) => (
            <li
              key={layer.id}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${selected === layer.id ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)] bg-white"}`}
            >
              <button type="button" onClick={() => onSelect(layer.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={layer.assetUrl} alt="" className="h-7 w-7 rounded object-contain bg-[var(--studio-fill)]" />
                <span className="truncate">{t("video.layers.layerName", { n: topFirst.length - i })}</span>
              </button>
              <button type="button" aria-label={t("video.layers.moveUpAria")} disabled={i === 0} onClick={() => onMoveLayer(layer.id, 1)} className="px-1 disabled:opacity-30">↑</button>
              <button type="button" aria-label={t("video.layers.moveDownAria")} disabled={i === topFirst.length - 1} onClick={() => onMoveLayer(layer.id, -1)} className="px-1 disabled:opacity-30">↓</button>
              <button type="button" aria-label={t("video.layers.deleteAria")} onClick={() => onRemoveLayer(layer.id)} className="px-1 text-[#e11d48]">✕</button>
            </li>
          ))}
        </ul>
      )}
      {(["intro", "outro"] as const).map((slot) => (
        <BookendRow
          key={slot}
          slot={slot}
          label={slot === "intro" ? t("video.layers.intro") : t("video.layers.outro")}
          clip={edit[slot]}
          active={selected === slot}
          busy={busy}
          onSelect={() => onSelect(slot)}
          onUploaded={(asset) => onSetBookend(slot, asset)}
          onRemove={() => onRemoveBookend(slot)}
          onError={onError}
        />
      ))}
    </section>
  );
}

function BookendRow({
  slot, label, clip, active, busy, onSelect, onUploaded, onRemove, onError,
}: {
  slot: "intro" | "outro";
  label: string;
  clip?: BookendClip;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
  onUploaded: (asset: { url: string; kind: "image" | "video"; durationSec?: number }) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);

  function choose(pick: BookendPick) {
    onUploaded({ url: pick.videoUrl, kind: "video", durationSec: pick.durationSec });
    setPicking(false);
  }

  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${active ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)] bg-white"}`}>
      <button type="button" onClick={onSelect} disabled={!clip} className="min-w-0 flex-1 cursor-pointer text-left font-semibold disabled:cursor-default">
        {label}
        <span className="ml-1 font-normal text-[var(--studio-muted)]">
          {clip
            ? clip.kind === "video"
              ? t("video.layers.kindVideo")
              : t("video.layers.kindImageDuration", { sec: clip.durationSec })
            : t("video.layers.unset")}
        </span>
      </button>
      <BrandUploadButton
        icon
        label={clip ? t("video.layers.replace") : t("video.layers.upload")}
        accept={MEDIA_ACCEPT}
        disabled={busy}
        onUploaded={onUploaded}
        onError={onError}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => setPicking(true)}
        className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-[var(--studio-fill)] px-2.5 text-xs font-semibold text-[var(--studio-ink)] hover:bg-[#e7e8eb] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("video.layers.select")}
      </button>
      {clip ? (
        <button
          type="button"
          aria-label={t("video.layers.removeBookendAria", { label })}
          onClick={onRemove}
          className="px-1 text-[#e11d48]"
        >
          ✕
        </button>
      ) : null}
      {picking ? <BookendVideoDialog slot={slot} onSelect={choose} onClose={() => setPicking(false)} /> : null}
    </div>
  );
}
