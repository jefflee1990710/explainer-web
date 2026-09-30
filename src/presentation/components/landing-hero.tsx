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
    <section className="relative overflow-hidden bg-white">
      <LandingHeroArt />
      <ParallaxLayer distance={-18} className="relative z-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-8 text-center lg:py-24">
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
            className="mt-5 max-w-xl text-base text-zinc-600 lg:text-lg"
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
              className="inline-flex rounded-full border border-[#12141c]/15 bg-white/80 px-8 py-3 text-sm font-semibold text-[#12141c] backdrop-blur-sm transition-colors hover:bg-[#f4fcd4]"
            >
              {t("landing.hero.ctaPricing")}
            </Link>
          </motion.div>
        </div>
      </ParallaxLayer>
      <LandingHeroArtBottom />
    </section>
  );
}
