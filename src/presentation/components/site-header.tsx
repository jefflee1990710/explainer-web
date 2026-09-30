"use client";

import Link from "next/link";
import { BrandMark } from "@/presentation/components/brand-mark";
import { SignOutButton } from "@/presentation/components/auth/sign-out-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LanguageSwitcher } from "@/presentation/components/language-switcher";

// Sticky translucent bar, same chrome as mentalok.io.
export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="flex min-w-0 items-center gap-0.5 text-xs sm:gap-4 sm:text-sm lg:gap-6">
          <Link
            href="/"
            className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
          >
            {t("nav.home")}
          </Link>
          <Link
            href="/examples"
            className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
          >
            {t("nav.examples")}
          </Link>
          <Link
            href="/affiliate"
            className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
          >
            {t("nav.affiliate")}
          </Link>
          <Link
            href="/#pricing"
            className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
          >
            {t("nav.pricing")}
          </Link>
          <LanguageSwitcher />
          {signedIn ? (
            <>
              <Link
                href="/app"
                className="hidden shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c] min-[420px]:inline"
              >
                {t("nav.workspace")}
              </Link>
              <SignOutButton
                label={t("auth.signOut")}
                className="cursor-pointer whitespace-nowrap rounded-full border border-[#12141c]/15 px-2 py-1.5 text-xs font-semibold text-[#12141c] transition-colors hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
              />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="cursor-pointer whitespace-nowrap rounded-full bg-[#12141c] px-2 py-1.5 text-xs font-semibold text-[#c6f24b] transition-colors hover:bg-black sm:px-4 sm:py-2 sm:text-sm"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
