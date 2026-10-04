"use client";

import { motion } from "framer-motion";
import { Spinner } from "@/presentation/components/spinner";

// Shimmer shown on a filmstrip thumb while that clip's still or video is generating.
export function FilmstripGenerating() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--studio-ink)]/10" aria-hidden>
      <motion.span
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute inset-0 grid place-items-center text-[var(--studio-ink)]">
        <Spinner className="h-4 w-4" />
      </span>
    </span>
  );
}
