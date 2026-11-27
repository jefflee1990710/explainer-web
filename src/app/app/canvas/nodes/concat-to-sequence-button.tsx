"use client";

// Concat card action: replace this concat (and the concats feeding only it) with one Sequence.

import { Rows3 } from "lucide-react";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

export function ConcatToSequenceButton({ nodeId, isZh }: { nodeId: string; isZh: boolean }) {
  const { onConvertConcat } = useCanvasNodeActions();
  if (!onConvertConcat) return null;
  return (
    <button
      type="button"
      title={isZh ? "改用時間線編輯，可加文字、圖片和背景音樂" : "Edit as a timeline with text, images, and music"}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onConvertConcat(nodeId);
      }}
      className="nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-white/12 bg-white/5 px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
    >
      <Rows3 className="h-3 w-3" />
      {isZh ? "轉為時間線" : "Convert to Sequence"}
    </button>
  );
}
