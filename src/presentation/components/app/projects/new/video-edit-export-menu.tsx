"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

// Click or hover opens Video only / Video + Cover. The menu is portaled so the
// summary row's overflow does not clip it.
export function VideoEditExportMenu({
  label,
  busy,
  disabled,
  onVideoOnly,
  onVideoAndCover,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onVideoOnly: () => void;
  onVideoAndCover: () => void;
}) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; right: number } | null>(null);

  function place() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBox({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
  }

  function show() {
    if (disabled) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    place();
    setOpen(true);
  }

  function hideSoon() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function pick(action: () => void) {
    setOpen(false);
    action();
  }

  const menu = open && box
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: box.top, right: box.right }}
          className="fixed z-[100] w-44 overflow-hidden rounded-xl border border-[var(--studio-line)] bg-white p-1 shadow-lg"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
        >
          <MenuItem icon={<FilmIcon />} label={t("video.export.videoOnly")} onClick={() => pick(onVideoOnly)} />
          <MenuItem icon={<CoverIcon />} label={t("video.export.videoAndCover")} onClick={() => pick(onVideoAndCover)} />
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        className="inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#12141c] px-3 text-xs font-semibold text-[#c6f24b] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Spinner className="h-3.5 w-3.5" /> : <DownloadIcon />}
        {label}
      </button>
      {menu}
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]"
    >
      {icon}
      {label}
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CoverIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="12" height="14" rx="1.6" />
      <path d="m8 10 3.2 2.2L8 14.4V10Z" fill="currentColor" stroke="none" />
      <rect x="12.5" y="8" width="8" height="8" rx="1.4" />
      <path d="m14.2 13.6 1.3-1.4 2.8 2.6" />
    </svg>
  );
}
