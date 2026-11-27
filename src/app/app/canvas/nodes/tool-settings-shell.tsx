"use client";

// Frame for the Setting card: header, body, note, and the output handle.

import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { SlidersHorizontal } from "lucide-react";

export function ToolSettingsShell({
  isZh,
  title,
  color,
  selected,
  children,
}: {
  isZh: boolean;
  title: string;
  color: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative w-[280px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25" : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      <div className="flex items-center gap-1.5 border-b border-white/6 px-3 py-2">
        <span
          className="grid h-5 w-5 place-items-center rounded-md"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <SlidersHorizontal className="h-3 w-3" />
        </span>
        <span className="text-[11.5px] font-semibold text-white/90">{title}</span>
      </div>
      {/* min-w-0 lets variable rows shrink inside the fixed card width. */}
      <div className="flex min-w-0 flex-col gap-2.5 p-3">
        {children}
        <p className="text-[10.5px] leading-relaxed text-white/45">
          {isZh
            ? "改動在已連接的節點執行時生效，已生成的預覽會標示為舊版本。"
            : "Changes apply when the wired nodes run; existing previews show as old versions."}
        </p>
      </div>
      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{ width: 12, height: 12, backgroundColor: color, border: "2px solid #0b0e13" }}
      />
    </div>
  );
}
