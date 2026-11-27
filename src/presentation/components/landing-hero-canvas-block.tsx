"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import type { HeroBox } from "@/presentation/components/landing-hero-canvas-layout";

// Positions a child on the hero stage: `--u` is one design unit, `m` boxes apply on phones, `d` from sm up.
export const HERO_BOX_CLASS =
  "absolute left-[calc(var(--u)*var(--mx))] top-[calc(var(--u)*var(--my))] w-[calc(var(--u)*var(--mw))] h-[calc(var(--u)*var(--mh))] sm:left-[calc(var(--u)*var(--dx))] sm:top-[calc(var(--u)*var(--dy))] sm:w-[calc(var(--u)*var(--dw))] sm:h-[calc(var(--u)*var(--dh))]";

export function heroBoxStyle(box: { d: HeroBox; m: HeroBox }): CSSProperties {
  return {
    "--dx": box.d.x,
    "--dy": box.d.y,
    "--dw": box.d.w,
    "--dh": box.d.h,
    "--mx": box.m.x,
    "--my": box.m.y,
    "--mw": box.m.w,
    "--mh": box.m.h,
  } as CSSProperties;
}

// One canvas block card: colored header chip, title, status dot, and body.
export function HeroCanvasBlock({
  box,
  title,
  accent,
  status,
  highlight = false,
  delay = 0,
  children,
}: {
  box: { d: HeroBox; m: HeroBox };
  title: string;
  accent: string;
  status?: "done" | "running";
  highlight?: boolean;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
      className={`${HERO_BOX_CLASS} flex flex-col overflow-hidden rounded-[calc(var(--u)*14)] border bg-[#151821]/95 shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
        highlight ? "border-[#c6f24b]/60 ring-1 ring-[#c6f24b]/25" : "border-white/12"
      }`}
      style={heroBoxStyle(box)}
    >
      <div className="flex shrink-0 items-center gap-[calc(var(--u)*7)] border-b border-white/8 px-[calc(var(--u)*12)] py-[calc(var(--u)*8)]">
        <span
          className="h-[calc(var(--u)*8)] w-[calc(var(--u)*8)] shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
        <span className="truncate text-[calc(var(--u)*13)] font-bold leading-none text-white/90">
          {title}
        </span>
        {status ? (
          <span
            className={`ml-auto h-[calc(var(--u)*7)] w-[calc(var(--u)*7)] shrink-0 rounded-full ${
              status === "done" ? "bg-[#c6f24b]" : "animate-pulse bg-sky-400"
            }`}
          />
        ) : null}
      </div>
      <div className="relative min-h-0 flex-1 p-[calc(var(--u)*10)]">{children}</div>
    </motion.div>
  );
}
