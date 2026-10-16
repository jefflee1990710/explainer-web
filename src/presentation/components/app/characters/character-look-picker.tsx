"use client";

import { useState } from "react";
import { CharacterLookArt } from "@/presentation/components/app/characters/character-look-art";
import { CharacterLookDialog } from "@/presentation/components/app/characters/character-look-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  isExaggeratedLookOption,
  type AnyCharacterLookPart,
} from "@/service/character/character-look";

// Current look for one part. Click opens the picture dialog.
export function CharacterLookPicker({
  part,
  value,
  disabled,
  locked = false,
  onToggleLock,
  onChange,
}: {
  part: AnyCharacterLookPart;
  value: string;
  disabled?: boolean;
  locked?: boolean;
  onToggleLock?: () => void;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const label = t(`characters.look.${part}`);
  const name = t(`characters.look.options.${part}.${value}`);
  const extreme = isExaggeratedLookOption(part, value);

  return (
    <>
      <div className="relative flex items-center">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-paper px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${
            extreme
              ? "border-[#ff4d2e]/60 hover:border-[#ff4d2e]"
              : "border-accent-ink/10 hover:border-accent-ink/30"
          }`}
        >
          <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#12141c]/15 bg-gradient-to-br from-[#c6f24b] via-[#fff6eb] to-[#ff4d2e]/35">
            <CharacterLookArt part={part} id={value} />
            {extreme ? (
              <span className="absolute top-1 left-1 rounded-full bg-[#12141c] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider text-[#c6f24b]">
                {t("characters.look.extremeBadge")}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1 pr-6">
            <span className="block text-xs font-semibold text-muted">{label}</span>
            <span className="block truncate text-sm font-semibold">{name}</span>
          </span>
          <ChevronIcon />
        </button>
        {onToggleLock ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLock();
            }}
            aria-pressed={locked}
            aria-label={
              locked
                ? t("characters.look.unlockPart", { part: label })
                : t("characters.look.lockPart", { part: label })
            }
            title={
              locked
                ? t("characters.look.unlockPart", { part: label })
                : t("characters.look.lockPart", { part: label })
            }
            className={`absolute right-8 grid h-7 w-7 cursor-pointer place-items-center rounded-full border text-xs transition ${
              locked
                ? "border-[#12141c] bg-[#c6f24b] text-[#12141c]"
                : "border-transparent text-muted hover:bg-accent-ink/5 hover:text-foreground"
            }`}
          >
            <LockIcon locked={locked} />
          </button>
        ) : null}
      </div>
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

function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="currentColor" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 4.6-1.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-muted" fill="none" aria-hidden>
      <path d="m7.5 5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
