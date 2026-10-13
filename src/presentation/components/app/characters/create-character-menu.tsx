"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

// New-character trigger. Opens Simple Create or Character Generator.
export function CreateCharacterMenu({
  label,
  className,
  disabled,
  onSimple,
  onGenerator,
}: {
  label: string;
  className: string;
  disabled?: boolean;
  onSimple: () => void;
  onGenerator: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          <ChevronIcon />
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper p-1 text-foreground shadow-[4px_4px_0_0_rgba(18,20,28,0.12)]"
        >
          <MenuItem
            label={t("characters.createSimple")}
            hint={t("characters.createSimpleHint")}
            onClick={() => {
              setOpen(false);
              onSimple();
            }}
          />
          <MenuItem
            label={t("characters.createGenerator")}
            hint={t("characters.createGeneratorHint")}
            onClick={() => {
              setOpen(false);
              onGenerator();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col rounded-xl px-3 py-2.5 text-left hover:bg-accent-ink/5"
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-0.5 text-xs leading-5 text-muted">{hint}</span>
    </button>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
