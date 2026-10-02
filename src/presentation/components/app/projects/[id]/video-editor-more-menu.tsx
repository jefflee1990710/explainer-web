"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

// Header kebab: open actions, then confirm delete in the existing dialog.
export function VideoEditorMoreMenu({ onDelete }: { onDelete: () => void }) {
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
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("video.editor.moreAria")}
        title={t("video.editor.moreAria")}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--studio-fill)] text-[var(--studio-ink)] transition hover:bg-zinc-100"
      >
        <KebabIcon />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <TrashIcon />
            {t("video.editor.deleteVideo")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 7h14M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M8 7l.6 12.2A1.5 1.5 0 0 0 10.1 20.5h3.8a1.5 1.5 0 0 0 1.5-1.3L16 7" />
    </svg>
  );
}
