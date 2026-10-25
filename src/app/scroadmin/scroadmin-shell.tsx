"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/presentation/components/brand-mark";
import { useI18n } from "@/presentation/components/i18n-provider";

// Ink admin chrome for /scroadmin. Marketing header stays off this console.
export function ScroAdminShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const links = [
    { href: "/scroadmin", label: t("scroAdmin.dashboard"), exact: true },
    { href: "/scroadmin/courses", label: t("scroAdmin.courses"), exact: false },
  ];

  return (
    <div className="min-h-dvh bg-[#f4f4f5] text-[#12141c]">
      <header className="border-b border-zinc-200 bg-[#12141c] text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <BrandMark wordClassName="text-lg font-bold tracking-tight text-white" />
            <p className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b] sm:block">
              {t("scroAdmin.title")}
            </p>
            <nav className="flex items-center gap-1 text-sm">
              {links.map((link) => {
                const active = link.exact
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                      active
                        ? "bg-[#c6f24b] text-[#12141c]"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <p className="truncate text-xs text-white/50">{email}</p>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
