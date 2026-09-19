"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/spinner";

const STORYBOARD_STAGES = [
  "閱讀題材，找出核心訊息…",
  "設計開場鉤子與延遲兌現…",
  "拆解分鏡與時間軸…",
  "撰寫旁白與對照翻譯…",
  "檢查角色鎖與視覺世界…",
];

// Animated "what is the AI doing right now" panel while Phase A runs. Stages
// are illustrative and rotate on a timer; the real completion comes from polling.
export function DirectorProgress() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % STORYBOARD_STAGES.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[1.5rem] border border-accent-ink/10 bg-accent-ink p-6 text-paper shadow-[8px_8px_0_0_rgba(255,77,46,0.9)]"
    >
      <motion.div
        aria-hidden
        className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime/30 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime text-accent-ink">
          <Spinner className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">導演正在寫分鏡</p>
          <div className="mt-1 h-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-paper/75"
              >
                {STORYBOARD_STAGES[index]}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-paper/15">
            <motion.div
              className="h-full w-1/3 rounded-full bg-lime"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="mt-3 text-xs text-paper/60">
            通常 20–60 秒。你可以留在這頁，完成後會自動顯示。
          </p>
        </div>
      </div>
    </motion.section>
  );
}
