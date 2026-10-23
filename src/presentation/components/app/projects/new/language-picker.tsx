"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LANGUAGE_IDS } from "@/service/director/languages";
import { voLanguageLabel } from "@/util/i18n/picker-labels";
import type { VoLanguage } from "@/model/project";

const PRIMARY_VO_LANGUAGES: readonly VoLanguage[] = ["en", "yue", "zh", "ja", "ko"];

// Segmented / expandable grid control for voiceover language with a sliding highlight.
export function LanguagePicker({
  value,
  onChange,
  disabled,
  dialogueOnly = false,
}: {
  value: VoLanguage;
  onChange: (value: VoLanguage) => void;
  disabled?: boolean;
  dialogueOnly?: boolean;
}) {
  const { t, locale } = useI18n();
  const isSelectedExtra = !PRIMARY_VO_LANGUAGES.includes(value);
  const [showAll, setShowAll] = useState(isSelectedExtra);

  const visibleIds = showAll
    ? LANGUAGE_IDS
    : isSelectedExtra
      ? [...PRIMARY_VO_LANGUAGES, value]
      : PRIMARY_VO_LANGUAGES;
  const hiddenCount = LANGUAGE_IDS.length - PRIMARY_VO_LANGUAGES.length;

  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label={
          dialogueOnly
            ? t("brief.language.ariaDialogue")
            : t("brief.language.ariaNarration")
        }
        className="grid grid-cols-2 gap-1 rounded-2xl border border-accent-ink/10 bg-paper/70 p-1 sm:grid-cols-3"
      >
        {visibleIds.map((id) => {
          const preset = voLanguageLabel(t, id);
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={`relative min-h-[54px] cursor-pointer rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? "text-paper" : "text-foreground hover:bg-accent-ink/5"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="language-highlight"
                  className="absolute inset-0 rounded-xl bg-accent-ink shadow-[3px_3px_0_0_rgba(255,77,46,0.9)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <span className="relative block truncate font-display text-sm font-bold">
                {preset.label}
              </span>
              <span
                className={`relative block truncate text-xs ${
                  active ? "text-paper/75" : "text-muted"
                }`}
              >
                {preset.sublabel}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setShowAll((prev) => !prev)}
        className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-muted transition hover:text-accent-ink"
      >
        {showAll
          ? locale.startsWith("zh")
            ? "收起其他語言 ↑"
            : "Show fewer languages ↑"
          : locale.startsWith("zh")
            ? `+ 展開更多語言（共 ${LANGUAGE_IDS.length} 種，另有 ${hiddenCount} 種） ↓`
            : `+ More languages (${hiddenCount} more) ↓`}
      </button>
    </div>
  );
}
