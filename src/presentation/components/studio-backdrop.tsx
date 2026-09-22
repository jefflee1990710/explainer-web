"use client";

import { motion } from "framer-motion";

// Floating color washes that give the studio an art-director atmosphere.
export function StudioBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime/50 blur-3xl"
        animate={{ x: [0, 30, -10, 0], y: [0, 20, -15, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-accent/35 blur-3xl"
        animate={{ x: [0, -25, 15, 0], y: [0, -18, 22, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-teal/30 blur-3xl"
        animate={{ x: [0, 20, -20, 0], y: [0, -25, 10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="studio-grid absolute inset-0 opacity-60" />
    </div>
  );
}
