"use client";

import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import type { EditSelection } from "@/presentation/components/app/projects/new/video-edit-preview";
import type { BookendClip, VideoEdit } from "@/model/video-edit";

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
  onSetBookend: (slot: "intro" | "outro", asset: { url: string; kind: "image" | "video" }) => void;
  onRemoveBookend: (slot: "intro" | "outro") => void;
  onError: (message: string) => void;
}) {
  const topFirst = [...edit.layers].reverse();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">圖層</h3>
        <BrandUploadButton label="＋ 圖片／Logo" accept={IMAGE_ACCEPT} disabled={busy} onUploaded={(asset) => onAddLayer(asset.url)} onError={onError} />
      </div>
      {topFirst.length === 0 ? (
        <p className="text-xs text-[var(--studio-muted)]">加一張 logo 或圖片，會疊在整支正片上。</p>
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
                <span className="truncate">圖層 {topFirst.length - i}</span>
              </button>
              <button type="button" aria-label="上移" disabled={i === 0} onClick={() => onMoveLayer(layer.id, 1)} className="px-1 disabled:opacity-30">↑</button>
              <button type="button" aria-label="下移" disabled={i === topFirst.length - 1} onClick={() => onMoveLayer(layer.id, -1)} className="px-1 disabled:opacity-30">↓</button>
              <button type="button" aria-label="刪除圖層" onClick={() => onRemoveLayer(layer.id)} className="px-1 text-[#e11d48]">✕</button>
            </li>
          ))}
        </ul>
      )}
      {(["intro", "outro"] as const).map((slot) => (
        <BookendRow
          key={slot}
          label={slot === "intro" ? "開頭" : "結尾"}
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
  label, clip, active, busy, onSelect, onUploaded, onRemove, onError,
}: {
  label: string;
  clip?: BookendClip;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
  onUploaded: (asset: { url: string; kind: "image" | "video" }) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${active ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)] bg-white"}`}>
      <button type="button" onClick={onSelect} disabled={!clip} className="min-w-0 flex-1 cursor-pointer text-left font-semibold disabled:cursor-default">
        {label}
        <span className="ml-1 font-normal text-[var(--studio-muted)]">
          {clip ? (clip.kind === "video" ? "影片" : `圖片 · ${clip.durationSec} 秒`) : "未設定"}
        </span>
      </button>
      <BrandUploadButton label={clip ? "替換" : "上傳"} accept={MEDIA_ACCEPT} disabled={busy} onUploaded={onUploaded} onError={onError} />
      {clip ? <button type="button" aria-label={`移除${label}`} onClick={onRemove} className="px-1 text-[#e11d48]">✕</button> : null}
    </div>
  );
}
