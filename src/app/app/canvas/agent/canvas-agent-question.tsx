"use client";

// Multiple-choice question from the canvas agent. The user picks one or more options
// and/or types extra details; the answer goes back as the next chat message.

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import type { CanvasAgentQuestion as CanvasAgentQuestionData } from "@/service/canvas-agent/types";
import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

const EXTRA_MAX = 500;

export function CanvasAgentQuestion({
  copy,
  question,
  answered,
  disabled,
  onAnswer,
}: {
  copy: CanvasAgentCopy;
  question: CanvasAgentQuestionData;
  // A later message exists, so the card is read-only.
  answered: boolean;
  disabled: boolean;
  onAnswer: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const extraRef = useRef("");
  const [extra, setExtraState] = useState("");
  const setExtra = (next: string) => {
    extraRef.current = next;
    setExtraState(next);
  };
  const locked = answered || disabled;
  const canSubmit = !locked && (selected.length > 0 || extra.trim().length > 0);

  function toggle(id: string) {
    if (locked) return;
    setSelected((prev) => {
      if (question.allowMultiple) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return prev[0] === id ? [] : [id];
    });
  }

  function submit() {
    const extraText = extraRef.current.trim();
    if (locked || (selected.length === 0 && !extraText)) return;
    // Keep the option order the agent offered, not the click order.
    const labels = question.options.filter((o) => selected.includes(o.id)).map((o) => o.label);
    onAnswer(copy.answerText(labels, extraText));
  }

  return (
    <div className="w-full rounded-2xl rounded-tl-md border border-[#c6f24b]/25 bg-[#c6f24b]/[0.04] px-3 py-2.5">
      <p className="text-[13px] leading-5 text-white/90">{question.question}</p>
      <p className="mt-0.5 text-[10px] text-white/40">
        {answered ? copy.answered : question.allowMultiple ? copy.pickMany : copy.pickOne}
      </p>

      <div
        role={question.allowMultiple ? "group" : "radiogroup"}
        aria-label={question.question}
        className="mt-2 flex flex-wrap gap-1.5"
      >
        {question.options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role={question.allowMultiple ? "checkbox" : "radio"}
              aria-checked={active}
              disabled={locked}
              onClick={() => toggle(option.id)}
              className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition disabled:cursor-not-allowed ${
                active
                  ? "border-[#c6f24b] bg-[#c6f24b] text-[#11141b]"
                  : "border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
              }`}
            >
              {active ? <Check className="h-3 w-3" /> : null}
              {option.label}
            </button>
          );
        })}
      </div>

      {!answered ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="mt-2 flex items-center gap-2"
        >
          {question.allowOther ? (
            <ComposedInput
              type="text"
              maxLength={EXTRA_MAX}
              value={extra}
              disabled={locked}
              aria-label={copy.otherPlaceholder}
              placeholder={copy.otherPlaceholder}
              onValue={setExtra}
              className="h-8 min-w-0 flex-1 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2.5 text-[12px] text-white placeholder:text-white/35 focus:border-[#c6f24b]/60 focus:outline-none disabled:opacity-60"
            />
          ) : (
            <span className="flex-1" />
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-8 shrink-0 cursor-pointer rounded-[8px] bg-[#c6f24b] px-3 text-[12px] font-semibold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.submitAnswer}
          </button>
        </form>
      ) : null}
    </div>
  );
}
