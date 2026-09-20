"use client";

import { motion } from "framer-motion";
import { SCENE_TEXT_IDS, SCENE_TEXT_PRESETS } from "@/lib/director/scene-text";
import type { SceneTextLanguage } from "@/types/project";

const TOGGLES = [
  { id: true, label: "開啟", hint: "畫面可有短標籤" },
  { id: false, label: "關閉", hint: "畫面完全無字" },
] as const;

// Enable/disable on-canvas labels; language only appears when enabled.
export function SceneTextPicker({
  enabled,
  language,
  onEnabledChange,
  onLanguageChange,
  disabled,
}: {
  enabled: boolean;
  language: SceneTextLanguage;
  onEnabledChange: (value: boolean) => void;
  onLanguageChange: (value: SceneTextLanguage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="畫面文字"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-accent-ink/10 bg-paper/70 p-1"
      >
        {TOGGLES.map((item) => {
          const active = item.id === enabled;
          return (
            <button
              key={String(item.id)}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onEnabledChange(item.id)}
              className={`relative min-h-[56px] cursor-pointer rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? "text-paper" : "text-foreground hover:bg-accent-ink/5"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="scene-text-enabled-highlight"
                  className="absolute inset-0 rounded-xl bg-accent-ink shadow-[3px_3px_0_0_rgba(255,77,46,0.9)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <span className="relative block font-display text-sm font-bold">
                {item.label}
              </span>
              <span className={`relative block text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {enabled ? (
        <div
          role="radiogroup"
          aria-label="畫面文字語言"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-accent-ink/10 bg-paper/70 p-1"
        >
          {SCENE_TEXT_IDS.map((id) => {
            const preset = SCENE_TEXT_PRESETS[id];
            const active = id === language;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onLanguageChange(id)}
                className={`relative min-h-[56px] cursor-pointer rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
                  active ? "text-paper" : "text-foreground hover:bg-accent-ink/5"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="scene-text-language-highlight"
                    className="absolute inset-0 rounded-xl bg-accent-ink shadow-[3px_3px_0_0_rgba(255,77,46,0.9)]"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <span className="relative block font-display text-sm font-bold">
                  {preset.label}
                </span>
                <span className={`relative block text-xs ${active ? "text-paper/75" : "text-muted"}`}>
                  {preset.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
