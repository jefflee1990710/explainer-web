"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateDirectorPreviewAction, sendDirectorChatAction } from "@/presentation/actions/directors";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { DirectorChatUser } from "@/presentation/components/app/directors/[id]/director-chat-avatar";
import { DirectorChatComposer } from "@/presentation/components/app/directors/[id]/director-chat-composer";
import { DirectorChatEmpty } from "@/presentation/components/app/directors/[id]/director-chat-empty";
import { DirectorChatMessage } from "@/presentation/components/app/directors/[id]/director-chat-message";
import type { DirectorPreviewStatus } from "@/model/skill";
import type { PublicDirector } from "@/presentation/serialize";
import { applyDirectorEdits, type DirectorDraft, type DirectorEdit } from "@/service/director/director-edits";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Right pane: AI chat whose profile edits land in the local draft. Auto-save writes them.
export function DirectorChatPanel({
  directorId,
  initialChat,
  draft,
  subscribed,
  user,
  previewUrl,
  previewStatus,
  previewCurrent,
  onApplyEdits,
  onSaveDraft,
  onGenerating,
}: {
  directorId: string;
  initialChat: PublicDirector["chat"];
  draft: DirectorDraft;
  subscribed: boolean;
  user: DirectorChatUser;
  previewUrl?: string;
  previewStatus: DirectorPreviewStatus;
  previewCurrent: boolean;
  onApplyEdits: (edits: DirectorEdit[]) => void;
  onSaveDraft: () => Promise<boolean>;
  onGenerating: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [chat, setChat] = useState(initialChat);
  const [pending, setPending] = useState<{ message: string; imageUrl?: string } | null>(null);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [pendingPreviewAt, setPendingPreviewAt] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sawGenerating = useRef(false);
  const sending = pending !== null;
  const generating = previewStatus === "generating" || pendingPreviewAt !== null;

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat.length, pending, error, previewError]);

  useEffect(() => {
    setChat((current) => {
      if (current.length === 0) return initialChat;
      return current.map((message) => {
        const server = initialChat.find(
          (item) => item.role === message.role && item.createdAt === message.createdAt,
        );
        return server?.previewUrl && server.previewUrl !== message.previewUrl
          ? { ...message, previewUrl: server.previewUrl }
          : message;
      });
    });
  }, [initialChat]);

  useEffect(() => {
    if (previewStatus === "generating") sawGenerating.current = true;
  }, [previewStatus]);

  useEffect(() => {
    if (!pendingPreviewAt) return;
    if (previewStatus === "failed") {
      sawGenerating.current = false;
      setPendingPreviewAt(null);
      return;
    }
    if (previewStatus !== "idle" || !sawGenerating.current) return;
    const createdAt = pendingPreviewAt;
    setChat((current) =>
      current.map((message) =>
        message.role === "assistant" && message.createdAt === createdAt
          ? { ...message, previewUrl: previewUrl || message.previewUrl }
          : message,
      ),
    );
    sawGenerating.current = false;
    setPendingPreviewAt(null);
  }, [pendingPreviewAt, previewStatus, previewUrl]);

  async function send(input: { message: string; imageUrl?: string }) {
    if (sending) return;
    const sent: DirectorDraft = { customProfile: draft.customProfile, extraInstructions: draft.extraInstructions };
    setPending(input);
    setError("");
    setPreviewError("");
    try {
      const result = await sendDirectorChatAction({
        id: directorId,
        message: input.message,
        imageUrl: input.imageUrl,
        draft: sent,
      });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      const applied = applyDirectorEdits(sent, result.edits);
      if (!applied.ok) {
        setError(translateAppError(applied.error, t));
        return;
      }
      onApplyEdits(result.edits);
      setChat(result.chat);
    } catch {
      setError(t("errors.directorChatFailed"));
    } finally {
      setPending(null);
    }
  }

  async function generatePreview(createdAt: string) {
    if (generating) return;
    setPreviewError("");
    setPendingPreviewAt(createdAt);
    const saved = await onSaveDraft();
    if (!saved) {
      setPendingPreviewAt(null);
      return;
    }
    try {
      const result = await generateDirectorPreviewAction({ id: directorId, chatCreatedAt: createdAt });
      if (!result.ok) {
        setPreviewError(translateAppError(result.error, t));
        setPendingPreviewAt(null);
        return;
      }
      if (result.alreadyCurrent) {
        setPendingPreviewAt(null);
        return;
      }
      onGenerating();
      router.refresh();
    } catch {
      setPreviewError(t("errors.stylePreviewFailed"));
      setPendingPreviewAt(null);
    }
  }

  const empty = chat.length === 0 && !sending && !error;
  const lastAssistantAt = [...chat].reverse().find((message) => message.role === "assistant")?.createdAt;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-accent-ink/10 bg-paper/85 max-lg:rounded-none max-lg:rounded-l-xl">
      <h2 className="shrink-0 border-b border-accent-ink/10 px-3 py-2 pr-14 font-display text-sm font-bold lg:pr-3">
        {t("directors.chatTitle")}
      </h2>

      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2" aria-live="polite">
        {empty ? <DirectorChatEmpty /> : null}
        {chat.map((message, index) => {
          const isLatestAssistant = message.role === "assistant" && message.createdAt === lastAssistantAt;
          const cardBusy = generating && (pendingPreviewAt === message.createdAt || (!pendingPreviewAt && isLatestAssistant));
          return (
            <DirectorChatMessage
              key={`${message.createdAt}-${index}`}
              role={message.role}
              content={message.content}
              imageUrl={message.imageUrl}
              previewUrl={message.previewUrl}
              changedPaths={message.changedPaths}
              user={user}
              previewBusy={message.role === "assistant" ? cardBusy : false}
              previewDisabled={generating || previewCurrent}
              onGeneratePreview={
                message.role === "assistant" ? () => void generatePreview(message.createdAt) : undefined
              }
            />
          );
        })}
        {pending ? (
          <>
            <DirectorChatMessage role="user" content={pending.message} imageUrl={pending.imageUrl} user={user} />
            <DirectorChatMessage role="assistant" variant="pending" />
          </>
        ) : null}
        {error ? <DirectorChatMessage role="assistant" variant="error" content={error} /> : null}
        {previewError ? <DirectorChatMessage role="assistant" variant="error" content={previewError} /> : null}
      </div>

      <div className="shrink-0 border-t border-accent-ink/10 p-2.5">
        {subscribed ? (
          <DirectorChatComposer
            disabled={!subscribed}
            sending={sending}
            onSend={(next) => void send(next)}
            onError={setError}
          />
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
