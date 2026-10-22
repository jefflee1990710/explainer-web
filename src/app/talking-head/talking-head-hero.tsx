"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Full-bleed talking-head hero — brand first, script-to-clip promise.
export function TalkingHeadHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="relative flex min-h-[36rem] w-full items-end overflow-hidden border-b border-black/40 bg-[#0a0c10] lg:min-h-[44rem] lg:items-center">
      <img
        src="/landing/talking-head/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/88 to-[#0a0c10]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-[#0a0c10]/40" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 md:px-8 lg:py-24">
        <div className="max-w-xl">
          <p className="font-display text-5xl font-bold tracking-tight text-[#c6f24b] sm:text-6xl">
            {t("talkingHeadPage.hero.brand")}
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
            {t("talkingHeadPage.hero.kicker")}
          </p>
          <h1 className="mt-6 font-display text-balance text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-[2.75rem]">
            {t("talkingHeadPage.hero.title")}
          </h1>
          <p className="mt-5 max-w-lg text-pretty text-base font-medium leading-7 text-white/75 sm:text-lg">
            {t("talkingHeadPage.hero.subtitle")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={signedIn ? "/app" : "/sign-up"}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c6f24b] px-9 py-3 text-sm font-semibold text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a]"
            >
              {signedIn ? t("talkingHeadPage.hero.ctaWorkspace") : t("talkingHeadPage.hero.ctaStart")}
            </Link>
            <Link
              href="#steps"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-9 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              {t("talkingHeadPage.hero.ctaSecondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
