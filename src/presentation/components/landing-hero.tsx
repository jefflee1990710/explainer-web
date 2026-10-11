"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LandingHeroArt } from "@/presentation/components/landing-hero-art";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Short-video hero. On desktop the copy sits on the empty paper between the two phones.
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
  const platforms = [t("landing.hero.platformReels"), t("landing.hero.platformShorts"), t("landing.hero.platformTiktok")];

  return (
    // Paper ground matches the cut-out art so the phones read as pieces on one sheet.
    <section className="relative flex w-full flex-col overflow-hidden bg-[#f3f3f3] lg:max-h-[46rem] lg:min-h-[36rem] lg:justify-center">
      <ParallaxLayer distance={-18} className="relative z-10 order-1">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 pb-2 pt-14 text-center lg:max-w-[36rem] lg:py-10 xl:max-w-[42rem]">
          <motion.p
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 rounded-full bg-[#12141c] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]"
          >
            {t("landing.hero.kicker")}
          </motion.p>
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 text-pretty text-4xl font-bold leading-[1.08] tracking-tight text-[#12141c] sm:text-5xl xl:text-6xl"
          >
            {t("landing.hero.title")}
          </motion.h1>
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 max-w-xl text-base font-medium text-zinc-600 lg:text-lg"
          >
            {t("landing.hero.subtitle")}
          </motion.p>
          {/* Where the videos go: plain chips, no platform logos. */}
          <motion.ul
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 flex flex-wrap justify-center gap-2"
          >
            {platforms.map((label) => (
              <li
                key={label}
                className="rounded-full border-2 border-[#12141c] bg-white px-3 py-1 text-xs font-semibold text-[#12141c]"
              >
                {label}
              </li>
            ))}
          </motion.ul>
          <motion.div
            custom={4}
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
              href="#use-cases"
              className="inline-flex rounded-full border border-[#12141c]/20 bg-white px-8 py-3 text-sm font-semibold text-[#12141c] transition-colors hover:bg-[#f4fcd4]"
            >
              {t("landing.hero.ctaUseCases")}
            </Link>
          </motion.div>
        </div>
      </ParallaxLayer>
      <div className="order-2">
        <LandingHeroArt />
      </div>
    </section>
  );
}
