"use client";

// One chat bubble in the canvas agent dock. Assistant replies show what changed on
// the canvas and, for the latest turn, an Undo button.

import { Bot, RotateCcw } from "lucide-react";
import { Spinner } from "@/presentation/components/spinner";
import type { CanvasAgentOp } from "@/service/canvas-agent/types";
import {
  type CanvasAgentCopy,
  summarizeCanvasAgentOps,
} from "@/app/app/canvas/agent/canvas-agent-copy";

export function CanvasAgentMessage({
  copy,
  isZh,
  role,
  text,
  ops,
  variant = "normal",
  note,
  canUndo = false,
  undone = false,
  onUndo,
  onRetry,
}: {
  copy: CanvasAgentCopy;
  isZh: boolean;
  role: "user" | "assistant";
  text?: string;
  ops?: CanvasAgentOp[];
  variant?: "normal" | "pending" | "error";
  note?: string;
  canUndo?: boolean;
  undone?: boolean;
  onUndo?: () => void;
  onRetry?: () => void;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#c6f24b] px-3 py-2 text-[13px] leading-5 text-[#11141b]">
          {text}
        </p>
      </div>
    );
  }

  const chips = ops ? summarizeCanvasAgentOps(ops, isZh) : [];

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#c6f24b]/15 text-[#c6f24b]">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 max-w-[85%] flex-col items-start gap-1.5">
        {variant === "pending" ? (
          <p className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white/60">
            <Spinner className="h-3.5 w-3.5" />
            {text}
          </p>
        ) : (
          <div
            role={variant === "error" ? "alert" : undefined}
            className={`rounded-2xl rounded-tl-md border px-3 py-2 text-[13px] leading-5 ${
              variant === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                : "border-white/10 bg-white/5 text-white/90"
            }`}
          >
            <p className="whitespace-pre-wrap">{text}</p>
            {variant === "error" && onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1.5 cursor-pointer text-[11px] font-semibold underline underline-offset-2"
              >
                {copy.retry}
              </button>
            ) : null}
          </div>
        )}

        {chips.length > 0 || note ? (
          <div className="flex flex-wrap items-center gap-1.5 px-0.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60"
              >
                {chip}
              </span>
            ))}
            {note ? <span className="text-[10px] text-amber-300/80">{note}</span> : null}
            {undone ? (
              <span className="text-[10px] text-white/40">{copy.undone}</span>
            ) : canUndo && onUndo ? (
              <button
                type="button"
                onClick={onUndo}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/12 px-2 py-0.5 text-[10px] font-semibold text-white/80 transition hover:bg-white/10"
              >
                <RotateCcw className="h-3 w-3" />
                {copy.undo}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
