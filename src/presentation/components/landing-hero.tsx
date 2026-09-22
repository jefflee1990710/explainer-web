"use client";

import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { MotionReveal } from "@/presentation/components/motion-reveal";

// Full-bleed hero: brand, headline, support line, CTAs, storyboard art plane.
export function LandingHero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-[88vh] overflow-hidden border-b border-line">
      <div className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pb-20 lg:pt-24">
        <div className="relative z-10">
          <MotionReveal>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              {t("landing.hero.kicker")}
            </p>
          </MotionReveal>
          <MotionReveal delay={0.08}>
            <h1 className="font-display mt-4 max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t("landing.hero.title")}
            </h1>
          </MotionReveal>
          <MotionReveal delay={0.16}>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
              {t("landing.hero.subtitle")}
            </p>
          </MotionReveal>
          <MotionReveal delay={0.24} className="mt-8 flex flex-wrap gap-3">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c]"
                >
                  {t("landing.hero.ctaStart")}
                </motion.button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/app"
                  className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_0_#12141c]"
                >
                  {t("landing.hero.ctaWorkspace")}
                </Link>
              </motion.div>
            </Show>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="#pricing"
                className="inline-flex rounded-full border border-accent-ink/15 bg-paper px-6 py-3 text-sm font-semibold shadow-[4px_4px_0_0_rgba(198,242,75,0.9)]"
              >
                {t("landing.hero.ctaPricing")}
              </Link>
            </motion.div>
          </MotionReveal>
        </div>

        <MotionReveal delay={0.18} className="relative z-10">
          <HeroArt artLabel={t("landing.hero.artLabel")} />
        </MotionReveal>
      </div>
    </section>
  );
}

function HeroArt({ artLabel }: { artLabel: string }) {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <motion.div
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-lime/40 via-sky/20 to-accent/30 blur-2xl"
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        viewBox="0 0 520 420"
        className="relative w-full drop-shadow-[0_20px_40px_rgba(18,20,28,0.12)]"
        role="img"
        aria-label={artLabel}
      >
        <rect x="24" y="36" width="472" height="348" rx="28" fill="#fffbf5" stroke="#12141c" strokeWidth="4" />
        <rect x="48" y="68" width="180" height="120" rx="18" fill="#c6f24b" stroke="#12141c" strokeWidth="3" />
        <rect x="248" y="68" width="200" height="120" rx="18" fill="#ff4d2e" stroke="#12141c" strokeWidth="3" />
        <rect x="48" y="212" width="200" height="120" rx="18" fill="#14b8a6" stroke="#12141c" strokeWidth="3" />
        <rect x="268" y="212" width="180" height="120" rx="18" fill="#4f8cff" stroke="#12141c" strokeWidth="3" />
        <circle cx="98" cy="118" r="18" fill="#12141c" />
        <path d="M140 140c28-28 62-20 90 4" fill="none" stroke="#12141c" strokeWidth="4" strokeLinecap="round" />
        <path d="M300 140c24 18 48 34 90 18" fill="none" stroke="#fffbf5" strokeWidth="5" strokeLinecap="round" />
        <path d="M90 270c40 30 90 36 140 10" fill="none" stroke="#12141c" strokeWidth="4" strokeLinecap="round" />
        <circle cx="340" cy="268" r="22" fill="#fffbf5" stroke="#12141c" strokeWidth="3" />
        <text x="72" y="168" fill="#12141c" fontSize="18" fontWeight="700" fontFamily="Syne, sans-serif">
          HOOK
        </text>
        <text x="290" y="168" fill="#fffbf5" fontSize="18" fontWeight="700" fontFamily="Syne, sans-serif">
          SCENE
        </text>
        <text x="78" y="312" fill="#fffbf5" fontSize="18" fontWeight="700" fontFamily="Syne, sans-serif">
          PAYOFF
        </text>
        <text x="300" y="312" fill="#fffbf5" fontSize="18" fontWeight="700" fontFamily="Syne, sans-serif">
          CUT
        </text>
      </svg>
    </div>
  );
}
