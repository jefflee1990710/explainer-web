"use client";

// Variable port on a text-model card. It sits left of the prompt; a Setting node still connects here.

import { Handle, Position } from "@xyflow/react";
import { useCanvasTextSettings, variablePortCopy } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
import { SETTING_COLOR } from "@/app/app/canvas/nodes/settings-node-card";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";

export function TextModelVariablePort({ isZh }: { isZh: boolean }) {
  const { connected } = useCanvasTextSettings();
  const color = connected ? SETTING_COLOR : "#64748b";
  const copy = variablePortCopy(isZh);
  const status = connected ? (isZh ? "已連" : "Wired") : isZh ? "選填" : "Optional";
  return (
    <div
      data-variable-port=""
      className="relative flex w-[58px] shrink-0 flex-col items-center justify-center gap-0.5 self-stretch text-center"
    >
      <Handle
        type="target"
        id={SETTINGS_HANDLE}
        position={Position.Left}
        title={copy.title}
        style={{
          width: 11,
          height: 11,
          backgroundColor: connected ? SETTING_COLOR : "#0b0e13",
          border: `2px solid ${color}`,
          // The card body is padded 12px. -18px puts the dot 6px outside the card, like the other ports.
          left: -18,
        }}
      />
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] leading-tight text-white/80">{copy.label}</span>
      <span className="text-[9px] leading-tight text-white/45">{status}</span>
    </div>
  );
}
