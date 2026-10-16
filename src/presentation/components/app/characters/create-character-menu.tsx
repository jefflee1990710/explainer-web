"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

// New character opens this menu: simple form, or the picture generator.
export function CreateCharacterMenu({
  label,
  className,
  disabled = false,
  onSimple,
}: {
  label: string;
  className: string;
  disabled?: boolean;
  onSimple: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={className}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-accent-ink/10 bg-paper p-1.5 text-left shadow-[6px_6px_0_0_rgba(18,20,28,0.08)]"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left hover:bg-accent-ink/5"
            onClick={() => {
              setOpen(false);
              onSimple();
            }}
          >
            <span className="block text-sm font-semibold">{t("characters.createSimple")}</span>
            <span className="mt-0.5 block text-xs text-muted">{t("characters.createSimpleHint")}</span>
          </button>
          <Link
            href="/app/characters/generate"
            role="menuitem"
            className="block w-full cursor-pointer rounded-xl px-3 py-2.5 text-left hover:bg-accent-ink/5"
            onClick={() => setOpen(false)}
          >
            <span className="block text-sm font-semibold">{t("characters.createGenerator")}</span>
            <span className="mt-0.5 block text-xs text-muted">{t("characters.createGeneratorHint")}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
