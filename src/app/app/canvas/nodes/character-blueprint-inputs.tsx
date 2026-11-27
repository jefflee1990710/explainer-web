// Reference photos and the outfit slots on an empty character card.

import { Handle, Position } from "@xyflow/react";
import { CHARACTER_OUTFIT_PORTS } from "@/service/canvas/core/character-node";
import { CHARACTER_BLUEPRINT_REF_MAX } from "@/service/canvas/core/character-blueprint";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";

type Props = {
  isZh: boolean;
  prompt: string;
  promptWired: boolean;
  busy: boolean;
  counts: ReadonlyMap<string, number>;
  onPrompt: (prompt: string) => void;
};

function portDot(connected: boolean, color: string) {
  return {
    width: 11,
    height: 11,
    backgroundColor: connected ? color : "#12161f",
    border: `2px solid ${color}`,
    left: -6,
  };
}

export function CharacterBlueprintInputs({
  isZh,
  prompt,
  promptWired,
  busy,
  counts,
  onPrompt,
}: Props) {
  const image = PORT_COLOR_MAP.image;
  const text = PORT_COLOR_MAP.text;
  const refCount = counts.get("refImages") ?? 0;

  return (
    <div className="space-y-1 border-y border-white/6 py-2">
      <div className="relative flex items-center gap-2 px-3.5 py-0.5">
        <Handle
          type="target"
          id="prompt"
          position={Position.Left}
          style={portDot(promptWired, text)}
        />
        <input
          value={prompt}
          disabled={busy || promptWired}
          placeholder={isZh ? "外貌、年齡、氣質（可選）" : "Look, age, presence (optional)"}
          onChange={(event) => onPrompt(event.target.value)}
          className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[11px] text-white/85 placeholder:text-white/30 outline-none disabled:text-white/40"
        />
        <span className="shrink-0 text-[10px] text-white/35">
          {promptWired ? (isZh ? "已連接" : "Connected") : isZh ? "可選" : "Optional"}
        </span>
      </div>

      <div className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]">
        <Handle
          type="target"
          id="refImages"
          position={Position.Left}
          style={portDot(refCount > 0, image)}
        />
        <span className="text-white/80">{isZh ? "參考圖" : "Photos"}</span>
        <span className="text-[10px] text-white/35">
          {refCount > 0 ? `${refCount}/${CHARACTER_BLUEPRINT_REF_MAX}` : isZh ? "可接多張" : "Several"}
        </span>
      </div>

      <p className="px-3.5 pt-1 text-[10px] tracking-wider text-white/35 uppercase">
        {isZh ? "穿搭" : "Outfit"}
      </p>
      {CHARACTER_OUTFIT_PORTS.map((port) => {
        const count = counts.get(port.id) ?? 0;
        return (
          <div
            key={port.id}
            className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]"
          >
            <Handle
              type="target"
              id={port.id}
              position={Position.Left}
              style={portDot(count > 0, image)}
            />
            <span className="text-white/80">{isZh ? port.zh : port.en}</span>
            <span className="text-[10px] text-white/35">
              {count > 0 ? (isZh ? "已連接" : "Connected") : isZh ? "輸入" : "Input"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
