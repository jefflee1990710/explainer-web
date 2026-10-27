"use client";

import { useId } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  defaultWardrobeColorForOption,
  normalizeWardrobeHexColor,
  RECOMMENDED_WARDROBE_COLORS,
  type CharacterWardrobeColorPicks,
} from "@/service/character/wardrobe-colors";
import type { CharacterWardrobePart } from "@/service/character/character-look";

// Per-part hex picker with catalog default + recommended swatches.
export function WardrobePartColorPicker({
  part,
  optionId,
  customPrompt,
  value,
  inheritedColor,
  disabled,
  onChange,
  compact,
}: {
  part: CharacterWardrobePart;
  optionId: string;
  customPrompt?: string;
  value: CharacterWardrobeColorPicks;
  /** Color already baked into the character version prompt, if any. */
  inheritedColor?: string;
  disabled?: boolean;
  onChange: (next: CharacterWardrobeColorPicks) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const defaultHex = defaultWardrobeColorForOption(part, optionId, customPrompt);
  const inherited = normalizeWardrobeHexColor(inheritedColor);
  const effective =
    normalizeWardrobeHexColor(value[part]) ?? inherited ?? defaultHex;
  const isOverride = effective !== defaultHex;
  const recommended = RECOMMENDED_WARDROBE_COLORS[part];

  function setHex(hex: string | null) {
    const normalized = normalizeWardrobeHexColor(hex);
    const next = { ...value };
    if (!normalized || normalized === defaultHex) {
      delete next[part];
    } else {
      next[part] = normalized;
    }
    onChange(next);
  }

  function resetToDefault() {
    setHex(defaultHex);
  }

  return (
    <div
      className={`min-w-0 max-w-full rounded-xl border border-accent-ink/10 bg-paper/80 ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-[10px] font-semibold text-muted">
          {t("wardrobe.partColorLabel")}
        </label>
        <span className="font-mono text-[10px] text-muted">{effective}</span>
        {isOverride ? (
          <button
            type="button"
            disabled={disabled}
            onClick={resetToDefault}
            className="cursor-pointer text-[10px] font-semibold text-accent hover:underline disabled:opacity-50"
          >
            {t("wardrobe.partColorReset")}
          </button>
        ) : (
          <span className="text-[10px] text-muted">{t("wardrobe.partColorDefault")}</span>
        )}
      </div>
      {/* Suggested swatches stay on one line. A narrow column scrolls sideways. */}
      <div className="mt-1.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto overflow-y-hidden">
        <input
          id={inputId}
          type="color"
          disabled={disabled}
          value={effective.toLowerCase()}
          onChange={(event) => setHex(event.target.value)}
          aria-label={t("wardrobe.partColorPickerAria", { part: t(`characters.look.${part}`) })}
          className="h-8 w-10 shrink-0 cursor-pointer rounded border border-accent-ink/15 bg-paper disabled:cursor-not-allowed disabled:opacity-60"
        />
        {recommended.map((hex) => {
          const active = effective === hex;
          return (
            <button
              key={hex}
              type="button"
              disabled={disabled}
              title={hex}
              aria-label={hex}
              aria-pressed={active}
              onClick={() => setHex(hex)}
              className={`h-7 w-7 shrink-0 cursor-pointer rounded-md border-2 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? "border-accent-ink shadow-[1px_1px_0_0_#12141c]" : "border-accent-ink/15 hover:border-accent-ink/40"
              }`}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
    </div>
  );
}
