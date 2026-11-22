"use client";

// Slim stand-in for the model panel, so the canvas keeps the width and the panel can open again.

import { PanelLeftOpen } from "lucide-react";

export function CanvasSidebarRail({
  label,
  onExpand,
}: {
  label: string;
  onExpand: () => void;
}) {
  return (
    <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-white/8 bg-[#0e121a]/95 py-2">
      <button
        type="button"
        onClick={onExpand}
        aria-label={label}
        aria-expanded={false}
        title={label}
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#c6f24b]/15 text-[#c6f24b] transition hover:bg-[#c6f24b]/25"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
    </aside>
  );
}
