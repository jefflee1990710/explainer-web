"use client";

import { useState } from "react";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { Spinner } from "@/presentation/components/spinner";
import {
  MAX_CHARACTER_REFERENCES,
  imageFilesFromList,
} from "@/service/character/reference-urls";

// Multi-photo drop zone for the create-character dialog.
export function CreateCharacterReferences({
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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const remaining = MAX_CHARACTER_REFERENCES - urls.length;
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
          onError(result.error);
          break;
        }
        if (!next.includes(result.url)) next.push(result.url);
      }
      onChange(next);
    } catch {
      onError("上傳失敗，請再試一次");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">
        參考圖（選填，最多 {MAX_CHARACTER_REFERENCES} 張）
      </span>
      <p className="mb-2 text-xs text-muted">
        拖放或選擇多張臉、全身、服裝照，藍圖會更像本人。
      </p>
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
          dragOver
            ? "border-accent bg-accent/5"
            : "border-accent-ink/15 bg-paper"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {urls.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`參考圖 ${index + 1}`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl border border-accent-ink/10 object-cover"
              />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onChange(urls.filter((item) => item !== url))}
                aria-label={`移除參考圖 ${index + 1}`}
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-accent-ink text-[11px] font-bold text-paper disabled:opacity-60"
              >
                ×
              </button>
            </div>
          ))}
          {full ? null : (
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5">
              {uploading ? <Spinner /> : null}
              {uploading ? "上傳中…" : urls.length ? "再加圖片" : "選擇或拖放圖片"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={blocked}
                onChange={(event) => {
                  const files = [...(event.target.files || [])];
                  event.target.value = "";
                  if (files.length) void addFiles(files);
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
