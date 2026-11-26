import { Handle, Position } from "@xyflow/react";
import {
  PORT_COLOR_MAP,
} from "@/app/app/canvas/nodes/port-colors";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";

export function ModelNodeCardPorts(view: ModelNodeCardView) {
  const { isZh, spec, incomingByHandle } = view;
  return (
    <>
{/* Typed input handle rows */}
<div className="space-y-1 border-b border-white/6 py-2">
  {spec.inputs.map((port) => {
    const count = incomingByHandle.get(port.id) ?? 0;
    const color = PORT_COLOR_MAP[port.type];
    const label = isZh ? port.labels["zh-Hant"] : port.labels.en;
    return (
      <div
        key={port.id}
        className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]"
      >
        <Handle
          type="target"
          id={port.id}
          position={Position.Left}
          style={{
            width: 11,
            height: 11,
            backgroundColor: count > 0 ? color : "#12161f",
            border: `2px solid ${color}`,
            left: -6,
          }}
        />
        <span className="flex items-center gap-1.5 text-white/80">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{label}</span>
          {port.required ? (
            <span className="text-[9.5px] font-semibold text-amber-300/90">
              *
            </span>
          ) : null}
        </span>
        <span className="text-[10px] text-white/45">
          {port.multiple
            ? `${count}/${port.maxConnections}`
            : count > 0
              ? isZh
                ? "已連"
                : "Wired"
              : port.id === "prompt"
                ? isZh
                  ? "下方輸入"
                  : "Inline"
                : isZh
                  ? "選填"
                  : "Optional"}
        </span>
      </div>
    );
  })}
</div>
    </>
  );
}
