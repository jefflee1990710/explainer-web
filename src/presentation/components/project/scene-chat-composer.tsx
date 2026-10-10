"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

const MESSAGE_MAX = 2000;

// Text box for the production chat. Enter sends; Shift+Enter inserts a line.
export function SceneChatComposer({
  disabled,
  sending,
  placeholder,
  onSend,
}: {
  disabled: boolean;
  sending: boolean;
  placeholder?: string;
  onSend: (message: string) => void;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const blocked = disabled || sending;
  const canSend = !blocked && input.trim().length > 0;
  const hint = placeholder || t("production.sceneChat.placeholder");

  function submit() {
    if (!canSend) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex items-end gap-2"
    >
      <textarea
        rows={2}
        maxLength={MESSAGE_MAX}
        value={input}
        disabled={blocked}
        aria-label={hint}
        placeholder={hint}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
        className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-sm leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? <Spinner className="h-3.5 w-3.5" /> : t("production.sceneChat.send")}
      </button>
    </form>
  );
}
