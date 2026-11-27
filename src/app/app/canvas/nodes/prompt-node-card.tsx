"use client";

// Prompt node card: reusable text prompt that can fan out to multiple model nodes for A/B comparison.
// `{{key}}` placeholders are filled from the Setting wired here.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2, Type } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { wiredSettingsVars } from "@/service/canvas/core/graph";
import { PromptVarsHint } from "@/app/app/canvas/nodes/prompt-vars-hint";
import { CanvasTextDialogField, CanvasTextSettings, SettingsInputRow } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
import {
  PORT_COLOR_MAP,
  useCanvasNodeActions,
} from "@/app/app/canvas/nodes/port-colors";

export function PromptNodeCard({
  id,
  data,
  selected,
}: NodeProps & { data: CanvasNodeData }) {
  const { locale, nodes, edges, onUpdateNodeData, onDeleteNode } = useCanvasNodeActions();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const color = PORT_COLOR_MAP.text;
  const text = data.text ?? "";

  return (
    <CanvasTextSettings nodeId={id} nodes={nodes} edges={edges} isZh={isZh}>
    <div
      className={`relative w-[264px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all ${
        selected
          ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/25"
          : "border-[#252c3b] hover:border-[#374157]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/6 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span
            className="grid h-5 w-5 place-items-center rounded-md"
            style={{ backgroundColor: `${color}22`, color }}
          >
            <Type className="h-3 w-3" />
          </span>
          <span className="text-[11.5px] font-semibold text-white/90">
            {isZh ? "共用提示詞 Prompt" : "Shared Prompt"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDeleteNode(id)}
          title="Delete node"
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <SettingsInputRow />

      {/* Editable prompt body */}
      <div className="space-y-1.5 p-2.5">
        <CanvasTextDialogField
          value={text}
          onValue={(next) => onUpdateNodeData(id, { text: next })}
          rows={4}
          dialogLabel={isZh ? "編輯提示詞" : "Edit prompt"}
          placeholder={
            isZh
              ? "輸入提示詞，可用 {{key}} 留位，由設定填入…"
              : "Write a prompt; use {{key}} for values a Setting fills in…"
          }
          className="nodrag nowheel w-full resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-[12px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none"
        />
        <PromptVarsHint isZh={isZh} text={text} vars={wiredSettingsVars(id, nodes, edges)} missingBlocksRun={false} />
        <div className="flex items-center justify-between text-[10.5px] text-white/45">
          <span>{text.length} chars</span>
          <span className="flex items-center gap-1 font-medium" style={{ color }}>
            Text
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          </span>
        </div>
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          backgroundColor: color,
          border: "2px solid #0b0e13",
        }}
      />
    </div>
    </CanvasTextSettings>
  );
}
