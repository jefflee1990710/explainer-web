"use client";

import { motion } from "framer-motion";
import type { AspectRatio } from "@/model/project";

const RATIOS: Array<{
  id: AspectRatio;
  label: string;
  hint: string;
  // Preview box dimensions in px (kept small, same visual weight).
  w: number;
  h: number;
}> = [
  { id: "9:16", label: "9:16", hint: "Reels / Shorts", w: 22, h: 38 },
  { id: "16:9", label: "16:9", hint: "YouTube / 簡報", w: 38, h: 22 },
  { id: "1:1", label: "1:1", hint: "IG / 廣告", w: 30, h: 30 },
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
  return (
    <div role="radiogroup" aria-label="畫面比例" className="grid grid-cols-3 gap-3">
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
            <span className="font-display text-sm font-bold">{ratio.label}</span>
            <span className="text-xs text-muted">{ratio.hint}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
