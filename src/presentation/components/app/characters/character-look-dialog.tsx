"use client";

import { useEffect, useId, useRef } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { useI18n } from "@/presentation/components/i18n-provider";
import { CHARACTER_LOOKS, type CharacterLookPart } from "@/service/character/character-look";

// Picture grid for one part. Choosing an option closes the dialog.
export function CharacterLookDialog({
  part,
  value,
  onChange,
  onClose,
}: {
  part: CharacterLookPart;
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const label = t(`characters.look.${part}`);

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
        <h2 id={titleId} className="font-display text-2xl font-bold">
          {label}
        </h2>
        <div role="radiogroup" aria-label={label} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CHARACTER_LOOKS[part].map((option) => {
            const active = option.id === value;
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
                    ? "border-accent shadow-[3px_3px_0_0_#12141c]"
                    : "border-accent-ink/10 hover:border-accent-ink/30"
                }`}
              >
                <span className="block aspect-square overflow-hidden rounded-xl bg-zinc-200">
                  <CharacterLookArt part={part} id={option.id} />
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
