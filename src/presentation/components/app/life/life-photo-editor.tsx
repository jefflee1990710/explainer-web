"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/presentation/components/analytics/track";
import { saveEditedLifeShotAction } from "@/presentation/actions/life";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import {
  buildLifePngFilename,
  downloadLifeBlob,
  downloadLifeShotAsPng,
} from "@/presentation/components/app/life/download-life-png";
import {
  LIFE_PHOTO_FILTERS,
  applyLifePhotoFilter,
  lifePhotoFilterById,
  type LifePhotoFilter,
} from "@/presentation/components/app/life/life-photo-filters";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicLifeShot } from "@/service/character/life";

const PREVIEW_MAX = 1000;
const THUMB_MAX = 120;

const GROUP_LABEL: Record<LifePhotoFilter["group"], string> = {
  basic: "基本",
  bw: "黑白",
  film: "底片",
};

// Draws the bitmap scaled so its longest side is at most `max` px and returns the pixels.
function scaledPixels(bitmap: ImageBitmap, max: number): ImageData {
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// Filters a copy of the pixels and returns them as a canvas.
function filteredCanvas(source: ImageData, filter: LifePhotoFilter, intensity: number) {
  const pixels = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  applyLifePhotoFilter(pixels.data, pixels.width, pixels.height, filter, intensity);
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext("2d")?.putImageData(pixels, 0, 0);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("匯出失敗"))), type, quality),
  );
}

