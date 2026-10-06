"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LandingHeroArt, LandingHeroArtBottom } from "@/presentation/components/landing-hero-art";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Centered hero over a drifting line drawing. Desktop height follows the copy.
// Mobile stacks the two scenes around the headline so the portrait gap stays short.
export function LandingHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.12 + 0.15, duration: 0.7, ease },
    }),
  };

  return (
    // Pop-art art stays on the sides. A cream panel keeps the headline readable.
    <section className="relative overflow-hidden bg-[#f7f3e8]">
      <LandingHeroArt />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-[1] hidden w-[min(52rem,70%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,252,245,0.96)_0%,rgba(255,252,245,0.88)_42%,rgba(255,252,245,0)_78%)] lg:block"
      />
      <ParallaxLayer distance={-18} className="relative z-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-8 text-center lg:py-24">
          <div className="rounded-[2rem] bg-[#fffdf8]/95 px-6 py-8 shadow-[0_12px_40px_rgba(18,20,28,0.08)] backdrop-blur-sm sm:px-10 sm:py-10">
          <motion.h1
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="max-w-3xl text-pretty text-3xl font-bold leading-[1.12] tracking-tight text-[#12141c] sm:text-4xl lg:text-6xl"
          >
            {t("landing.hero.title")}
          </motion.h1>
          <motion.p
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 max-w-xl text-base font-medium text-zinc-600 lg:text-lg"
          >
            {t("landing.hero.subtitle")}
          </motion.p>
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Link
              href={signedIn ? "/app" : "/sign-up"}
              className="inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {signedIn ? t("landing.hero.ctaWorkspace") : t("landing.hero.ctaStart")}
            </Link>
            <Link
              href="#pricing"
              className="inline-flex rounded-full border border-[#12141c]/20 bg-white px-8 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-[#f4fcd4]"
            >
              {t("landing.hero.ctaPricing")}
            </Link>
          </motion.div>
          </div>
        </div>
      </ParallaxLayer>
      <LandingHeroArtBottom />
    </section>
  );
}
