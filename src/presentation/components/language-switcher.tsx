"use client";

import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";

import { useEffect, useId, useState } from "react";
import { LOCALE_OPTIONS, type LocaleId } from "@/util/i18n";
import { useI18n } from "@/presentation/components/i18n-provider";

// Globe button. The language list opens in a dialog so the header stays one icon wide.
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(id: LocaleId) {
    setLocale(id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("nav.language")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-[#12141c] ${className}`}
      >
        <GlobeIcon />
      </button>
      {open
        ? <DialogBackdrop
              className="grid place-items-center bg-[#12141c]/40 p-4 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-sm rounded-[1.75rem] border border-[#12141c]/10 bg-white p-6 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
              >
                <h2 id={titleId} className="text-xl font-bold text-[#12141c]">
                  {t("nav.language")}
                </h2>
                <ul className="mt-4 grid max-h-[70vh] gap-1 overflow-y-auto">
                  {LOCALE_OPTIONS.map((option) => {
                    const selected = option.id === locale;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => choose(option.id)}
                          className={`flex w-full cursor-pointer items-center rounded-full px-4 py-2.5 text-left text-sm font-medium ${
                            selected
                              ? "bg-[#12141c] text-[#c6f24b]"
                              : "text-[#12141c] hover:bg-zinc-100"
                          }`}
                        >
                          {option.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </DialogBackdrop>
        : null}
    </>
  );
}

function GlobeIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3 12h18M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9M12 3c-2.5 2.8-3.8 6-3.8 9s1.3 6.2 3.8 9"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}
