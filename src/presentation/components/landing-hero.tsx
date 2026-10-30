"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { track } from "@/presentation/components/analytics/track";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LandingHeroArt } from "@/presentation/components/landing-hero-art";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Dense character-design hero on an ink + lime film-studio stage (no flat gray).
export function LandingHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t } = useI18n();
  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.11 + 0.18, duration: 0.75, ease },
    }),
  };
  const platforms = [t("landing.hero.platformReels"), t("landing.hero.platformShorts"), t("landing.hero.platformTiktok")];

  // Viewport under the sticky header on desktop, with min-height guard so shorter laptop screens never clip.
  return (
    <section className="relative flex w-full flex-col overflow-hidden border-b border-black/40 bg-[#0a0c10] lg:h-[calc(100dvh-4rem)] lg:min-h-[42rem]">
      <div className="order-2 lg:order-1 lg:contents">
        <LandingHeroArt />
      </div>

      <div className="relative z-10 order-1 mx-auto flex w-full max-w-xl flex-col items-center px-4 pb-5 pt-10 text-center sm:px-6 sm:pt-14 lg:absolute lg:inset-x-0 lg:top-1/2 lg:max-w-[30rem] lg:-translate-y-1/2 lg:px-8 lg:py-0 xl:max-w-[34rem]">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c6f24b] shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:px-4 sm:text-xs sm:tracking-[0.16em]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
          {t("landing.hero.kicker")}
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-5 font-display text-balance text-3xl font-bold leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-5xl xl:text-[3.35rem]"
        >
          {t("landing.hero.title")}
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-4 max-w-md text-pretty text-sm font-medium leading-6 text-white/75 sm:mt-5 sm:text-lg sm:leading-7"
        >
          {t("landing.hero.subtitle")}
        </motion.p>

        <motion.ul
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-6"
        >
          {platforms.map((label) => (
            <li
              key={label}
              className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/90 shadow-sm backdrop-blur"
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
          className="mt-7 flex w-full flex-col justify-center gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap"
        >
          <Link
            href={signedIn ? "/app/characters" : "/sign-up"}
            onClick={() =>
              track("auth_cta_click", {
                placement: "landing_hero",
                target: signedIn ? "/app/characters" : "/sign-up",
              })
            }
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#c6f24b] px-8 py-3 text-sm font-semibold text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a] sm:w-auto sm:px-9"
          >
            {signedIn ? t("landing.hero.ctaWorkspace") : t("landing.hero.ctaStart")}
          </Link>
          <Link
            href="#use-cases"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 sm:w-auto sm:px-9"
          >
            {t("landing.hero.ctaUseCases")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
