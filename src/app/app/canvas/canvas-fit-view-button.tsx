"use client";

// Fit-all control sitting on the canvas, bottom-right. Scan is the frame icon, not fullscreen.
import { Scan } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

export function CanvasFitViewButton({ isZh }: { isZh: boolean }) {
  const { fitView } = useReactFlow();
  return (
    <button
      type="button"
      title={isZh ? "縮放至全部節點" : "Fit view"}
      onClick={() => void fitView({ padding: 0.2, duration: 250 })}
      className="grid h-8 w-8 cursor-pointer place-items-center rounded-[10px] border border-white/10 bg-[#12161f]/90 text-white/75 shadow-lg backdrop-blur-md transition hover:border-white/20 hover:text-white"
    >
      <Scan className="h-3.5 w-3.5" />
    </button>
  );
}
