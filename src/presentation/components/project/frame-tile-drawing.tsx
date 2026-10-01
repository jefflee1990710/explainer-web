"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

export function FrameTileDrawing() {
  const { t } = useI18n();
  return (
    <motion.div
      key="drawing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 overflow-hidden bg-accent-ink/5"
      aria-busy
      aria-label={t("production.frame.generatingAria")}
    >
      <motion.div
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute inset-0 grid place-items-center text-accent-ink/50">
        <span className="flex flex-col items-center gap-2">
          <Spinner className="h-5 w-5" />
          <span className="font-display text-[11px] font-bold">{t("production.frame.generating")}</span>
        </span>
      </span>
    </motion.div>
  );
}
