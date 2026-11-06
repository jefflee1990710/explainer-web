"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AvatarCreditRing } from "@/presentation/components/auth/avatar-credit-ring";
import { SignOutButton } from "@/presentation/components/auth/sign-out-button";
import { useCreditSnapshot } from "@/presentation/studio/use-credit-snapshot";
import { creditProgress } from "@/service/billing/credit-balance";

// Rail footer. Clicking the signed-in row opens Account links (Usage, Billing, Invoices, MCP, Affiliate, Settings) and sign out.
export function SignedInAccount({
  email,
  name,
  avatarUrl,
  signOutLabel,
  settingsLabel,
  usageLabel = "用量與儲值 Usage",
  billingLabel = "信用卡與付款 Billing",
  invoicesLabel = "帳單紀錄 Invoices",
  mcpLabel = "MCP",
  affiliateLabel,
  credits: initialCredits,
  creditLimit: initialLimit,
  creditsLabel,
}: {
  email: string;
  name: string;
  avatarUrl?: string;
  signOutLabel: string;
  settingsLabel: string;
  usageLabel?: string;
  billingLabel?: string;
  invoicesLabel?: string;
  mcpLabel?: string;
  affiliateLabel?: string;
  credits: number;
  creditLimit: number;
  creditsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const showPhoto = Boolean(avatarUrl) && !photoFailed;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();
  const { credits, creditLimit } = useCreditSnapshot(initialCredits, initialLimit);
  const { ratio } = creditProgress(credits, Math.max(creditLimit, credits));
  const avatar = showPhoto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      onError={() => setPhotoFailed(true)}
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#12141c] text-xs font-semibold text-[#c6f24b]">
      {initial}
    </span>
  );

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

  const menuItemClass =
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]";

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        title={email}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-1 py-1 hover:bg-[var(--studio-fill)] group-data-[expanded=true]/rail:justify-start group-hover/rail:justify-start group-focus-within/rail:justify-start"
      >
        <AvatarCreditRing ratio={ratio} label={creditsLabel}>
          {avatar}
        </AvatarCreditRing>
        <span className="hidden min-w-0 flex-1 truncate text-left text-xs font-medium text-[var(--studio-ink)] group-data-[expanded=true]/rail:block group-hover/rail:block group-focus-within/rail:block">
          {email}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-[var(--studio-line)] bg-[var(--studio-panel)] p-1.5 shadow-xl"
        >
          <div className="mb-1 border-b border-[var(--studio-line)] px-2.5 py-1.5">
            {name ? (
              <p className="truncate text-xs font-semibold text-[var(--studio-ink)]">{name}</p>
            ) : null}
            <p className="truncate text-[11px] text-[var(--studio-muted)]">{email}</p>
            <p className="mt-1 text-[11px] font-semibold text-[var(--studio-ink)]">
              {credits.toLocaleString()} {creditsLabel}
            </p>
          </div>

          <Link
            role="menuitem"
            href="/app/usage"
            onClick={() => setOpen(false)}
            className={menuItemClass}
          >
            <UsageIcon />
            {usageLabel}
          </Link>

          <Link
            role="menuitem"
            href="/app/billing"
            onClick={() => setOpen(false)}
            className={menuItemClass}
          >
            <CardIcon />
            {billingLabel}
          </Link>

          <Link
            role="menuitem"
            href="/app/invoices"
            onClick={() => setOpen(false)}
            className={menuItemClass}
          >
            <InvoiceIcon />
            {invoicesLabel}
          </Link>

          {mcpLabel ? (
            <Link
              role="menuitem"
              href="/app/mcp"
              onClick={() => setOpen(false)}
              className={menuItemClass}
            >
              <McpIcon />
              {mcpLabel}
            </Link>
          ) : null}

          {affiliateLabel ? (
            <Link
              role="menuitem"
              href="/app/affiliate"
              onClick={() => setOpen(false)}
              className={menuItemClass}
            >
              <StarIcon />
              {affiliateLabel}
            </Link>
          ) : null}

          <Link
            role="menuitem"
            href="/app/settings"
            onClick={() => setOpen(false)}
            className={menuItemClass}
          >
            <GearIcon />
            {settingsLabel}
          </Link>

          <div className="my-1 h-px bg-[var(--studio-line)]" />

          <SignOutButton
            label={
              <>
                <LogoutIcon />
                {signOutLabel}
              </>
            }
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--studio-ink)] hover:bg-[var(--studio-fill)]"
          />
        </div>
      ) : null}
    </div>
  );
}

function UsageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 19.5h16M7 16V9m5 7V5m5 11v-4" strokeLinecap="round" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 3.5h12A1.5 1.5 0 0 1 19.5 5v15.5l-2.5-1.5-2.5 1.5-2.5-1.5-2.5 1.5-2.5-1.5-2.5 1.5V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" strokeLinecap="round" />
    </svg>
  );
}

function McpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 8h8v8H8z" />
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3.5 14.2 8l5 .7-3.6 3.5.9 5L12 14.8 7.5 17.2l.9-5L4.8 8.7 9.8 8 12 3.5Z" />
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
    </svg>
  );
}
