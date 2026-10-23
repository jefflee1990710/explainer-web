"use client";

import { useState } from "react";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { CharacterLookDialog } from "@/presentation/components/app/characters/character-look-dialog";
import { useCustomWardrobeItems } from "@/presentation/components/app/characters/use-custom-wardrobe-items";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  CHARACTER_WARDROBE_PARTS,
  defaultCharacterLook,
  isExaggeratedLookOption,
  type CharacterWardrobePart,
  type CharacterWardrobePicks,
} from "@/service/character/character-look";

// Optional hair / top / pants / shoes / accessory picks for one life photo. Unpicked parts keep the preset look.
export function LifeWardrobePicker({
  value,
  disabled,
  onChange,
}: {
  value: CharacterWardrobePicks;
  disabled?: boolean;
  onChange: (next: CharacterWardrobePicks) => void;
}) {
  const { t, locale } = useI18n();
  const [dialogPart, setDialogPart] = useState<CharacterWardrobePart | null>(null);
  const { byOptionId } = useCustomWardrobeItems();
  const pickedCount = CHARACTER_WARDROBE_PARTS.filter((part) => value[part]).length;

  // Removes one part so it falls back to the character's preset.
  function clearPart(part: CharacterWardrobePart) {
    const next = { ...value };
    delete next[part];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CHARACTER_WARDROBE_PARTS.map((part) => {
          const pickedId = value[part];
          const thumbId = pickedId ?? defaultCharacterLook()[part] ?? "";
          const partLabel = t(`characters.look.${part}`);
          const customOption = pickedId?.startsWith("cw_") ? byOptionId.get(pickedId) : undefined;
          const pickedName = customOption
            ? locale === "en"
              ? customOption.name
              : customOption.nameZh || customOption.name
            : pickedId
              ? t(`characters.look.options.${part}.${pickedId}`)
              : "沿用預設";
          const extreme = pickedId && !customOption ? isExaggeratedLookOption(part, pickedId) : false;
          return (
            <div key={part} className="relative flex items-center">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setDialogPart(part)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition ${
                  pickedId
                    ? "border-accent bg-accent/8 shadow-[2px_2px_0_0_#12141c]"
                    : "border-accent-ink/10 bg-paper hover:border-accent-ink/30"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-200 ${
                    pickedId ? "" : "opacity-45 grayscale"
                  }`}
                >
                  <CharacterLookArt part={part} id={thumbId} />
                  {extreme ? (
                    <span className="absolute top-0.5 left-0.5 rounded bg-accent-ink px-1 py-0.2 text-[8px] font-extrabold text-paper">
                      !
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 pr-4">
                  <span className="block text-[10px] font-semibold text-muted">{partLabel}</span>
                  <span className={`block truncate text-xs ${pickedId ? "font-bold" : "font-medium text-muted"}`}>
                    {pickedName}
                  </span>
                </span>
              </button>
              {pickedId ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => clearPart(part)}
                  aria-label={`${partLabel} reset`}
                  className="absolute right-1.5 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-accent-ink/10 text-[11px] font-bold text-muted transition hover:bg-accent-ink hover:text-paper"
                >
                  ×
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {pickedCount > 0 ? (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
          <span>已選 {pickedCount} 項，未選的部位沿用角色預設造型</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({})}
            className="cursor-pointer rounded-full border border-accent-ink/15 px-2.5 py-0.5 font-semibold hover:text-foreground disabled:cursor-not-allowed"
          >
            全部清除
          </button>
        </div>
      ) : null}

      {dialogPart ? (
        <CharacterLookDialog
          part={dialogPart}
          value={value[dialogPart] ?? defaultCharacterLook()[dialogPart] ?? ""}
          onChange={(id) => onChange({ ...value, [dialogPart]: id })}
          onClose={() => setDialogPart(null)}
        />
      ) : null}
    </div>
  );
}
