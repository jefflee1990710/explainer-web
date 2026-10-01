"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { DURATION_PRESETS } from "@/service/director/duration-presets";
import { durationPresetLabel } from "@/util/i18n/picker-labels";
import type { DurationPreset } from "@/model/project";

// Chip list for target length; each chip also states the clip budget.
export function DurationPicker({
  value,
  onChange,
  disabled,
}: {
  value: DurationPreset;
  onChange: (value: DurationPreset) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("brief.duration.aria")} className="grid gap-2 sm:grid-cols-2">
      {Object.values(DURATION_PRESETS).map((preset) => {
        const active = preset.id === value;
        const labels = durationPresetLabel(t, preset.id);
        return (
          <motion.button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(preset.id)}
            whileTap={{ scale: 0.98 }}
            className={`flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-accent-ink bg-accent-ink text-paper"
                : "border-accent-ink/10 bg-paper/70 hover:border-accent-ink/30"
            }`}
          >
            <span className="text-sm font-semibold">{labels.label}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                active ? "bg-lime text-accent-ink" : "bg-accent-ink/5 text-muted"
              }`}
            >
              {labels.hint}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
