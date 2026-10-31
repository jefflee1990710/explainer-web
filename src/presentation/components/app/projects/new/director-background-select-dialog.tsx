"use client";

import { useEffect, useId } from "react";
import type { DirectorPresetBackground } from "@/model/director";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MAX_BACKGROUND_IMAGES } from "@/service/project/background-images";

const BACKGROUND_ACCEPT = "image/png,image/jpeg,image/webp";

export function localizedDirectorBackground(
  bg: DirectorPresetBackground,
  locale: string,
) {
  if (locale === "zh-Hans") {
    return {
      name: bg.nameZhHans || bg.nameZhHant,
      description: bg.descriptionZhHant,
    };
  }
  if (locale === "en") {
    return {
      name: bg.nameEn,
      description: bg.descriptionEn,
    };
  }
  return {
    name: bg.nameZhHant,
    description: bg.descriptionZhHant,
  };
}

// Popup modal dialog for choosing a preset background or uploading custom reference images.
export function DirectorBackgroundSelectDialog({
  presets,
  selectedId,
  customUrls,
  allowsUpload,
  onSelectPreset,
  onChangeCustomUrls,
  onError,
  onClose,
}: {
  presets: readonly DirectorPresetBackground[];
  selectedId: string;
  customUrls: string[];
  allowsUpload: boolean;
  onSelectPreset: (id: string) => void;
  onChangeCustomUrls: (urls: string[]) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const titleId = useId();
  const isEn = locale === "en";
  const hasCustom = customUrls.length > 0;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/50 p-4"
      onClick={onClose}
      zIndex={150}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border-2 border-accent-ink bg-paper shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {isEn ? "Choose Collage Background" : "選擇剪紙拼貼背景底板"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Pick a preset surface texture or upload your own reference background image."
                : "選擇預設底板材質（預設為木紋底板），或上傳自訂背景參考圖。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close" : "關閉"}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-accent-ink/15 text-sm font-bold text-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Preset Grid */}
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-muted">
              {isEn ? "Preset Surfaces" : "預設底板材質"}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => {
                const copy = localizedDirectorBackground(preset, locale);
                const active = !hasCustom && preset.id === selectedId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (hasCustom) onChangeCustomUrls([]);
                      onSelectPreset(preset.id);
                      onClose();
                    }}
                    className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition ${
                      active
                        ? "border-accent-ink bg-accent-ink text-paper shadow-[4px_4px_0_0_rgba(18,20,28,0.2)]"
                        : "border-accent-ink/15 bg-white hover:border-accent-ink/40"
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden border-b border-accent-ink/10 bg-[var(--studio-fill)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.previewUrl}
                        alt={copy.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {active ? (
                        <span className="absolute top-2 right-2 rounded-full bg-accent-ink/90 px-2.5 py-0.5 text-[10px] font-bold text-paper shadow-sm">
                          ✓ {isEn ? "Selected" : "已選擇"}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-3">
                      <div>
                        <span className="block truncate font-display text-sm font-bold">
                          {copy.name}
                        </span>
                        <span
                          className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                            active ? "text-paper/80" : "text-muted"
                          }`}
                        >
                          {copy.description}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom Reference Image Upload */}
          {allowsUpload ? (
            <section className="rounded-2xl border border-accent-ink/15 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isEn ? "Custom Background Reference Image" : "自訂背景參考圖（選填）"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {isEn
                      ? `Upload up to ${MAX_BACKGROUND_IMAGES} reference image(s) to override the preset surface.`
                      : `上傳最多 ${MAX_BACKGROUND_IMAGES} 張背景參考圖，將自動覆蓋上方預設材質。`}
                  </p>
                </div>
                {customUrls.length < MAX_BACKGROUND_IMAGES ? (
                  <BrandUploadButton
                    label={isEn ? "Upload Background Image" : "上傳背景圖片"}
                    accept={BACKGROUND_ACCEPT}
                    onUploaded={(asset) => {
                      if (asset.kind !== "image") return;
                      const next =
                        customUrls.length >= MAX_BACKGROUND_IMAGES ||
                        customUrls.includes(asset.url)
                          ? customUrls
                          : [...customUrls, asset.url];
                      onChangeCustomUrls(next);
                    }}
                    onError={onError}
                  />
                ) : null}
              </div>

              {customUrls.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-3">
                  {customUrls.map((url, index) => (
                    <li key={`${index}-${url}`} className="w-32">
                      <span className="relative block aspect-video w-full overflow-hidden rounded-xl border-2 border-accent-ink bg-[var(--studio-fill)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Custom background ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeCustomUrls(customUrls.filter((_, item) => item !== index))
                        }
                        className="mt-1 inline-flex min-h-7 cursor-pointer items-center rounded-md px-2 text-xs font-semibold text-muted transition hover:text-foreground"
                      >
                        {isEn ? "Remove" : "移除"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-accent-ink/10 bg-paper/90 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-full bg-accent-ink px-5 py-2 text-xs font-bold text-paper transition hover:opacity-90"
          >
            {isEn ? "Done" : "確認選擇"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
