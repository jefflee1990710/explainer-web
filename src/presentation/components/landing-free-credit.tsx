"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Closing sign-up band on brand green. The gift-box still lives in /public/cta.
export function LandingFreeCredit({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="border-t border-[#e4e4e7] bg-[#f4fcd4] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 rounded-2xl border border-[#e4e4e7] bg-white p-6 shadow-[0_8px_24px_rgba(22,24,35,0.06)] md:p-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#fafafa]">
          <ParallaxLayer distance={20}>
            <img src="/cta/free-credit-scro.webp" alt="" className="aspect-video w-full scale-105 object-cover" />
          </ParallaxLayer>
        </div>
        <div>
          <p className="inline-flex items-center rounded-full bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("landing.freeCredit.eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
            {t("landing.freeCredit.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#5c6170]">{t("landing.freeCredit.body")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={signedIn ? "/app/characters" : "/sign-up"}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black sm:w-auto"
            >
              {t("landing.freeCredit.cta")}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#e4e4e7] bg-[#f4f4f5] px-8 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-zinc-200/70 sm:w-auto"
            >
              {t("landing.freeCredit.ctaPricing")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
