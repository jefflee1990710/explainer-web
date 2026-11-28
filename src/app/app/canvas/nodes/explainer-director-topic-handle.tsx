"use client";

// Left-edge topic port. Type on the card, or connect a text or Prompt node.

import { Handle, Position } from "@xyflow/react";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";

type Props = {
  wired: boolean;
  isZh: boolean;
};

export function ExplainerDirectorTopicHandle({ wired, isZh }: Props) {
  const color = PORT_COLOR_MAP.text;
  return (
    <div className="relative flex items-center justify-between border-b border-white/6 px-3 py-1.5 text-[11px]">
      <Handle
        type="target"
        id="prompt"
        position={Position.Left}
        title={isZh ? "主題（可輸入，或連接文字、提示詞）" : "Topic (type here, or connect text or a prompt)"}
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
        {isZh ? "主題" : "Topic"}
      </span>
      <span className="text-[10px] text-white/45">
        {wired ? (isZh ? "已連" : "Wired") : isZh ? "可輸入" : "Or type"}
      </span>
    </div>
  );
}
