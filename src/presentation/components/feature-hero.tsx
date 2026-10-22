"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ParallaxLayer } from "@/presentation/components/parallax-layer";

const ease = [0.25, 0.1, 0.25, 1] as const;

type HeroLink = { href: string; label: string };

type FeatureHeroProps = {
  brand: string;
  kicker: string;
  title: string;
  subtitle: string;
  primary: HeroLink;
  secondary: HeroLink;
  /** Hero still shown at its native ratio — width/height keep the box stable before load. */
  art: { src: string; width: number; height: number; alt?: string; widthClass?: string };
};

// Shared feature-page hero matching LandingHero's ink + lime film-studio stage: copy left, uncropped studio frame right.
export function FeatureHero({ brand, kicker, title, subtitle, primary, secondary, art }: FeatureHeroProps) {
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 + 0.12, duration: 0.7, ease },
    }),
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-black/40 bg-[#0a0c10]">
      {/* Ambient wash sampled from the hero art + subtle studio grid glow, matching LandingHero. */}
      <img
        src={art.src}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_22%,rgba(198,242,75,0.18),transparent_44%),radial-gradient(ellipse_at_88%_68%,rgba(198,242,75,0.12),transparent_42%),linear-gradient(180deg,rgba(10,12,16,0.52)_0%,rgba(10,12,16,0.84)_62%,#0a0c10_100%)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 md:px-8 lg:min-h-[40rem] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-20">
        <div className="max-w-xl">
          <motion.p
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-display text-4xl font-bold tracking-tight text-[#c6f24b] sm:text-5xl"
          >
            {brand}
          </motion.p>
          <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#c6f24b] shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
            {kicker}
          </motion.div>
          <motion.h1
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-6 font-display text-balance text-3xl font-bold leading-[1.06] tracking-tight text-white sm:text-4xl xl:text-[2.85rem]"
          >
            {title}
          </motion.h1>
          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 max-w-lg text-pretty text-base font-medium leading-7 text-white/75 sm:text-lg"
          >
            {subtitle}
          </motion.p>
          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              href={primary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c6f24b] px-7 py-3 text-sm font-semibold text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a]"
            >
              {primary.label}
            </Link>
            <Link
              href={secondary.href}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 bg-white/10 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              {secondary.label}
            </Link>
          </motion.div>
        </div>

        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.75, ease }}
          className={`relative mx-auto w-full lg:mr-0 ${art.widthClass ?? ""}`}
        >
          <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-[#c6f24b]/14 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#12141c] p-2 shadow-[0_28px_72px_rgba(0,0,0,0.55)]">
            <ParallaxLayer distance={12}>
              <img
                src={art.src}
                alt={art.alt ?? ""}
                width={art.width}
                height={art.height}
                className="block h-auto w-full rounded-xl"
              />
            </ParallaxLayer>
          </div>
        </motion.figure>
      </div>
    </section>
  );
}
