"use client";

import { motion } from "framer-motion";
import { Boxes, Cable, Play, Sparkles } from "lucide-react";
import type { ShowcaseStep } from "@/presentation/components/landing-canvas-showcase-copy";

const ICONS = [Boxes, Cable, Sparkles, Play] as const;

// Numbered step list; the active step shows a progress bar while the walkthrough auto-plays.
export function ShowcaseSteps({
  steps,
  active,
  autoPlay,
  durationMs,
  onSelect,
}: {
  steps: readonly ShowcaseStep[];
  active: number;
  autoPlay: boolean;
  durationMs: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, i) => {
        const Icon = ICONS[i] ?? Play;
        const isActive = i === active;
        const isDone = i < active;
        return (
          <li key={step.title}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={isActive ? "step" : undefined}
              className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border p-4 text-left transition sm:p-5 ${
                isActive
                  ? "border-[#12141c] bg-[#12141c] text-white shadow-[0_16px_40px_rgba(18,20,28,0.18)]"
                  : "border-[#e4e4e7] bg-white text-[#12141c] hover:border-[#12141c]/30"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    isActive
                      ? "bg-[#c6f24b] text-[#12141c]"
                      : isDone
                        ? "bg-[#f4fcd4] text-[#12141c]"
                        : "bg-[#f4f4f5] text-[#5c6170]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-[#c6f24b]" : "text-[#8a8f9c]"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-0.5 font-display text-base font-bold leading-snug sm:text-lg">{step.title}</p>
                  <p className={`mt-1 text-sm leading-6 ${isActive ? "text-white/70" : "text-[#5c6170]"}`}>{step.body}</p>
                </div>
              </div>
              {isActive && autoPlay ? (
                <motion.span
                  key={`bar-${active}`}
                  aria-hidden
                  className="absolute bottom-0 left-0 h-0.5 bg-[#c6f24b]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: durationMs / 1000, ease: "linear" }}
                />
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
