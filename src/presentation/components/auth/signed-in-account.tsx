"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/presentation/components/auth/sign-out-button";

// Rail footer. Clicking the signed-in row opens settings and sign out.
export function SignedInAccount({
  email,
  name,
  avatarUrl,
  signOutLabel,
  settingsLabel,
}: {
  email: string;
  name: string;
  avatarUrl?: string;
  signOutLabel: string;
  settingsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showPhoto = Boolean(avatarUrl) && !photoFailed;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

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

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        title={email}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-1 py-1 hover:bg-[var(--studio-fill)] lg:justify-start"
      >
        {showPhoto ? (
          <img
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            onError={() => setPhotoFailed(true)}
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#12141c] text-xs font-semibold text-[#c6f24b]">
            {initial}
          </span>
        )}
        <span className="hidden min-w-0 flex-1 truncate text-left text-xs font-medium text-[var(--studio-ink)] lg:block">
          {email}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-2 w-44 overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href="/app/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]"
          >
            <GearIcon />
            {settingsLabel}
          </Link>
          <SignOutButton
            label={
              <>
                <LogoutIcon />
                {signOutLabel}
              </>
            }
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]"
          />
        </div>
      ) : null}
    </div>
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
    </svg>
  );
}
