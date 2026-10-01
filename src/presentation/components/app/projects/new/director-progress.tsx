"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

const STAGE_KEYS = [
  "brief.director.stageReadSource",
  "brief.director.stageHook",
  "brief.director.stageTimeline",
  "brief.director.stageVo",
  "brief.director.stageLocks",
] as const;

// Animated "what is the AI doing right now" panel while Phase A runs. Stages
// are illustrative and rotate on a timer; the real completion comes from polling.
export function DirectorProgress() {
  const { t } = useI18n();
  const stages = useMemo(() => STAGE_KEYS.map((key) => t(key)), [t]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % stages.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [stages.length]);

  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-accent-ink/10 bg-paper p-6 text-foreground shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
    >
      <motion.div
        aria-hidden
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime/40 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-accent-ink/10 bg-lime/50 text-accent-ink">
          <Spinner className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-accent-ink">{t("brief.director.title")}</p>
          <div className="mt-1 h-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-muted"
              >
                {stages[index]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-accent-ink/10">
            <motion.div
              className="h-full w-1/3 rounded-full bg-accent-ink"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="mt-3 text-xs text-muted">{t("brief.director.eta")}</p>
        </div>
      </div>
    </motion.section>
  );
}
