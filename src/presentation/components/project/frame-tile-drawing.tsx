"use client";

import { motion } from "framer-motion";
import { Spinner } from "@/presentation/components/spinner";

// Sweep + spinner while this scene image is queued or with the provider.
export function FrameTileDrawing() {
  return (
    <motion.div
      key="drawing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 overflow-hidden bg-accent-ink/5"
      aria-busy
      aria-label="畫格產生中"
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute inset-0 grid place-items-center text-accent-ink/50">
        <span className="flex flex-col items-center gap-2">
          <Spinner className="h-5 w-5" />
          <span className="font-display text-[11px] font-bold">生成中</span>
        </span>
      </span>
    </motion.div>
  );
}
