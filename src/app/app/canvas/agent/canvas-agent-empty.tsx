"use client";

// Intro text and starter prompts shown before the first message.

import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

export function CanvasAgentEmpty({
  copy,
  disabled,
  onPick,
}: {
  copy: CanvasAgentCopy;
  disabled: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-1">
      <p className="text-xs leading-5 text-white/55">{copy.subtitle}</p>
      <div className="flex flex-wrap gap-1.5">
        {copy.suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onPick(suggestion)}
            className="cursor-pointer rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] text-white/80 transition hover:border-[#c6f24b]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
