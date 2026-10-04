"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendUserStyleChatAction } from "@/presentation/actions/styles";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StyleChatMessage } from "@/presentation/components/app/styles/[id]/style-chat-message";
import type { StyleChatItem } from "@/presentation/components/app/styles/style-detail";
import type { UserStyleFields } from "@/service/style/user-style-fields";
import { translateAppError } from "@/util/i18n/translate-app-error";

const MESSAGE_MAX = 2000;

// Right pane: AI chat whose visual edits land in the local draft. Save writes them.
export function StyleChatPanel({
  styleId,
  initialChat,
  draft,
  subscribed,
  onApplyFields,
}: {
  styleId: string;
  initialChat: StyleChatItem[];
  draft: UserStyleFields;
  subscribed: boolean;
  onApplyFields: (fields: UserStyleFields) => void;
}) {
  const { t } = useI18n();
  const [chat, setChat] = useState(initialChat);
  const [input, setInput] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const sending = pendingMessage !== "";
  const canSend = subscribed && !sending && input.trim().length > 0;

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat.length, pendingMessage, error]);

  async function send() {
    const message = input.trim();
    if (!canSend) return;
    const sent: UserStyleFields = { ...draft };
    setPendingMessage(message);
    setInput("");
    setError("");
    try {
      const result = await sendUserStyleChatAction({ id: styleId, message, draft: sent });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        setInput(message);
        return;
      }
      onApplyFields(result.fields);
      const now = new Date().toISOString();
      setChat((current) => [
        ...current,
        { role: "user", content: message, createdAt: now },
        {
          role: "assistant",
          content: result.summary,
          changedPaths: result.changedFields,
          createdAt: now,
        },
      ]);
    } catch {
      setError(t("errors.directorChatFailed"));
      setInput(message);
    } finally {
      setPendingMessage("");
    }
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-accent-ink/10 bg-paper/85">
      <h2 className="shrink-0 border-b border-accent-ink/10 px-3 py-2 font-display text-sm font-bold">
        {t("styles.chatTitle")}
      </h2>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2" aria-live="polite">
        {chat.length === 0 && !sending && !error ? (
          <p className="text-sm leading-6 text-muted">{t("styles.chatEmpty")}</p>
        ) : null}
        {chat.map((message, index) => (
          <StyleChatMessage
            key={`${message.createdAt}-${index}`}
            role={message.role}
            content={message.content}
            changedPaths={message.changedPaths}
          />
        ))}
        {sending ? (
          <>
            <StyleChatMessage role="user" content={pendingMessage} />
            <StyleChatMessage role="assistant" variant="pending" />
          </>
        ) : null}
        {error ? <StyleChatMessage role="assistant" variant="error" content={error} /> : null}
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
              aria-label={t("styles.chatPlaceholder")}
              placeholder={t("styles.chatPlaceholder")}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
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
                {t("styles.chatSend")}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{t("styles.chatLocked")}</p>
            <Link
              href="/app/billing"
              className="inline-flex h-8 items-center rounded-full bg-accent-ink px-3 text-xs font-semibold text-lime transition hover:-translate-y-0.5"
            >
              {t("styles.chatLockedCta")}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
