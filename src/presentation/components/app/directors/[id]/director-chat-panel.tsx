"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendDirectorChatAction } from "@/presentation/actions/directors";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicDirector } from "@/presentation/serialize";
import { DirectorChatMessage } from "@/presentation/components/app/directors/[id]/director-chat-message";
import {
  applyDirectorEdits,
  type DirectorDraft,
  type DirectorEdit,
} from "@/service/director/director-edits";
import { translateAppError } from "@/util/i18n/translate-app-error";

const MESSAGE_MAX = 2000;

// Right pane: AI chat whose replies are merged into the local draft (saved only via Save).
export function DirectorChatPanel({
  directorId,
  initialChat,
  draft,
  subscribed,
  onApplyEdits,
}: {
  directorId: string;
  initialChat: PublicDirector["chat"];
  draft: DirectorDraft;
  subscribed: boolean;
  onApplyEdits: (edits: DirectorEdit[]) => void;
}) {
  const { t } = useI18n();
  const [chat, setChat] = useState(initialChat);
  const [input, setInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const sending = pendingMessage !== "";
  const canSend = subscribed && !sending && input.trim().length > 0;

  // Keep the newest message in view.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat.length, pendingMessage, error]);

  async function send() {
    const message = input.trim();
    if (!canSend) return;
    // Snapshot the draft the AI sees so its edits are validated against the same values.
    const sent: DirectorDraft = { customProfile: draft.customProfile, extraInstructions: draft.extraInstructions };
    setPendingMessage(message);
    setInput("");
    setError("");
    try {
      const result = await sendDirectorChatAction({ id: directorId, message, draft: sent });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        setInput(message);
        return;
      }
      const applied = applyDirectorEdits(sent, result.edits);
      if (!applied.ok) {
        setError(translateAppError(applied.error, t));
        setInput(message);
        return;
      }
      onApplyEdits(result.edits);
      setChat(result.chat);
    } catch {
      setError(t("errors.directorChatFailed"));
      setInput(message);
    } finally {
      setPendingMessage("");
    }
  }

  return (
    <aside className="flex min-h-[28rem] flex-col rounded-[1.75rem] border border-accent-ink/10 bg-paper/85 shadow-[8px_8px_0_0_rgba(18,20,28,0.08)] lg:sticky lg:top-0 lg:h-[calc(100dvh-6rem)]">
      <h2 className="border-b border-accent-ink/10 px-5 py-4 font-display text-lg font-bold">
        {t("directors.chatTitle")}
      </h2>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {chat.length === 0 && !sending && !error ? (
          <p className="text-sm leading-6 text-muted">{t("directors.chatEmpty")}</p>
        ) : null}
        {chat.map((message, index) => (
          <DirectorChatMessage
            key={`${message.createdAt}-${index}`}
            role={message.role}
            content={message.content}
            changedPaths={message.changedPaths}
          />
        ))}
        {sending ? (
          <>
            <DirectorChatMessage role="user" content={pendingMessage} />
            <DirectorChatMessage role="assistant" variant="pending" />
          </>
        ) : null}
        {error ? <DirectorChatMessage role="assistant" variant="error" content={error} /> : null}
      </div>

      <div className="border-t border-accent-ink/10 p-4">
        {subscribed ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="space-y-2"
          >
            <textarea
              rows={3}
              maxLength={MESSAGE_MAX}
              value={input}
              disabled={sending}
              aria-label={t("directors.chatPlaceholder")}
              placeholder={t("directors.chatPlaceholder")}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter adds a newline; ignore IME composition.
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
              className="w-full resize-none rounded-2xl border border-accent-ink/15 bg-paper px-4 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Spinner className="h-4 w-4" /> : null}
                {t("directors.chatSend")}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{t("directors.chatLocked")}</p>
            <Link
              href="/app/billing"
              className="inline-flex min-h-[44px] items-center rounded-full bg-accent-ink px-4 text-sm font-semibold text-lime transition hover:-translate-y-0.5"
            >
              {t("directors.chatLockedCta")}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
