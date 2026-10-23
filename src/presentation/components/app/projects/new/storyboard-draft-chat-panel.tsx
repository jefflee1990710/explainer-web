"use client";

import { useEffect, useRef, useState } from "react";
import type { StoryboardClipDraft, VoLanguage } from "@/model/project";
import { sendStoryboardDraftChatAction } from "@/presentation/actions/storyboard-draft-chat";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { StoryboardDraftChatMessage } from "@/service/director/storyboard-draft-chat";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Right-column AI chatroom in Step 03 that drafts or refines storyboard clips from the user's script.
export function StoryboardDraftChatPanel({
  skillSlug,
  styleId,
  source,
  spokenScript,
  language,
  drafts,
  disabled,
  onApplyDrafts,
}: {
  skillSlug: string;
  styleId: string;
  source: string;
  spokenScript?: string;
  language: VoLanguage;
  drafts: StoryboardClipDraft[];
  disabled?: boolean;
  onApplyDrafts: (nextDrafts: StoryboardClipDraft[]) => void;
}) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<StoryboardDraftChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, error]);

  async function sendPrompt(promptText: string) {
    const trimmed = promptText.trim();
    if (!trimmed || pending || disabled) return;
    setPending(trimmed);
    setError("");
    const nextHistory: StoryboardDraftChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    try {
      const result = await sendStoryboardDraftChatAction({
        skillSlug,
        styleId,
        source,
        spokenScript,
        language,
        currentDrafts: drafts,
        history: messages,
        message: trimmed,
      });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      setMessages([
        ...nextHistory,
        { role: "assistant", content: result.reply },
      ]);
      onApplyDrafts(result.drafts);
    } catch {
      setError(t("errors.directorChatFailed"));
    } finally {
      setPending("");
    }
  }

  function handleAutoDraft() {
    void sendPrompt(
      "請根據我的導演指示與劇本，幫我拆解並起草每一段 Clip 的畫面解說細節與旁白台詞。",
    );
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (input.trim()) {
        const toSend = input;
        setInput("");
        void sendPrompt(toSend);
      }
    }
  }

  return (
    <aside className="flex h-full min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper/90 shadow-[3px_3px_0_0_rgba(18,20,28,0.08)]">
      <div className="shrink-0 border-b border-accent-ink/10 bg-accent-ink/[0.03] px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xs font-bold text-foreground">
            {t("brief.drafts.chatTitle")}
          </h3>
          <button
            type="button"
            disabled={disabled || Boolean(pending) || !source.trim()}
            onClick={handleAutoDraft}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-accent-ink px-2.5 py-1 text-[11px] font-bold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Spinner className="h-3 w-3" /> : null}
            {t("brief.drafts.chatAutoDraftBtn")}
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-muted">
          {t("brief.drafts.chatSubtitle")}
        </p>
      </div>

      {/* Chat message history */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 text-xs"
        aria-live="polite"
      >
        {messages.length === 0 && !pending ? (
          <div className="rounded-xl border border-dashed border-accent-ink/15 bg-paper/60 p-3 text-muted leading-relaxed">
            {t("brief.drafts.chatEmpty")}
          </div>
        ) : null}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`rounded-xl px-3 py-2 leading-relaxed ${
              msg.role === "user"
                ? "ml-4 bg-accent-ink text-paper"
                : "mr-4 border border-accent-ink/10 bg-white text-foreground"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {pending ? (
          <>
            <div className="ml-4 rounded-xl bg-accent-ink px-3 py-2 leading-relaxed text-paper">
              {pending}
            </div>
            <div className="mr-4 inline-flex items-center gap-2 rounded-xl border border-accent-ink/10 bg-white px-3 py-2 text-muted">
              <Spinner className="h-3.5 w-3.5" />
              {t("brief.drafts.chatSending")}
            </div>
          </>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-accent">
            {error}
          </div>
        ) : null}
      </div>

      {/* Chat input composer */}
      <div className="shrink-0 border-t border-accent-ink/10 p-2.5">
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || Boolean(pending)}
            placeholder={t("brief.drafts.chatPlaceholder")}
            className="min-w-0 flex-1 resize-none rounded-xl border border-accent-ink/15 bg-white px-3 py-1.5 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
          />
          <button
            type="button"
            disabled={disabled || Boolean(pending) || !input.trim()}
            onClick={() => {
              const toSend = input;
              setInput("");
              void sendPrompt(toSend);
            }}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent px-3.5 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("brief.drafts.chatSend")}
          </button>
        </div>
      </div>
    </aside>
  );
}
