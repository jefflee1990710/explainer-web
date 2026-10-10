"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  openFramePromptChatAction,
  sendFramePromptChatAction,
} from "@/presentation/actions/scene-chat";
import { SceneChatComposer } from "@/presentation/components/project/scene-chat-composer";
import { SceneChatMessage } from "@/presentation/components/project/scene-chat-message";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";
import { sceneRedrawFinishedAt, sceneRedrawPhase } from "@/service/clip/scene-chat";
import { FRAME_COST } from "@/service/credit-costs";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { FramePosition } from "@/model/project";

const opening = new Set<string>();

// Chat for one still. The first message summarizes that still's prompt.
export function FramePromptChatPanel({
  project,
  clipNumber,
  position,
  subscribed,
  regenerating,
  onProject,
  onRegenerate,
  onClose,
}: {
  project: PublicVideo;
  clipNumber: number;
  position: FramePosition;
  subscribed: boolean;
  regenerating: boolean;
  onProject: (project: PublicVideo) => void;
  onRegenerate: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const onProjectRef = useRef(onProject);
  onProjectRef.current = onProject;
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [openingNow, setOpeningNow] = useState(false);
  const messages =
    project.sceneChats?.find((thread) => thread.clipNumber === clipNumber && thread.position === position)
      ?.messages ?? [];
  const frame = project.frames.find(
    (item) => item.clipNumber === clipNumber && item.position === position,
  );
  const framesBusy = frame?.status === "queued" || frame?.status === "in_progress";
  const latestChanged = messages.findLastIndex(
    (message) => message.role === "assistant" && message.promptChanged,
  );
  const positionLabel = t(`production.frame.position.${position}`);

  useEffect(() => {
    setPending("");
    setError("");
  }, [clipNumber, position]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages.length, pending, error, clipNumber, position]);

  const started = useRef("");

  useEffect(() => {
    if (!subscribed || messages.length > 0) return;
    const key = `${project.id}:${clipNumber}:${position}`;
    if (started.current === key || opening.has(key)) return;
    started.current = key;
    opening.add(key);
    setOpeningNow(true);
    setError("");
    void openFramePromptChatAction({
      videoId: project.id,
      clipNumber,
      position,
      locale,
    })
      .then((result) => {
        if (!result.ok) {
          setError(translateAppError(result.error, t));
          return;
        }
        onProjectRef.current(result.project);
      })
      .catch(() => {
        setError(t("errors.directorChatFailed"));
      })
      .finally(() => {
        opening.delete(key);
        setOpeningNow(false);
      });
  }, [subscribed, messages.length, project.id, clipNumber, position, locale, t]);

  async function send(message: string) {
    setPending(message);
    setError("");
    try {
      const result = await sendFramePromptChatAction({
        videoId: project.id,
        clipNumber,
        position,
        message,
      });
      if (!result.ok) {
        setError(translateAppError(result.error, t));
        return;
      }
      onProject(result.project);
    } catch {
      setError(t("errors.directorChatFailed"));
    } finally {
      setPending("");
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[var(--studio-panel)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--studio-line)] px-3 py-2">
        <h2 className="text-sm font-bold">{t("production.frameChat.title", { position: positionLabel })}</h2>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-xs font-semibold text-muted underline-offset-2 hover:underline"
        >
          {t("production.frameChat.close")}
        </button>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2" aria-live="polite">
        {messages.map((message, index) => {
          const redrawInput = {
            messageAt: message.createdAt,
            frames: frame ? [frame] : [],
          };
          const redraw = index === latestChanged ? sceneRedrawPhase(redrawInput) : "ready";
          return (
            <SceneChatMessage
              key={`${message.createdAt}-${index}`}
              role={message.role}
              content={message.content}
              changedNote={message.promptChanged ? t("production.frameChat.changed") : undefined}
              regenerating={index === latestChanged && (regenerating || framesBusy || redraw === "running")}
              redrawAt={redraw === "done" ? sceneRedrawFinishedAt(redrawInput) : undefined}
              credits={FRAME_COST}
              onRegenerate={
                index === latestChanged
                  ? () => {
                      void onRegenerate();
                    }
                  : undefined
              }
            />
          );
        })}
        {openingNow && messages.length === 0 ? <SceneChatMessage role="assistant" variant="pending" /> : null}
        {pending ? (
          <>
            <SceneChatMessage role="user" content={pending} />
            <SceneChatMessage role="assistant" variant="pending" />
          </>
        ) : null}
        {error ? <SceneChatMessage role="assistant" variant="error" content={error} /> : null}
      </div>
      <div className="shrink-0 border-t border-[var(--studio-line)] p-2.5">
        {subscribed ? (
          <SceneChatComposer
            disabled={Boolean(framesBusy || regenerating || openingNow)}
            sending={Boolean(pending)}
            placeholder={t("production.frameChat.placeholder")}
            onSend={(message) => void send(message)}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{t("production.sceneChat.locked")}</p>
            <Link
              href="/app/billing"
              className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
            >
              {t("production.sceneChat.lockedCta")}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
