"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/presentation/components/brand-mark";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LanguageSwitcher } from "@/presentation/components/language-switcher";
import { SiteAccountMenu, type SiteAccount } from "@/presentation/components/site-account-menu";
import { SITE_FEATURE_LINKS, SiteFeaturesMenu } from "@/presentation/components/site-features-menu";
import { SignupPromoBanner } from "@/presentation/components/signup-promo-banner";

// Sticky translucent bar with desktop navigation and a responsive mobile drawer menu.
export function SiteHeader({
  signedIn = false,
  showAffiliate = false,
  account,
  showPromo = false,
  promoDiscountPercent = 0,
  promoCredits = 0,
  promoBonusPercent = 0,
}: {
  signedIn?: boolean;
  showAffiliate?: boolean;
  account?: SiteAccount;
  showPromo?: boolean;
  promoDiscountPercent?: number;
  promoCredits?: number;
  promoBonusPercent?: number;
}) {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <div className="sticky top-0 z-50">
      {showPromo ? (
        <SignupPromoBanner
          variant="public"
          signedIn={signedIn}
          discountPercent={promoDiscountPercent}
          credits={promoCredits}
          bonusPercent={promoBonusPercent}
        />
      ) : null}
      <header className="border-b border-zinc-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <BrandMark wordClassName="text-lg font-bold tracking-tight sm:text-xl" />

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary"
            className="hidden min-w-0 items-center gap-5 text-sm md:flex lg:gap-7"
          >
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
            <SiteFeaturesMenu />
            {showAffiliate ? (
              <Link
                href="/affiliate"
                className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
              >
                {t("nav.affiliate")}
              </Link>
            ) : null}
            <Link
              href="/pricing"
              className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="/posts"
              className="shrink-0 font-medium text-zinc-600 transition-colors hover:text-[#12141c]"
            >
              {t("nav.blog")}
            </Link>
          </nav>

          {/* Right Actions + Mobile Menu Trigger */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {signedIn ? (
              <SiteAccountMenu account={account ?? { email: "", name: "" }} />
            ) : (
              <Link
                href="/sign-in"
                className="cursor-pointer whitespace-nowrap rounded-full bg-[#12141c] px-3.5 py-1.5 text-xs font-semibold text-[#c6f24b] transition-colors hover:bg-black sm:px-4 sm:py-2 sm:text-sm"
              >
                {t("nav.signIn")}
              </Link>
            )}
            <button
              type="button"
              aria-label={mobileMenuOpen ? t("common.close") : t("nav.features")}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-[#12141c] transition-colors hover:bg-zinc-100 md:hidden"
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M3.5 6h13M3.5 10h13M3.5 14h13" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-zinc-200 bg-white/95 px-4 pb-5 pt-3 shadow-[0_16px_40px_rgba(18,20,28,0.12)] backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
              >
                {t("nav.home")}
              </Link>
              <Link
                href="/examples"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
              >
                {t("nav.examples")}
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
              >
                {t("nav.pricing")}
              </Link>
              <Link
                href="/posts"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
              >
                {t("nav.blog")}
              </Link>
              {showAffiliate ? (
                <Link
                  href="/affiliate"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-100"
                >
                  {t("nav.affiliate")}
                </Link>
              ) : null}
            </div>

            <div className="mt-3 border-t border-zinc-200 pt-3">
              <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                {t("nav.features")}
              </p>
              <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                {SITE_FEATURE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-2 transition-colors hover:bg-[#f4fcd4]"
                  >
                    <span className="block text-sm font-semibold text-[#12141c]">
                      {t(item.labelKey)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-zinc-500">
                      {t(item.blurbKey)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-3">
              <Link
                href={signedIn ? "/app" : "/sign-up"}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#12141c] px-5 py-2.5 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
              >
                {signedIn ? t("nav.workspace") : t("landing.hero.ctaStart")}
              </Link>
            </div>
          </nav>
        ) : null}
      </header>
    </div>
  );
}
