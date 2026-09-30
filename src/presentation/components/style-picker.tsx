"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { localizedStyleDescription, localizedStyleName } from "@/util/style-i18n";
import type { PublicStyle } from "@/presentation/serialize";

// Radio grid of visual styles with generated preview cards. Shared by the
// video form and the character modal. A missing preview falls back to a
// canvas-coloured block so creation is never blocked on the seed.
export function StylePicker({
  styles,
  value,
  onChange,
  disabled,
  label,
}: {
  styles: PublicStyle[];
  value: string;
  onChange: (id: PublicStyle["id"]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useI18n();
  const groupLabel = label ?? t("styles.label");

  return (
    <div role="radiogroup" aria-label={groupLabel} className="grid gap-3 sm:grid-cols-3">
      {styles.map((style) => {
        const active = style.id === value;
        const styleName = localizedStyleName(t, style.id);
        const styleDescription = localizedStyleDescription(t, style.id);

        return (
          <motion.button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(style.id)}
            whileTap={{ scale: 0.98 }}
            className={`style-option relative aspect-square cursor-pointer overflow-hidden rounded-2xl border text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? "border-[#12141c]" : "border-transparent"
            }`}
          >
            {/* Square preview. The studio pill rule would otherwise turn this button into a circle. */}
            <div className="absolute inset-0" style={{ backgroundColor: style.canvasColor }}>
              {style.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={style.previewUrl}
                  // Decorative: the card already shows the style name.
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold text-accent-ink/60">
                  {styleName}
                </span>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-[#12141c]/80 px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">{styleName}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/75">{styleDescription}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
