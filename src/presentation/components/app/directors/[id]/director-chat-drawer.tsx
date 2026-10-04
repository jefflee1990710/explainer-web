"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";

// Mobile: peeking right drawer. Desktop: in-flow column. Same shell as the style desk.
export function DirectorChatDrawer({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const peekRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggledRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!toggledRef.current) return;
    if (open) closeRef.current?.focus();
    else peekRef.current?.focus();
  }, [open]);

  function toggle(next: boolean) {
    toggledRef.current = true;
    setOpen(next);
  }

  return (
    <>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        aria-label={t("directors.chatDrawerClose")}
        className={`fixed inset-0 z-30 touch-manipulation bg-accent-ink/50 lg:hidden ${
          open ? "" : "pointer-events-none opacity-0"
        } motion-safe:transition-opacity motion-safe:duration-200 motion-reduce:transition-none`}
        onClick={() => toggle(false)}
      />
      <div
        id={panelId}
        className={`flex min-h-0 flex-1 flex-col max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:w-[min(calc(100vw-3.5rem),28rem)] max-lg:pt-[env(safe-area-inset-top)] max-lg:pb-[env(safe-area-inset-bottom)] max-lg:overscroll-contain motion-safe:max-lg:transition-transform motion-safe:max-lg:duration-200 motion-safe:max-lg:ease-out motion-reduce:max-lg:transition-none lg:relative lg:inset-auto lg:z-auto lg:w-auto lg:translate-x-0 lg:pt-0 lg:pb-0 ${
          open ? "max-lg:translate-x-0" : "max-lg:translate-x-[calc(100%-2.75rem)]"
        }`}
      >
        <button
          ref={peekRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => toggle(true)}
          className={`absolute inset-y-0 left-0 z-10 w-11 touch-manipulation cursor-pointer rounded-l-xl border border-r-0 border-accent-ink/15 bg-paper lg:hidden ${
            open ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <span className="sr-only">{t("directors.chatDrawerOpen")}</span>
          <span aria-hidden className="absolute left-1/2 top-3 -translate-x-1/2 text-[var(--studio-ink)]">
            <PeekChevron />
          </span>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs font-bold"
          >
            {t("directors.chatTitle")}
          </span>
        </button>
        <DrawerChrome closeRef={closeRef} onClose={() => toggle(false)}>
          {children}
        </DrawerChrome>
      </div>
    </>
  );
}

function DrawerChrome({
  children,
  closeRef,
  onClose,
}: {
  children: ReactNode;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t("directors.chatDrawerClose")}
        className="absolute right-2 top-1 z-10 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--studio-ink)] transition hover:bg-accent-ink/[0.06] lg:hidden"
      >
        <CloseIcon />
      </button>
      {children}
    </div>
  );
}

function PeekChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M14 6 8 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
