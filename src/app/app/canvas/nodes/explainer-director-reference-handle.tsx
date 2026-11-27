"use client";

// Left-edge image port on the Explainer Director. A connected picture becomes the planned character.

import { Handle, Position } from "@xyflow/react";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";

type Props = {
  wired: boolean;
  isZh: boolean;
};

export function ExplainerDirectorReferenceHandle({ wired, isZh }: Props) {
  const color = PORT_COLOR_MAP.image;
  return (
    <div className="relative flex items-center justify-between border-b border-white/6 px-3 py-1.5 text-[11px]">
      <Handle
        type="target"
        id="refImages"
        position={Position.Left}
        title={isZh ? "角色參考圖。規劃時用這張圖建立或填入角色節點。" : "Character reference. Plan creates or fills a character node from this image."}
        style={{
          width: 11,
          height: 11,
          backgroundColor: wired ? color : "#12161f",
          border: `2px solid ${color}`,
          left: -6,
        }}
      />
      <span className="flex items-center gap-1.5 text-white/80">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {isZh ? "參考圖" : "Reference"}
      </span>
      <span className="text-[10px] text-white/45">
        {wired ? (isZh ? "已連" : "Wired") : isZh ? "可接" : "Optional"}
      </span>
    </div>
  );
}
