"use client";

// One chat bubble in the canvas agent dock. Assistant replies show what changed on
// the canvas, an optional multiple-choice question, and, for the latest turn, an Undo button.

import { Bot, RotateCcw } from "lucide-react";
import { Spinner } from "@/presentation/components/spinner";
import type { CanvasAgentOp, CanvasAgentQuestion as CanvasAgentQuestionData } from "@/model/canvas-agent";
import {
  type CanvasAgentCopy,
  summarizeCanvasAgentOps,
} from "@/app/app/canvas/agent/canvas-agent-copy";
import { CanvasAgentQuestion } from "@/app/app/canvas/agent/canvas-agent-question";
import { CanvasAgentReadme } from "@/app/app/canvas/agent/canvas-agent-readme";

export function CanvasAgentMessage({
  copy,
  isZh,
  role,
  text,
  imageUrls,
  ops,
  variant = "normal",
  note,
  canUndo = false,
  undone = false,
  onUndo,
  onRetry,
  question,
  questionAnswered = false,
  questionDisabled = false,
  onAnswer,
}: {
  copy: CanvasAgentCopy;
  isZh: boolean;
  role: "user" | "assistant";
  text?: string;
  imageUrls?: readonly string[];
  ops?: CanvasAgentOp[];
  question?: CanvasAgentQuestionData;
  questionAnswered?: boolean;
  questionDisabled?: boolean;
  onAnswer?: (text: string) => void;
  variant?: "normal" | "pending" | "error";
  note?: string;
  canUndo?: boolean;
  undone?: boolean;
  onUndo?: () => void;
  onRetry?: () => void;
}) {
  if (role === "user") {
    const photos = imageUrls ?? [];
    if (!text?.trim() && photos.length === 0) return null;
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] flex-col gap-1.5 rounded-2xl rounded-br-md bg-[#c6f24b] px-3 py-2">
          {photos.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {photos.map((url, index) => (
                // eslint-disable-next-line @next/next/no-img-element -- user upload on our blob host
                <img
                  key={`${url}-${index}`}
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}
          {text?.trim() ? (
            <p className="whitespace-pre-wrap text-[13px] leading-5 text-[#11141b]">{text}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const chips = ops ? summarizeCanvasAgentOps(ops, isZh) : [];
  // The question card already shows this line, so the plain bubble would repeat it.
  const hideText = Boolean(question && text?.trim() === question.question.trim());

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
        ) : hideText ? null : (
          <div
            role={variant === "error" ? "alert" : undefined}
            className={`rounded-2xl rounded-tl-md border px-3 py-2 text-[13px] leading-5 ${
              variant === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                : "border-white/10 bg-white/5 text-white/90"
            }`}
          >
            {text ? <CanvasAgentReadme text={text} /> : null}
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

        {question && onAnswer ? (
          <CanvasAgentQuestion
            copy={copy}
            question={question}
            answered={questionAnswered}
            disabled={questionDisabled}
            onAnswer={onAnswer}
          />
        ) : null}

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
