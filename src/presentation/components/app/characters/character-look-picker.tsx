"use client";

import { useState } from "react";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { CharacterLookDialog } from "@/presentation/components/app/characters/character-look-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { CharacterLookPart } from "@/service/character/character-look";

// Current look for one part. Click opens the picture dialog.
export function CharacterLookPicker({
  part,
  value,
  disabled,
  onChange,
}: {
  part: CharacterLookPart;
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const label = t(`characters.look.${part}`);
  const name = t(`characters.look.options.${part}.${value}`);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-accent-ink/10 bg-paper px-3 py-2 text-left transition hover:border-accent-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
          <CharacterLookArt part={part} id={value} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-muted">{label}</span>
          <span className="block truncate text-sm font-semibold">{name}</span>
        </span>
        <ChevronIcon />
      </button>
      {open ? (
        <CharacterLookDialog
          part={part}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted" fill="none" aria-hidden>
      <path d="m7.5 5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
