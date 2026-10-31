"use client";

import type { DirectorPresetBackground } from "@/model/director";
import {
  DirectorBackgroundSelectDialog,
  localizedDirectorBackground,
} from "@/presentation/components/app/projects/new/director-background-select-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";

// Trigger card + popup modal for directors with preset backgrounds (e.g., paper-cutout explainer).
export function DirectorBackgroundPicker({
  presets,
  selectedId,
  customUrls,
  allowsUpload,
  open,
  disabled,
  onOpenChange,
  onSelectPreset,
  onChangeCustomUrls,
  onError,
}: {
  presets: readonly DirectorPresetBackground[];
  selectedId: string;
  customUrls: string[];
  allowsUpload: boolean;
  open: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPreset: (id: string) => void;
  onChangeCustomUrls: (urls: string[]) => void;
  onError: (message: string) => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  if (presets.length === 0) return null;

  const selected = presets.find((bg) => bg.id === selectedId) ?? presets[0]!;
  const copy = localizedDirectorBackground(selected, locale);
  const hasCustom = customUrls.length > 0;
  const thumbSrc = hasCustom ? customUrls[0]! : selected.previewUrl;
  const displayTitle = hasCustom
    ? isEn
      ? `Custom Uploaded Background (${customUrls.length})`
      : `已上傳自訂背景圖（${customUrls.length} 張）`
    : copy.name;
  const displayDesc = hasCustom
    ? isEn
      ? "Using your uploaded reference image as the collage background surface."
      : "使用你上傳的參考圖片作為剪紙拼貼底板背景。"
    : copy.description;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {isEn ? "Collage Background Surface" : "剪紙拼貼背景底板"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {isEn
              ? "Click to switch preset surface or upload a custom background image."
              : "點擊切換預設底板材質（木紋、手造紙、工程藍圖、石屎地、辦公桌、藍天）或上傳自訂背景。"}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onOpenChange(true)}
        className="mt-2.5 flex w-full min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-accent-ink/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative block h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-accent-ink/10 bg-[var(--studio-fill)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbSrc} alt={displayTitle} className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {displayTitle}
          </span>
          <span className="mt-0.5 block line-clamp-1 text-xs text-muted">
            {displayDesc}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-accent-ink/20 bg-white px-3 py-1 text-xs font-bold text-foreground transition hover:bg-lime/30">
          {isEn ? "Change" : "更換背景"}
        </span>
      </button>

      {open ? (
        <DirectorBackgroundSelectDialog
          presets={presets}
          selectedId={selected.id}
          customUrls={customUrls}
          allowsUpload={allowsUpload}
          onSelectPreset={onSelectPreset}
          onChangeCustomUrls={onChangeCustomUrls}
          onError={onError}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </div>
  );
}
