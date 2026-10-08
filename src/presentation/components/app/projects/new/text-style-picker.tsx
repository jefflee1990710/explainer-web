"use client";

import { SUBTITLE_LOOKS } from "@/service/director/subtitle-look";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicTextStyle } from "@/presentation/serialize";
import { subtitleLookLabel } from "@/util/i18n/picker-labels";

// Lettering only. Where the subtitle sits still comes from the director.
export function TextStylePicker({
  value,
  styles,
  onChange,
  disabled,
}: {
  value: string;
  styles: PublicTextStyle[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("brief.section04.lookAria")}>
      {SUBTITLE_LOOKS.map((id) => {
        const preset = subtitleLookLabel(t, id);
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`cursor-pointer rounded-xl border px-2 py-3 text-left text-xs disabled:opacity-60 ${
              selected ? "border-accent-ink bg-accent/10" : "border-accent-ink/15 bg-white"
            }`}
          >
            <span className="block font-semibold">{preset.label}</span>
            <span className="mt-1 block text-[11px] text-muted">{preset.sublabel}</span>
          </button>
        );
      })}
      {styles.map((style) => {
        const selected = value === style.id;
        return (
          <button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(style.id)}
            className={`cursor-pointer overflow-hidden rounded-xl border text-left text-xs disabled:opacity-60 ${
              selected ? "border-accent-ink" : "border-accent-ink/15"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={style.imageUrl} alt="" className="aspect-video w-full bg-paper object-contain" />
            <span className="block truncate px-2 py-2 font-semibold">{style.name}</span>
          </button>
        );
      })}
    </div>
  );
}
