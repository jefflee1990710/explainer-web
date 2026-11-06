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

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (input.trim()) {
        const toSend = input;
        setInput("");
        void sendPrompt(toSend);
      }
    }
  }

  const hasHistory = messages.length > 0 || Boolean(pending) || Boolean(error);

  return (
    <aside className="flex flex-col overflow-hidden rounded-2xl border border-accent-ink/15 bg-paper/80 p-3.5 shadow-[0_2px_8px_rgba(18,20,28,0.04)] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xs font-bold text-foreground sm:text-sm">
              {t("brief.drafts.chatTitle")}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {t("brief.drafts.chatSubtitle")}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || Boolean(pending)}
          onClick={handleAutoDraft}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-accent-ink px-3.5 py-1.5 text-xs font-bold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Spinner className="h-3.5 w-3.5" /> : null}
          {t("brief.drafts.chatAutoDraftBtn")}
        </button>
      </div>

      {/* Chat message history (only rendered when there are messages, pending state, or error) */}
      {hasHistory ? (
        <div
          ref={listRef}
          className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-accent-ink/10 bg-white/80 p-3 text-xs"
          aria-live="polite"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-xl px-3 py-2 leading-relaxed ${
                msg.role === "user"
                  ? "ml-6 bg-accent-ink text-paper"
                  : "mr-6 border border-accent-ink/10 bg-paper/60 text-foreground"
              }`}
            >
              {msg.content}
            </div>
          ))}

          {pending ? (
            <>
              <div className="ml-6 rounded-xl bg-accent-ink px-3 py-2 leading-relaxed text-paper">
                {pending}
              </div>
              <div className="mr-6 inline-flex items-center gap-2 rounded-xl border border-accent-ink/10 bg-paper/60 px-3 py-2 text-muted">
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
      ) : null}

      {/* Compact single-row prompt composer */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || Boolean(pending)}
          placeholder={t("brief.drafts.chatPlaceholder")}
          className="min-h-9 min-w-0 flex-1 rounded-xl border border-accent-ink/15 bg-white px-3.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
        />
        <button
          type="button"
          disabled={disabled || Boolean(pending) || !input.trim()}
          onClick={() => {
            const toSend = input;
            setInput("");
            void sendPrompt(toSend);
          }}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-accent px-4 text-xs font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("brief.drafts.chatSend")}
        </button>
      </div>
    </aside>
  );
}
