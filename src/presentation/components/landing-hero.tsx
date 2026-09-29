"use client";

import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LandingHeroArt } from "@/presentation/components/landing-hero-art";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Centered hero over a drifting line drawing. Desktop height follows the copy.
// Mobile uses a tall portrait so the headline sits in the drawing's white band.
export function LandingHero() {
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
      <div className="relative z-10 mx-auto flex min-h-[68rem] max-w-3xl translate-y-[4.5rem] flex-col items-center justify-center px-6 py-16 text-center lg:min-h-0 lg:translate-y-0 lg:py-24">
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
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button
                type="button"
                className="cursor-pointer rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
              >
                {t("landing.hero.ctaStart")}
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/app"
              className="inline-flex rounded-full bg-[#12141c] px-8 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black"
            >
              {t("landing.hero.ctaWorkspace")}
            </Link>
          </Show>
          <Link
            href="#pricing"
            className="inline-flex rounded-full border border-[#12141c]/15 bg-white/80 px-8 py-3 text-sm font-semibold text-[#12141c] backdrop-blur-sm transition-colors hover:bg-[#f4fcd4]"
          >
            {t("landing.hero.ctaPricing")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
