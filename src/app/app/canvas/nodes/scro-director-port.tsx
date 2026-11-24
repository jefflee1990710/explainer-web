"use client";

// One left-side input row on a Swap or Teleport director card.

import { Handle, Position } from "@xyflow/react";

type Props = {
  id: string;
  label: string;
  detail: string;
  title: string;
  color: string;
  wired: boolean;
};

export function ScroDirectorPort({ id, label, detail, title, color, wired }: Props) {
  return (
    <div className="relative flex items-center justify-between border-b border-white/6 px-3 py-1.5 text-[11px]">
      <Handle
        type="target"
        id={id}
        position={Position.Left}
        title={title}
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
        {label}
      </span>
      <span className="max-w-[150px] truncate text-[10px] text-white/45">{detail}</span>
    </div>
  );
}
