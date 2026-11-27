"use client";

import { motion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import { HERO_BOX_CLASS, heroBoxStyle } from "@/presentation/components/landing-hero-canvas-block";
import type { HeroCanvasCopy } from "@/presentation/components/landing-hero-canvas-copy";
import { HERO_ASSISTANT } from "@/presentation/components/landing-hero-canvas-layout";

// AI Assistant chat card on the hero stage: the ask, the reply, and the Run pill.
export function HeroAssistant({ copy }: { copy: HeroCanvasCopy }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.05, duration: 0.6 }}
      className={`${HERO_BOX_CLASS} flex flex-col justify-center gap-[calc(var(--u)*8)] rounded-[calc(var(--u)*16)] border border-[#c6f24b]/30 bg-[#11141b]/95 p-[calc(var(--u)*12)] shadow-[0_18px_44px_rgba(0,0,0,0.5)] backdrop-blur sm:flex-row sm:items-center`}
      style={heroBoxStyle(HERO_ASSISTANT)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[calc(var(--u)*6)]">
        <span className="inline-flex items-center gap-[calc(var(--u)*5)] text-[calc(var(--u)*11)] font-bold uppercase tracking-wider text-[#c6f24b]">
          <Sparkles className="h-[calc(var(--u)*12)] w-[calc(var(--u)*12)]" />
          {copy.assistant}
        </span>
        <p className="self-start rounded-[calc(var(--u)*10)] bg-white/10 px-[calc(var(--u)*9)] py-[calc(var(--u)*5)] text-[calc(var(--u)*12)] font-medium leading-snug text-white/90">
          {copy.ask}
        </p>
        <p className="text-[calc(var(--u)*12)] leading-snug text-white/65">{copy.reply}</p>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center gap-[calc(var(--u)*5)] self-start rounded-full bg-[#c6f24b] px-[calc(var(--u)*14)] py-[calc(var(--u)*7)] text-[calc(var(--u)*13)] font-black text-[#12141c] shadow-[0_8px_24px_rgba(198,242,75,0.35)] sm:self-center">
        <Play className="h-[calc(var(--u)*11)] w-[calc(var(--u)*11)] fill-current" />
        {copy.run}
      </span>
    </motion.div>
  );
}