// Image editor inside the Life shot dialog: film / B&W filters with intensity, compare, download, and save as a new photo.
export function LifePhotoEditor({
  shot,
  disabled,
  onSaved,
  onError,
}: {
  shot: PublicLifeShot;
  disabled?: boolean;
  onSaved: (shot: PublicLifeShot) => void;
  onError: (message: string) => void;
}) {
  const [filterId, setFilterId] = useState("original");
  const [intensity, setIntensity] = useState(100);
  const [comparing, setComparing] = useState(false);
  const [preview, setPreview] = useState<ImageData | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<"" | "download" | "save">("");
  const bitmapRef = useRef<ImageBitmap | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const filter = lifePhotoFilterById(filterId);
  const edited = filter.id !== "original" && intensity > 0;

  // Fetch as a blob so the canvas is never tainted, then build the preview and filter thumbnails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(shot.resultUrl);
      if (!response.ok) throw new Error("load failed");
      const bitmap = await createImageBitmap(await response.blob());
      if (cancelled) {
        bitmap.close();
        return;
      }
      bitmapRef.current = bitmap;
      const thumbSource = scaledPixels(bitmap, THUMB_MAX);
      const nextThumbs: Record<string, string> = {};
      for (const item of LIFE_PHOTO_FILTERS) {
        nextThumbs[item.id] = filteredCanvas(thumbSource, item, 1).toDataURL("image/jpeg", 0.8);
      }
      setThumbs(nextThumbs);
      setPreview(scaledPixels(bitmap, PREVIEW_MAX));
    })().catch(() => {
      if (!cancelled) setLoadFailed(true);
    });
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [shot.resultUrl]);

  // Redraw the preview canvas whenever the filter, intensity, or compare state changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview) return;
    canvas.width = preview.width;
    canvas.height = preview.height;
    const pixels = new ImageData(new Uint8ClampedArray(preview.data), preview.width, preview.height);
    if (!comparing) applyLifePhotoFilter(pixels.data, pixels.width, pixels.height, filter, intensity / 100);
    canvas.getContext("2d")?.putImageData(pixels, 0, 0);
  }, [preview, filter, intensity, comparing]);

  // Full-resolution filtered image.
  async function exportFiltered(type: string, quality?: number) {
    const bitmap = bitmapRef.current;
    if (!bitmap) throw new Error("圖片尚未載入");
    const full = scaledPixels(bitmap, Math.max(bitmap.width, bitmap.height));
    return canvasBlob(filteredCanvas(full, filter, intensity / 100), type, quality);
  }

  async function onDownload() {
    setBusy("download");
    try {
      const nameInput = { characterName: shot.characterName, place: shot.place, id: shot.id };
      if (!edited) {
        await downloadLifeShotAsPng({ url: shot.resultUrl, ...nameInput });
      } else {
        const blob = await exportFiltered("image/png");
        downloadLifeBlob(blob, buildLifePngFilename({ ...nameInput, place: `${shot.place}-${filter.label}` }));
      }
      track("life_photo_downloaded", { shotId: shot.id });
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "下載失敗，請再試一次");
    } finally {
      setBusy("");
    }
  }

  async function onSave() {
    if (!edited) return;
    setBusy("save");
    try {
      const blob = await exportFiltered("image/jpeg", 0.92);
      const data = new FormData();
      data.set("file", new File([blob], `life-${shot.id.slice(-6)}-${filter.id}.jpg`, { type: "image/jpeg" }));
      const uploaded = await uploadCharacterImageAction(data);
      if (!uploaded.ok || !uploaded.url) throw new Error(uploaded.ok ? "圖片上傳失敗" : uploaded.error);
      const saved = await saveEditedLifeShotAction({
        sourceShotId: shot.id,
        imageUrl: uploaded.url,
        filterLabel: filter.label,
      });
      if (!saved.ok) throw new Error(saved.error);
      track("life_photo_saved", { shotId: shot.id });
      onSaved(saved.shot);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "儲存失敗，請再試一次");
    } finally {
      setBusy("");
    }
  }

  const locked = disabled || busy !== "" || !preview;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto max-h-[52dvh] overflow-hidden rounded-xl border border-accent-ink/10 bg-zinc-900">
        {preview ? (
          <canvas
            ref={canvasRef}
            aria-label={shot.characterName}
            className="block max-h-[52dvh] w-auto max-w-full"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.resultUrl} alt={shot.characterName} className="max-h-[52dvh] w-auto object-contain" />
        )}
        {!preview && !loadFailed ? (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            <Spinner className="h-3 w-3" />
            載入編輯器...
          </span>
        ) : null}
        {comparing ? (
          <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
            原圖
          </span>
        ) : null}
      </div>

      {loadFailed ? (
        <p className="text-[11px] font-semibold text-red-600">無法載入圖片進行濾鏡編輯，仍可下載原圖。</p>
      ) : (
        <div className="space-y-2 rounded-xl border border-accent-ink/12 bg-paper p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-foreground">
              濾鏡 <span className="font-medium text-muted">· {filter.label}</span>
            </span>
            {edited ? (
              <button
                type="button"
                onPointerDown={() => setComparing(true)}
                onPointerUp={() => setComparing(false)}
                onPointerLeave={() => setComparing(false)}
                className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted select-none hover:text-foreground"
              >
                按住比較原圖
              </button>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {LIFE_PHOTO_FILTERS.map((item, index) => {
              const active = item.id === filterId;
              const newGroup = index > 0 && LIFE_PHOTO_FILTERS[index - 1].group !== item.group;
              return (
                <div key={item.id} className="flex shrink-0 items-end gap-2">
                  {newGroup ? (
                    <span className="mb-5 h-14 w-px bg-accent-ink/12" aria-hidden />
                  ) : null}
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setFilterId(item.id)}
                    title={`${GROUP_LABEL[item.group]} · ${item.label}`}
                    className="flex w-16 cursor-pointer flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span
                      className={`block h-20 w-14 overflow-hidden rounded-lg bg-zinc-200 ${
                        active ? "ring-2 ring-accent ring-offset-1" : "border border-accent-ink/10"
                      }`}
                    >
                      {thumbs[item.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[item.id]} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span
                      className={`w-full truncate text-center text-[10px] leading-tight ${
                        active ? "font-bold text-foreground" : "font-medium text-muted"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {filter.id !== "original" ? (
            <label className="flex items-center gap-2.5 text-[11px] font-semibold text-muted">
              強度
              <input
                type="range"
                min={0}
                max={100}
                value={intensity}
                disabled={locked}
                onChange={(event) => setIntensity(Number(event.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-accent"
              />
              <span className="w-8 text-right tabular-nums text-foreground">{intensity}%</span>
            </label>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || busy !== ""}
          onClick={() => void onDownload()}
          className="inline-flex cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === "download" ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
          {edited ? "下載濾鏡圖 (PNG)" : "下載原圖"}
        </button>
        {edited ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => void onSave()}
            className="inline-flex cursor-pointer items-center rounded-full bg-accent-ink px-3 py-1.5 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy === "save" ? <Spinner className="mr-1.5 h-3.5 w-3.5" /> : null}
            儲存為新照片
          </button>
        ) : null}
      </div>
    </div>
  );
}
