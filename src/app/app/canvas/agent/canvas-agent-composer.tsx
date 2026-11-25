"use client";

// Text box + send button for the canvas agent. Enter sends, Shift+Enter adds a line.

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Spinner } from "@/presentation/components/spinner";
import { ComposedTextarea } from "@/app/app/canvas/nodes/composed-text-field";
import type { CanvasAgentCopy } from "@/app/app/canvas/agent/canvas-agent-copy";

const MESSAGE_MAX = 2000;

export function CanvasAgentComposer({
  copy,
  busy,
  onSend,
}: {
  copy: CanvasAgentCopy;
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const textRef = useRef("");
  const [input, setInputState] = useState("");
  const setInput = (next: string) => {
    textRef.current = next;
    setInputState(next);
  };
  const canSend = !busy && input.trim().length > 0;

  function submit() {
    const text = textRef.current.trim();
    if (busy || !text) return;
    onSend(text);
    setInput("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex shrink-0 items-end gap-2 border-t border-white/8 p-2.5"
    >
      <ComposedTextarea
        rows={1}
        maxLength={MESSAGE_MAX}
        value={input}
        disabled={busy}
        aria-label={copy.placeholder}
        placeholder={copy.placeholder}
        onValue={setInput}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        className="max-h-28 min-h-9 min-w-0 flex-1 resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-3 py-2 text-[13px] leading-5 text-white placeholder:text-white/35 focus:border-[#c6f24b]/60 focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label={copy.send}
        title={copy.send}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[#c6f24b] text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Spinner className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </form>
  );
}
