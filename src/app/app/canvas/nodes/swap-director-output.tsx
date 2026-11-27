"use client";

// Video output on the Scro Swap Director, so a downstream node can be wired and join the group.

import { Handle, Position } from "@xyflow/react";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";

export function SwapDirectorOutput() {
  return (
    <Handle
      type="source"
      id="output"
      position={Position.Right}
      title="Video"
      style={{
        width: 13,
        height: 13,
        backgroundColor: PORT_COLOR_MAP.video,
        border: "2px solid #0b0e13",
      }}
    />
  );
}
