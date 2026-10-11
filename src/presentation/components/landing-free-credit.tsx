"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

// Closing sign-up band on brand green. The gift-box still lives in /public/cta.
export function LandingFreeCredit({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="bg-[#c6f24b] px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border-2 border-[#12141c] bg-white shadow-[6px_6px_0_0_#12141c]">
          <ParallaxLayer distance={20}>
            <img src="/cta/free-credit-scro.webp" alt="" className="aspect-video w-full scale-105 object-cover" />
          </ParallaxLayer>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#12141c]/70">
            {t("landing.freeCredit.eyebrow")}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#12141c] md:text-4xl">
            {t("landing.freeCredit.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#12141c]/80">{t("landing.freeCredit.body")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={signedIn ? "/app" : "/sign-up"}
              className="inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {t("landing.freeCredit.cta")}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex rounded-full border-2 border-[#12141c] bg-white px-8 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-[#f4fcd4]"
            >
              {t("landing.freeCredit.ctaPricing")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
