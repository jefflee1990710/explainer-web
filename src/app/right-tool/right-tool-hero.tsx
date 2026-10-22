"use client";

import Link from "next/link";
import { useI18n } from "@/presentation/components/i18n-provider";

// Full-bleed ink stage: brand first, then one-shot shipping promise.
// CSS motion only — no opacity:0 initial, so SSR/headless shots stay readable.
export function RightToolHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();

  return (
    <section className="relative flex min-h-[34rem] w-full flex-col justify-center overflow-hidden border-b border-black/40 bg-[#0a0c10] px-6 py-20 sm:min-h-[40rem] md:px-8 lg:min-h-[44rem]">
      {/* Atmospheric product stills — edge-to-edge, not inset cards. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(198,242,75,0.14),transparent_45%),radial-gradient(ellipse_at_85%_70%,rgba(198,242,75,0.08),transparent_40%),linear-gradient(160deg,#0a0c10_0%,#12141c_55%,#0a0c10_100%)]" />
        <img
          src="/landing/director-scro.webp"
          alt=""
          className="absolute -right-8 top-1/2 hidden w-[42%] max-w-xl -translate-y-1/2 opacity-[0.28] grayscale-[15%] lg:block"
        />
        <img
          src="/landing/cast-scro.webp"
          alt=""
          className="absolute -left-16 bottom-0 hidden w-[36%] max-w-md opacity-[0.2] lg:block"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c10] via-[#0a0c10]/90 to-[#0a0c10]/50" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl text-center lg:mx-0 lg:max-w-xl lg:text-left xl:max-w-2xl">
        <p className="font-display text-5xl font-bold tracking-tight text-[#c6f24b] sm:text-6xl xl:text-7xl">
          {t("rightTool.hero.brand")}
        </p>

        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
          {t("rightTool.hero.kicker")}
        </p>

        <h1 className="mt-6 font-display text-balance text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl xl:text-[2.75rem]">
          {t("rightTool.hero.title")}
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-base font-medium leading-7 text-white/75 sm:text-lg lg:mx-0">
          {t("rightTool.hero.subtitle")}
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
          <Link
            href={signedIn ? "/app" : "/sign-up"}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c6f24b] px-9 py-3 text-sm font-semibold text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a]"
          >
            {signedIn ? t("rightTool.hero.ctaWorkspace") : t("rightTool.hero.ctaStart")}
          </Link>
          <Link
            href="#edit"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-9 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            {t("rightTool.hero.ctaSecondary")}
          </Link>
        </div>
      </div>
    </section>
  );
}
