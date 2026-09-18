"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n-provider";
import { localizedStyleDescription, localizedStyleName } from "@/lib/style-i18n";
import type { PublicStyle } from "@/lib/serialize";

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
            className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-accent-ink bg-accent-ink text-paper"
                : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
            }`}
          >
            {/* Preview area: generated image, or a canvas-coloured placeholder. */}
            <div
              className="relative aspect-video w-full"
              style={{ backgroundColor: style.canvasColor }}
            >
              {style.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={style.previewUrl}
                  // Decorative: the card already shows the style name.
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center font-display text-sm font-bold text-accent-ink/60">
                  {styleName}
                </span>
              )}
            </div>
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold">{styleName}</p>
              <p className={`mt-0.5 text-xs leading-5 ${active ? "text-paper/75" : "text-muted"}`}>
                {styleDescription}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
