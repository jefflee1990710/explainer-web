"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/presentation/components/auth/sign-out-button";
import { useI18n } from "@/presentation/components/i18n-provider";

export type SiteAccount = {
  email: string;
  name: string;
  avatarUrl?: string;
};

// Header avatar. Hover or focus opens Workspace and Sign out; tap toggles on touch screens.
export function SiteAccountMenu({ account }: { account: SiteAccount }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const pointerType = useRef("");
  const showPhoto = Boolean(account.avatarUrl) && !photoFailed;
  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();
  const label = account.name || account.email;

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  // Short delay so the pointer can cross the gap between the avatar and the menu.
  function closeSoon() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={closeSoon}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node)) closeSoon();
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={account.email}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={() => {
          // A mouse already opened the menu on hover, so a click must not close it again.
          if (pointerType.current === "mouse") setOpen(true);
          else setOpen((value) => !value);
        }}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-[#12141c] bg-white transition-transform hover:-translate-y-0.5"
      >
        {showPhoto ? (
          <img
            src={account.avatarUrl}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            onError={() => setPhotoFailed(true)}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full bg-[#12141c] text-xs font-semibold text-[#c6f24b]">
            {initial}
          </span>
        )}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 pt-2">
          <div
            role="menu"
            className="w-56 overflow-hidden rounded-2xl border-2 border-[#12141c] bg-white p-1.5 shadow-[4px_4px_0_0_#12141c]"
          >
            <div className="border-b border-zinc-200 px-3 py-2">
              {account.name ? (
                <p className="truncate text-sm font-semibold text-[#12141c]">{account.name}</p>
              ) : null}
              <p className="truncate text-xs text-zinc-500">{account.email}</p>
            </div>
            <Link
              role="menuitem"
              href="/app"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#12141c] hover:bg-[#f4fcd4]"
            >
              <WorkspaceIcon />
              {t("nav.workspace")}
            </Link>
            <SignOutButton
              label={
                <>
                  <LogoutIcon />
                  {t("auth.signOut")}
                </>
              }
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#12141c] hover:bg-[#f4fcd4]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="4" width="17" height="12.5" rx="2" />
      <path d="M8 20h8M12 16.5V20" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 6.5V5.2A1.7 1.7 0 0 1 10.7 3.5H18a1.5 1.5 0 0 1 1.5 1.5v14A1.5 1.5 0 0 1 18 20.5h-7.3A1.7 1.7 0 0 1 9 18.8v-1.3" />
      <path d="M13 12H3.5M6 8.8 3 12l3 3.2" />
    </svg>
  );
}
