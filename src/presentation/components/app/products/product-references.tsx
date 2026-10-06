"use client";

import { useState } from "react";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { MAX_PRODUCT_REFERENCES } from "@/model/product-constants";
import { imageFilesFromList } from "@/service/character/reference-urls";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Multi-photo drop zone for one real product.
export function ProductReferences({
  urls,
  disabled,
  onChange,
  onError,
}: {
  urls: string[];
  disabled: boolean;
  onChange: (urls: string[]) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const remaining = MAX_PRODUCT_REFERENCES - urls.length;
  const full = remaining <= 0;
  const blocked = disabled || uploading || full;

  async function addFiles(files: File[]) {
    const picked = imageFilesFromList(files, remaining);
    if (picked.length === 0) return;
    setUploading(true);
    onError("");
    const next = [...urls];
    try {
      for (const file of picked) {
        const data = new FormData();
        data.set("file", file);
        const result = await uploadCharacterImageAction(data);
        if (!result.ok) {
          onError(translateAppError(result.error, t));
          break;
        }
        if (!next.includes(result.url)) next.push(result.url);
      }
      onChange(next);
    } catch {
      onError(t("products.error.photos"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">{t("products.photos")}</span>
      <p className="mb-2 text-xs text-muted">{t("products.photosHint", { max: MAX_PRODUCT_REFERENCES })}</p>
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!blocked) setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = blocked ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (blocked) return;
          void addFiles([...event.dataTransfer.files]);
        }}
        className={`rounded-2xl border-2 border-dashed px-4 py-4 transition ${
          dragOver ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)]" : "border-[var(--studio-line)]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {urls.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={t("products.photoAlt", { n: index + 1 })} className="h-16 w-16 rounded-xl object-cover" />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onChange(urls.filter((item) => item !== url))}
                aria-label={t("products.removePhoto", { n: index + 1 })}
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-[var(--studio-ink)] text-[11px] font-bold text-white"
              >
                ×
              </button>
            </div>
          ))}
          {full ? null : (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--studio-line)] px-4 text-sm font-semibold">
              {uploading ? <Spinner className="h-4 w-4" /> : null}
              {urls.length ? t("products.addPhotos") : t("products.dropPhotos")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={blocked}
                onChange={(event) => {
                  const files = [...(event.target.files || [])];
                  event.target.value = "";
                  void addFiles(files);
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
