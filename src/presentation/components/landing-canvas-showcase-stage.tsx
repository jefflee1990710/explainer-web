"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, MousePointer2, Play, Sparkles } from "lucide-react";
import type { CanvasPublicTemplateCard } from "@/presentation/components/canvas-launch-href";
import type { ShowcaseCopy } from "@/presentation/components/landing-canvas-showcase-copy";
import type { HeroLang } from "@/presentation/components/landing-hero-canvas-copy";

const BLOCK_ACCENTS = ["#a78bfa", "#38bdf8", "#fb923c"] as const;

// Mini canvas that acts out the active step: blocks land, wires connect, the assistant answers, Run renders the reel.
export function ShowcaseStage({
  step,
  template,
  lang,
  copy,
}: {
  step: number;
  template: CanvasPublicTemplateCard;
  lang: HeroLang;
  copy: ShowcaseCopy;
}) {
  const labels = template.steps[lang];
  const connected = step >= 1;
  const asking = step === 2;
  const running = step >= 3;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#252c3b] bg-[#0e121a] text-white shadow-[0_24px_60px_rgba(18,20,28,0.18)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#12161f] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </span>
        <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-white/55">
          {copy.stageTitle} · {template.title[lang]}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black transition ${
            running
              ? "bg-[#c6f24b] text-[#12141c] shadow-[0_0_0_4px_rgba(198,242,75,0.2)]"
              : "bg-white/10 text-white/60"
          }`}
        >
          <Play className="h-3 w-3 fill-current" />
          {copy.run}
        </span>
      </div>

      <div
        className="relative grid grid-cols-[minmax(0,1fr)_7.5rem] gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-6 sm:p-6"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1.2px)",
          backgroundSize: "20px 20px",
        }}
      >
        {/* Input blocks stacked with vertical wires between them */}
        <div className="flex flex-col justify-center">
          {labels.map((label, i) => (
            <div key={`${template.id}-${label}`}>
              <motion.div
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                className={`relative flex items-center gap-2.5 rounded-xl border bg-[#151a25] px-3 py-2.5 sm:px-4 sm:py-3 ${
                  connected ? "border-[#c6f24b]/35" : "border-white/12"
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: BLOCK_ACCENTS[i % 3] }} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{label}</span>
                {running ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.35 }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c6f24b] text-[#12141c]"
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </motion.span>
                ) : null}
                {/* Cursor dragging the first block in on step 1 */}
                {step === 0 && i === 0 ? (
                  <motion.span
                    aria-hidden
                    className="absolute -bottom-3 right-6 text-white"
                    initial={{ x: -40, y: 20, opacity: 0 }}
                    animate={{ x: 0, y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 0.6 }}
                  >
                    <MousePointer2 className="h-5 w-5 fill-white" />
                  </motion.span>
                ) : null}
              </motion.div>
              {i < labels.length - 1 ? (
                <div className="ml-6 h-5 w-0.5 overflow-hidden bg-white/10 sm:h-6">
                  <motion.div
                    className="w-full bg-[#c6f24b]"
                    initial={false}
                    animate={{ height: connected ? "100%" : "0%" }}
                    transition={{ delay: connected ? i * 0.25 : 0, duration: 0.35 }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Output reel with a wire coming in from the blocks */}
        <div className="relative">
          <div className="absolute -left-4 top-1/2 h-0.5 w-4 overflow-hidden bg-white/10 sm:-left-6 sm:w-6">
            <motion.div
              className="h-full bg-[#c6f24b]"
              initial={false}
              animate={{ width: connected ? "100%" : "0%" }}
              transition={{ delay: connected ? 0.5 : 0, duration: 0.3 }}
            />
          </div>
          <div
            className={`relative aspect-[9/16] overflow-hidden rounded-2xl border bg-black ${
              running ? "border-[#c6f24b]/60" : "border-dashed border-white/20"
            }`}
          >
            {running && template.videoUrl ? (
              <video
                key={template.id}
                src={template.videoUrl}
                poster={template.posterUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={template.posterUrl}
                  alt=""
                  className={`h-full w-full object-cover transition ${running ? "" : "opacity-20 blur-[2px]"}`}
                />
                {!running ? (
                  <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 text-center text-[11px] font-semibold text-white/60 sm:text-xs">
                    {copy.placeholder}
                  </span>
                ) : null}
              </>
            )}
            {running ? (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-[#c6f24b]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c6f24b]" />
                {copy.ready}
              </span>
            ) : null}
          </div>
        </div>

        {/* Assistant bubble overlays the stage on step 3 */}
        <AnimatePresence>
          {asking ? (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-x-3 bottom-3 rounded-2xl border border-[#c6f24b]/30 bg-[#11151e]/95 p-3.5 shadow-2xl backdrop-blur sm:inset-x-6 sm:bottom-6 sm:right-[14rem] sm:p-4"
            >
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#c6f24b]">
                <Sparkles className="h-3.5 w-3.5" />
                {copy.assistant}
              </p>
              <p className="mt-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white/90">
                “{template.aiPromptExample[lang]}”
              </p>
              <p className="mt-1.5 text-xs text-white/60">{copy.assistantReply}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
