"use client";

// Prompt text on a model node. A connected Prompt stays the source until the user edits.

import { Maximize2 } from "lucide-react";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";

type Props = {
  isZh: boolean;
  value: string;
  wired: boolean;
  onEdit: (prompt: string) => void;
  onOpenEditor: () => void;
};

export function WiredPromptField({ isZh, value, wired, onEdit, onOpenEditor }: Props) {
  const placeholder = wired
    ? ""
    : isZh
      ? "描述你想生成的畫面或動作…"
      : "Describe what to generate…";
  return (
    <div className="relative">
      <ComposedTextarea
        value={value}
        onValue={onEdit}
        rows={3}
        placeholder={placeholder}
        aria-label={isZh ? "提示詞" : "Prompt"}
        className="nodrag disabled:cursor-not-allowed disabled:opacity-50 nowheel w-full resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 pr-8 text-[11.5px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none"
      />
      <button
        type="button"
        title={isZh ? "放大編輯" : "Edit prompt"}
        aria-label={isZh ? "放大編輯提示詞" : "Edit prompt"}
        onClick={onOpenEditor}
        className="nodrag absolute top-1.5 right-1.5 cursor-pointer rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
