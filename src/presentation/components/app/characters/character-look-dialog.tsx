"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  isExaggeratedLookOption,
  lookOptionCategory,
  optionsForLookPart,
  type AnyCharacterLookPart,
  type CharacterLookCategory,
} from "@/service/character/character-look";

const CATEGORIES: readonly CharacterLookCategory[] = ["all", "extreme", "stylized", "classic"];

// Picture grid for one part. Choosing an option closes the dialog.
export function CharacterLookDialog({
  part,
  value,
  onChange,
  onClose,
}: {
  part: AnyCharacterLookPart;
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const label = t(`characters.look.${part}`);
  const [tab, setTab] = useState<CharacterLookCategory>("all");

  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allOptions = optionsForLookPart(part);
  const visibleOptions = useMemo(() => {
    if (tab === "all") return allOptions;
    return allOptions.filter((option) => lookOptionCategory(part, option.id) === tab);
  }, [allOptions, part, tab]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[min(85vh,52rem)] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)] outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-2xl font-bold">
            {label}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist">
            {CATEGORIES.map((category) => {
              const activeTab = tab === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeTab}
                  onClick={() => setTab(category)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    activeTab
                      ? "bg-[#12141c] text-[#c6f24b] shadow-[2px_2px_0_0_#ff4d2e]"
                      : "border border-accent-ink/15 bg-paper text-muted hover:border-[#12141c]/40 hover:text-foreground"
                  }`}
                >
                  {t(`characters.look.tabs.${category}`)}
                </button>
              );
            })}
          </div>
        </div>
        <div role="radiogroup" aria-label={label} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleOptions.map((option) => {
            const active = option.id === value;
            const extreme = isExaggeratedLookOption(part, option.id);
            const name = t(`characters.look.options.${part}.${option.id}`);
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  onChange(option.id);
                  onClose();
                }}
                className={`cursor-pointer rounded-2xl border bg-paper p-2 text-center transition ${
                  active
                    ? "border-[#12141c] ring-2 ring-[#c6f24b] shadow-[3px_3px_0_0_#ff4d2e]"
                    : extreme
                      ? "border-[#ff4d2e]/40 hover:border-[#ff4d2e]"
                      : "border-accent-ink/10 hover:border-[#ff4d2e]/60"
                }`}
              >
                <span className="relative block aspect-square overflow-hidden rounded-xl border border-[#12141c]/10 bg-gradient-to-br from-[#c6f24b] via-[#fff6eb] to-[#ff4d2e]/35">
                  <CharacterLookArt part={part} id={option.id} />
                  {extreme ? (
                    <span className="absolute top-2 right-2 rounded-full bg-[#12141c] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-[#c6f24b] shadow-sm">
                      {t("characters.look.extremeBadge")}
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-sm font-semibold leading-5">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </DialogBackdrop>
  );
}
