"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { AspectRatio } from "@/model/project";

const RATIOS: Array<{
  id: AspectRatio;
  hintKey: "9_16" | "16_9" | "1_1";
  w: number;
  h: number;
}> = [
  { id: "9:16", hintKey: "9_16", w: 22, h: 38 },
  { id: "16:9", hintKey: "16_9", w: 38, h: 22 },
  { id: "1:1", hintKey: "1_1", w: 30, h: 30 },
];

// Visual ratio cards so users pick by shape, not by numbers alone.
export function AspectRatioPicker({
  value,
  onChange,
  disabled,
}: {
  value: AspectRatio | "";
  onChange: (value: AspectRatio) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("brief.aspectRatio.aria")} className="grid grid-cols-3 gap-3">
      {RATIOS.map((ratio) => {
        const active = ratio.id === value;
        return (
          <motion.button
            key={ratio.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(ratio.id)}
            whileTap={{ scale: 0.97 }}
            className={`flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-accent-ink bg-lime/70 shadow-[4px_4px_0_0_#12141c]"
                : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
            }`}
          >
            <span
              aria-hidden
              className={`rounded-sm border-2 ${
                active ? "border-accent-ink bg-paper" : "border-accent-ink/50"
              }`}
              style={{ width: ratio.w, height: ratio.h }}
            />
            <span className="font-display text-sm font-bold">{ratio.id}</span>
            <span className="text-xs text-muted">{t(`brief.aspectRatioHints.${ratio.hintKey}`)}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
