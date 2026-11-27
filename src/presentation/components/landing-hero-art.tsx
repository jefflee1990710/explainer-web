"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { HeroAssistant } from "@/presentation/components/landing-hero-assistant";
import { HeroCanvasBlock } from "@/presentation/components/landing-hero-canvas-block";
import { HERO_CANVAS_COPY, heroLang } from "@/presentation/components/landing-hero-canvas-copy";
import { HERO_BLOCKS } from "@/presentation/components/landing-hero-canvas-layout";
import { HeroCanvasWires } from "@/presentation/components/landing-hero-canvas-wires";
import { useI18n } from "@/presentation/components/i18n-provider";

const WAVE = [6, 14, 9, 20, 12, 24, 16, 10, 22, 13, 7, 18, 11, 21, 9, 15, 6, 12, 19, 8];

// Waveform bars drawn in SVG for voice and mix blocks.
function Waveform({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className={className} aria-hidden>
      {WAVE.map((h, i) => (
        <rect key={i} x={i * 5 + 1} y={13 - h / 2} width={3} height={h} rx={1.5} fill="#c6f24b" opacity={0.85} />
      ))}
    </svg>
  );
}

// Hero canvas window: six connected blocks, the AI Assistant, and the finished reel they produce.
export function LandingHeroArt() {
  const { t, locale } = useI18n();
  const copy = HERO_CANVAS_COPY[heroLang(locale)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.7 }}
      className="relative w-full overflow-hidden rounded-2xl border border-[#272a36] bg-[#0f1117] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
      role="img"
      aria-label={t("landing.hero.artLabel")}
    >
      {/* Window chrome so the stage reads as the Canvas app */}
      <div className="flex items-center gap-2 border-b border-[#272a36] bg-[#12141c] px-3 py-2 sm:px-4">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </span>
        <span className="min-w-0 flex-1 truncate text-center text-[11px] font-semibold text-white/55 sm:text-xs">
          {copy.windowTitle}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#c6f24b] px-2.5 py-1 text-[10px] font-black text-[#12141c] sm:text-[11px]">
          <Play className="h-3 w-3 fill-current" />
          {copy.run}
        </span>
      </div>

      <div className="@container">
        {/* --u is one design unit: 1/400 of the width on phones, 1/1000 from sm up */}
        <div
          className="relative aspect-[400/604] w-full bg-[#0d0e13] [--u:calc(100cqw/400)] sm:aspect-[1000/640] sm:[--u:calc(100cqw/1000)]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.2px), radial-gradient(ellipse 60% 55% at 70% 40%, rgba(198,242,75,0.10), transparent 70%)",
            backgroundSize: "22px 22px, 100% 100%",
          }}
        >
          <HeroCanvasWires layout="d" />
          <HeroCanvasWires layout="m" />

          <HeroCanvasBlock box={HERO_BLOCKS.prompt} title={copy.prompt} accent="#a78bfa" status="done" delay={0.3}>
            <p className="line-clamp-4 text-[calc(var(--u)*13)] font-medium leading-snug text-white/80">
              “{copy.promptText}”
            </p>
          </HeroCanvasBlock>

          <HeroCanvasBlock box={HERO_BLOCKS.character} title={copy.character} accent="#f472b6" status="done" delay={0.4}>
            <div className="relative h-full overflow-hidden rounded-[calc(var(--u)*9)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero/cast/fresh/mei-portrait.webp" alt="" className="h-full w-full object-cover object-top" />
              <span className="absolute inset-x-[calc(var(--u)*6)] bottom-[calc(var(--u)*6)] truncate rounded-full bg-black/65 px-[calc(var(--u)*8)] py-[calc(var(--u)*3)] text-[calc(var(--u)*11)] font-semibold text-white">
                {copy.characterName}
              </span>
            </div>
          </HeroCanvasBlock>

          <HeroCanvasBlock box={HERO_BLOCKS.voice} title={copy.voice} accent="#38bdf8" status="done" delay={0.5}>
            <div className="flex h-full flex-col justify-between gap-[calc(var(--u)*4)]">
              <Waveform className="h-[calc(var(--u)*30)] w-full" />
              <span className="truncate text-[calc(var(--u)*11)] font-medium text-white/60">{copy.voiceText}</span>
            </div>
          </HeroCanvasBlock>

          <HeroCanvasBlock box={HERO_BLOCKS.video} title={copy.video} accent="#fb923c" status="running" delay={0.65}>
            <div className="flex h-full flex-col gap-[calc(var(--u)*7)]">
              <div className="grid min-h-0 flex-1 grid-cols-3 gap-[calc(var(--u)*5)]">
                {["left", "center", "right"].map((pos) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={pos}
                    src={`/hero/tools/explainer/${pos}.webp`}
                    alt=""
                    className="h-full w-full rounded-[calc(var(--u)*7)] object-cover"
                  />
                ))}
              </div>
              <div className="shrink-0">
                <div className="h-[calc(var(--u)*5)] overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-sky-400"
                    initial={{ width: "12%" }}
                    animate={{ width: ["12%", "100%"] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
                <span className="mt-[calc(var(--u)*4)] block truncate text-[calc(var(--u)*11)] font-medium text-white/60">
                  {copy.rendering}
                </span>
              </div>
            </div>
          </HeroCanvasBlock>

          <HeroCanvasBlock box={HERO_BLOCKS.mix} title={copy.mix} accent="#c6f24b" status="running" delay={0.8}>
            <div className="flex h-full flex-col justify-between gap-[calc(var(--u)*5)]">
              <div className="flex gap-[calc(var(--u)*4)]">
                {["#fb923c", "#f472b6", "#a78bfa"].map((c) => (
                  <span key={c} className="h-[calc(var(--u)*14)] flex-1 rounded-[calc(var(--u)*4)]" style={{ backgroundColor: c, opacity: 0.8 }} />
                ))}
              </div>
              <Waveform className="h-[calc(var(--u)*16)] w-full opacity-70" />
              <span className="truncate text-[calc(var(--u)*11)] font-medium text-white/60">{copy.mixText}</span>
            </div>
          </HeroCanvasBlock>

          <HeroCanvasBlock box={HERO_BLOCKS.reel} title={copy.reel} accent="#c6f24b" status="done" highlight delay={0.95}>
            <div className="relative h-full overflow-hidden rounded-[calc(var(--u)*10)] bg-black">
              <video
                src="/hero/tools/explainer/center.mp4"
                poster="/hero/tools/explainer/center.webp"
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
              <span className="absolute left-[calc(var(--u)*8)] top-[calc(var(--u)*8)] inline-flex items-center gap-[calc(var(--u)*4)] rounded-full bg-black/70 px-[calc(var(--u)*8)] py-[calc(var(--u)*3)] text-[calc(var(--u)*11)] font-bold text-[#c6f24b]">
                <span className="h-[calc(var(--u)*6)] w-[calc(var(--u)*6)] rounded-full bg-[#c6f24b]" />
                {copy.ready}
              </span>
            </div>
          </HeroCanvasBlock>

          <HeroAssistant copy={copy} />
        </div>
      </div>
    </motion.div>
  );
}
