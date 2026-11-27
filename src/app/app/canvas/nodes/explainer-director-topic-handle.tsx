"use client";

// Left-edge text port on the Explainer Director. Topic is only this connection.

import { Handle, Position } from "@xyflow/react";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";

type Props = {
  wired: boolean;
  isZh: boolean;
};

export function ExplainerDirectorTopicHandle({ wired, isZh }: Props) {
  const color = PORT_COLOR_MAP.text;
  return (
    <Handle
      type="target"
      id="prompt"
      position={Position.Left}
      title={isZh ? "主題（連接文字或提示詞）" : "Topic (connect text or a prompt)"}
      style={{
        width: 11,
        height: 11,
        backgroundColor: wired ? color : "#12161f",
        border: `2px solid ${color}`,
        left: -6,
        // Sits on the title row so the reference port below can take the next row.
        top: 20,
      }}
    />
  );
}
