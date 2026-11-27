"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { track } from "@/presentation/components/analytics/track";
import { canvasLaunchHref } from "@/presentation/components/canvas-launch-href";
import { useI18n } from "@/presentation/components/i18n-provider";
import { LandingHeroArt } from "@/presentation/components/landing-hero-art";

const ease = [0.25, 0.1, 0.25, 1] as const;

// Canvas-first hero: copy and CTAs beside a live-looking canvas window that builds a finished reel.
export function LandingHero({ signedIn = false }: { signedIn?: boolean }) {
  const { t, locale } = useI18n();
  const isZhHant = locale === "zh-Hant";
  const isZhHans = locale === "zh-Hans";
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1 + 0.1, duration: 0.7, ease },
    }),
  };
  const steps = isZhHant
    ? ["揀積木", "接好或問 AI 助理", "撳執行出片"]
    : isZhHans
      ? ["选积木", "接好或问 AI 助理", "点运行出片"]
      : ["Pick blocks", "Connect or ask the AI", "Run, get the reel"];
  const primaryLabel = isZhHant
    ? "⚡ 免費打開 Canvas 創作"
    : isZhHans
      ? "⚡ 免费打开 Canvas 创作"
      : "⚡ Start Creating on Canvas";
  const secondaryLabel = isZhHant ? "睇下點樣運作" : isZhHans ? "看看怎么运作" : "See How It Works";
  const quickPills = [
    { tpl: "talking-head" as const, label: isZhHant ? "🎙️ 真人口播" : isZhHans ? "🎙️ 真人口播" : "🎙️ Talking Head" },
    { tpl: "explainer" as const, label: isZhHant ? "📊 AI 解說" : isZhHans ? "📊 AI 解说" : "📊 AI Explainer" },
    { tpl: "scro-swap" as const, label: isZhHant ? "🎭 影片換角" : isZhHans ? "🎭 视频换角" : "🎭 Character Swap" },
    { tpl: "teleport" as const, label: isZhHant ? "🌍 實景換場" : isZhHans ? "🌍 实景换场" : "🌍 Scene Teleport" },
  ];

  // Height follows the content (no forced full viewport); copy sits beside the canvas from xl, stacked above it below.
  return (
    <section className="relative flex w-full flex-col overflow-hidden border-b border-[#272a36] bg-[#0d0e13]">
      {/* Ambient lime glow and faint studio grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 60% 45% at 70% 30%, rgba(198,242,75,0.16), transparent 70%)",
            "radial-gradient(ellipse 45% 40% at 10% 80%, rgba(198,242,75,0.07), transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(39,42,54,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,42,54,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, #000 25%, transparent 80%)",
        }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[90rem] flex-1 items-center gap-8 px-4 pb-10 pt-10 sm:px-6 sm:pt-14 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-12 xl:px-10 xl:py-14 2xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center xl:mx-0 xl:items-start xl:text-left">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 rounded-full border border-[#c6f24b]/35 bg-[#12141c]/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c6f24b] backdrop-blur sm:text-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
            {t("landing.hero.kicker")}
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 font-display text-balance text-3xl font-bold leading-[1.08] tracking-tight text-white sm:mt-6 sm:text-5xl xl:text-[3.2rem]"
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

          {/* Three-step flow summary */}
          <motion.ol
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 flex flex-wrap justify-center gap-2 sm:mt-6 xl:justify-start"
          >
            {steps.map((label, i) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-1 pr-3 text-xs font-semibold text-white/90"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c6f24b] text-[10px] font-black text-[#12141c]">
                  {i + 1}
                </span>
                {label}
              </li>
            ))}
          </motion.ol>

          <motion.div
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-7 flex w-full flex-col justify-center gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap xl:justify-start"
          >
            <Link
              href={canvasLaunchHref(signedIn)}
              onClick={() =>
                track("auth_cta_click", {
                  placement: "landing_hero_canvas",
                  target: canvasLaunchHref(signedIn),
                })
              }
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#c6f24b] px-8 py-3 text-sm font-black text-[#12141c] shadow-[0_12px_36px_rgba(198,242,75,0.32)] transition-transform hover:-translate-y-0.5 hover:bg-[#d4f76a] sm:w-auto"
            >
              {primaryLabel}
            </Link>
            <Link
              href="#canvas-showcase"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 sm:w-auto"
            >
              {secondaryLabel}
            </Link>
          </motion.div>

          <motion.div
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-4 flex flex-wrap justify-center gap-2 text-xs xl:justify-start"
          >
            {quickPills.map((pill) => (
              <Link
                key={pill.tpl}
                href={canvasLaunchHref(signedIn, pill.tpl)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-semibold text-white/85 transition hover:border-[#c6f24b]/50 hover:bg-[#c6f24b]/15 hover:text-[#c6f24b]"
              >
                {pill.label}
              </Link>
            ))}
          </motion.div>
        </div>

        <div className="mx-auto w-full max-w-[58rem] xl:max-w-[64rem]">
          <LandingHeroArt />
        </div>
      </div>
    </section>
  );
}
