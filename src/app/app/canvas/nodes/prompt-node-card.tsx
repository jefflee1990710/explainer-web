"use client";

// Prompt node card: reusable text prompt that can fan out to multiple model nodes for A/B comparison.
// `{{key}}` placeholders are filled from the Setting wired here, or from each model's own Setting.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2, Type } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { wiredSettingsVars } from "@/service/canvas/graph";
import { SETTING_COLOR } from "@/app/app/canvas/nodes/settings-node-card";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import { PromptVarsHint } from "@/app/app/canvas/nodes/prompt-vars-hint";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
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
  const settingsEdge = edges.find((e) => e.target === id && e.targetHandle === SETTINGS_HANDLE);
  const settingsColor = settingsEdge && nodes.some((n) => n.id === settingsEdge.source) ? SETTING_COLOR : undefined;

  return (
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

      {/* Setting input: fills `{{key}}` placeholders in this text */}
      <div className="relative flex items-center justify-between px-3 pt-2 text-[11px]">
        <Handle
          type="target"
          id={SETTINGS_HANDLE}
          position={Position.Left}
          style={{
            width: 11,
            height: 11,
            backgroundColor: settingsColor ?? "#0b0e13",
            border: `2px solid ${settingsColor ?? "#64748b"}`,
            left: -6,
          }}
        />
        <span className="flex items-center gap-1.5 text-white/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: settingsColor ?? "#64748b" }} />
          {isZh ? "設定" : "Setting"}
        </span>
        <span className="text-[10px] text-white/45">
          {settingsColor ? (isZh ? "已連" : "Wired") : isZh ? "選填" : "Optional"}
        </span>
      </div>

      {/* Editable prompt body */}
      <div className="space-y-1.5 p-2.5">
        <ComposedTextarea
          value={text}
          onValue={(next) => onUpdateNodeData(id, { text: next })}
          rows={4}
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
  );
}
