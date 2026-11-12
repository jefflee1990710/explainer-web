"use client";

import Image from "next/image";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  SYSTEM_TEXT_STYLE_ORDER,
  systemTextStylePreview,
  type SubtitleLook,
} from "@/service/director/subtitle-look";

// Artistic lettering looks for a new explainer. The chosen id is onScreenTextStyleId.
export function ExplainerArtisticFontGrid({
  selectedStyleId,
  onStyleIdChange,
  disabled,
}: {
  selectedStyleId: string;
  onStyleIdChange: (styleId: string) => void;
  disabled?: boolean;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--studio-muted)]">
          {isEn ? "Artistic font" : "AI 藝術字"}
        </span>
        <span className="text-xs text-[var(--studio-muted)]">
          {SYSTEM_TEXT_STYLE_ORDER.length} {isEn ? "styles" : "款"}
        </span>
      </div>
      <div
        className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 ${
          disabled ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {SYSTEM_TEXT_STYLE_ORDER.map((styleId) => {
          const isSelected = selectedStyleId === styleId;
          const previewSrc = systemTextStylePreview(styleId as SubtitleLook);
          const styleName =
            t(`pickers.subtitleLook.${styleId}.label` as Parameters<typeof t>[0]) || styleId;
          const sublabel =
            t(`pickers.subtitleLook.${styleId}.sublabel` as Parameters<typeof t>[0]) || "";

          return (
            <button
              key={styleId}
              type="button"
              onClick={() => onStyleIdChange(styleId)}
              disabled={disabled}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition duration-150 ${
                isSelected
                  ? "border-[var(--studio-teal)] bg-[var(--studio-fill)] ring-2 ring-[var(--studio-teal)]/40"
                  : "border-[var(--studio-line)] bg-[var(--studio-canvas)] hover:border-[var(--studio-muted)]"
              }`}
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
                <Image
                  src={previewSrc}
                  alt={styleName}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition duration-200 group-hover:scale-105"
                />
                {isSelected ? (
                  <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--studio-teal)] text-black">
                    <svg
                      className="h-2.5 w-2.5"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                    </svg>
                  </div>
                ) : null}
              </div>
              <div className="p-2">
                <div className="truncate text-xs font-bold text-[var(--studio-ink)]">{styleName}</div>
                <div className="truncate text-[10px] text-[var(--studio-muted)]">{sublabel}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
