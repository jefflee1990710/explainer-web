"use client";

import { useI18n } from "@/presentation/components/i18n-provider";
import type { CoverSafeArea } from "@/model/project";

// Kept here so this client file does not import the project model at runtime.
const COVER_SAFE_AREA_IDS = ["ig-reel", "tiktok", "youtube-shorts"] as const satisfies readonly CoverSafeArea[];

const LABEL_KEY: Record<CoverSafeArea, "igReel" | "tiktok" | "youtubeShorts"> = {
  "ig-reel": "igReel",
  tiktok: "tiktok",
  "youtube-shorts": "youtubeShorts",
};

// Checkboxes at the top of the cover dialog. Each one insets the generated still.
export function VideoEditCoverSafeAreas({
  selected,
  disabled,
  onToggle,
}: {
  selected: CoverSafeArea[];
  disabled: boolean;
  onToggle: (id: CoverSafeArea) => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="text-xs font-semibold">{t("video.cover.safeAreaLabel")}</legend>
      <p className="mt-0.5 text-[11px] text-[var(--studio-muted)]">{t("video.cover.safeAreaHint")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {COVER_SAFE_AREA_IDS.map((id) => {
          const key = LABEL_KEY[id];
          const checked = selected.includes(id);
          return (
            <label
              key={id}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] leading-4 ${
                checked
                  ? "border-[var(--studio-ink)] bg-[var(--studio-cyan-soft)]"
                  : "border-[var(--studio-line)] bg-white"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(id)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--studio-teal)]"
              />
              <span>
                <span className="font-semibold text-[var(--studio-ink)]">
                  {t(`video.cover.safeAreas.${key}.label`)}
                </span>
                <span className="mt-0.5 block text-[var(--studio-muted)]">
                  {t(`video.cover.safeAreas.${key}.hint`)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
