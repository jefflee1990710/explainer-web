"use client";

import { Loader2 } from "lucide-react";

// Covers the editor while another canvas loads after picking it in the library.
export function CanvasSwitchOverlay({ isZh }: { isZh: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b0e13]/70 backdrop-blur-sm"
    >
      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#12161f] px-4 py-3 text-sm text-white/80 shadow-2xl">
        <Loader2 className="size-4 animate-spin text-sky-300" />
        {isZh ? "正在載入畫布…" : "Loading canvas…"}
      </div>
    </div>
  );
}
