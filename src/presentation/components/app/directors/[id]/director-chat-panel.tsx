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
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-accent-ink/10 bg-paper/85 max-lg:rounded-none max-lg:rounded-l-xl">
      <h2 className="shrink-0 border-b border-accent-ink/10 px-3 py-2 pr-14 font-display text-sm font-bold lg:pr-3">
        {t("directors.chatTitle")}
      </h2>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2" aria-live="polite">
        {chat.length === 0 && !sending && !error ? (
          <p className="text-xs leading-5 text-muted">{t("directors.chatEmpty")}</p>
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

      <div className="shrink-0 border-t border-accent-ink/10 p-2.5">
        {subscribed ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="space-y-2"
          >
            <textarea
              rows={2}
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
              className="w-full resize-none rounded-xl border border-accent-ink/15 bg-paper px-3 py-2 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-accent px-3 text-xs font-semibold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Spinner className="h-3.5 w-3.5" /> : null}
                {t("directors.chatSend")}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{t("directors.chatLocked")}</p>
            <Link
              href="/app/billing"
              className="inline-flex h-8 items-center rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime transition hover:-translate-y-0.5"
            >
              {t("directors.chatLockedCta")}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
