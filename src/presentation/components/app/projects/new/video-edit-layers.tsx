"use client";

import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import type { VideoEdit } from "@/model/video-edit";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

// Layer list only. Cover / intro / outro are set from the timeline cards.
export function VideoEditLayers({
  edit,
  selected,
  busy,
  onSelect,
  onAddLayer,
  onRemoveLayer,
  onMoveLayer,
  onError,
}: {
  edit: VideoEdit;
  selected: EditSelection;
  busy: boolean;
  onSelect: (id: EditSelection) => void;
  onAddLayer: (url: string) => void;
  onRemoveLayer: (id: string) => void;
  onMoveLayer: (id: string, delta: -1 | 1) => void;
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
    </section>
  );
}
