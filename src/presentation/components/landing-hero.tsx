"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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

  // Exactly the viewport under the sticky header, so Life posts and the Explainer both stay on screen.
  return (
    <section className="relative flex w-full flex-col overflow-hidden border-b border-black/40 bg-[#0a0c10] lg:h-[calc(100dvh-4rem)]">
      <div className="order-2 lg:order-1 lg:contents">
        <LandingHeroArt />
      </div>

      <div className="relative z-10 order-1 mx-auto flex w-full max-w-xl flex-col items-center px-6 pb-4 pt-14 text-center lg:absolute lg:inset-x-0 lg:top-1/2 lg:max-w-[34rem] lg:-translate-y-[54%] lg:px-8 lg:py-0 xl:max-w-[38rem]">
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b] shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
          {t("landing.hero.kicker")}
        </motion.div>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 font-display text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl xl:text-[3.35rem]"
        >
          {t("landing.hero.title")}
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-5 max-w-md text-pretty text-base font-medium leading-7 text-white/75 sm:text-lg"
        >
          {t("landing.hero.subtitle")}
        </motion.p>

        <motion.ul
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 flex flex-wrap justify-center gap-2"
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
          className="mt-9 flex flex-wrap justify-center gap-3"
        >
          <Link
            href={signedIn ? "/app/characters" : "/sign-up"}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c6f24b] px-9 py-3 text-sm font-semibold text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a]"
          >
            {signedIn ? t("landing.hero.ctaWorkspace") : t("landing.hero.ctaStart")}
          </Link>
          <Link
            href="#use-cases"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-9 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
          >
            {t("landing.hero.ctaUseCases")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
