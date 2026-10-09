"use client";

import { useState } from "react";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import {
  MAX_CHARACTER_REFERENCES,
  imageFilesFromList,
} from "@/service/character/reference-urls";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Multi-photo drop zone for the create-character dialog.
export function CreateCharacterReferences({
  urls,
  disabled,
  onChange,
  onError,
  onOpenCamera,
}: {
  urls: string[];
  disabled: boolean;
  onChange: (urls: string[]) => void;
  onError: (message: string) => void;
  // Opens the guided camera dialog; the parent owns it so the coverage panel can open it too.
  onOpenCamera?: () => void;
}) {
  const { t } = useI18n();
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
          onError(translateAppError(result.error, t));
          break;
        }
        if (!next.includes(result.url)) next.push(result.url);
      }
      onChange(next);
    } catch {
      onError(t("characters.referencesUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">
        {t("characters.referencesTitle", { max: MAX_CHARACTER_REFERENCES })}
      </span>
      <p className="mb-2 text-xs text-muted">{t("characters.referencesHint")}</p>
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
          dragOver ? "border-accent bg-accent/5" : "border-accent-ink/15 bg-paper"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {urls.map((url, index) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={t("characters.referenceAlt", { n: index + 1 })}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl border border-accent-ink/10 object-cover"
              />
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onChange(urls.filter((item) => item !== url))}
                aria-label={t("characters.removeReferenceAria", { n: index + 1 })}
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-accent-ink text-[11px] font-bold text-paper disabled:opacity-60"
              >
                ×
              </button>
            </div>
          ))}
          {full ? null : (
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5">
              {uploading ? <Spinner /> : null}
              {uploading
                ? t("video.upload.uploading")
                : urls.length
                  ? t("characters.addMorePhotos")
                  : t("characters.chooseOrDropPhotos")}
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
          {full || !onOpenCamera ? null : (
            <button
              type="button"
              onClick={onOpenCamera}
              disabled={blocked}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-accent-ink/15 bg-paper px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              <CameraIcon />
              {t("characters.useCamera")}
            </button>
          )}
        </div>
      </div>
      {/* What to shoot so the blueprint has a face, a profile, and a body to work from. */}
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <li>{t("characters.referenceGuideFront")}</li>
        <li>{t("characters.referenceGuideSide")}</li>
        <li>{t("characters.referenceGuideFull")}</li>
        <li>{t("characters.referenceGuideLight")}</li>
      </ul>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 7.5A1.5 1.5 0 0 1 4.5 6h2l1-1.5h5l1 1.5h2A1.5 1.5 0 0 1 17 7.5v7A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="11" r="2.75" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
