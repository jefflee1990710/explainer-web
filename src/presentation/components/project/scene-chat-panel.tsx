"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sendClipSceneChatAction } from "@/presentation/actions/scene-chat";
import { SceneChatComposer } from "@/presentation/components/project/scene-chat-composer";
import { SceneChatMessage } from "@/presentation/components/project/scene-chat-message";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";
import { clipVideoCost, sceneImageCost } from "@/service/production-plan";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Right side of the production desk: edit this clip's stills and camera, then redraw.
export function SceneChatPanel({
  project,
  clipNumber,
  subscribed,
  regenerating,
  onProject,
  onRegenerate,
}: {
  project: PublicVideo;
  clipNumber: number;
  subscribed: boolean;
  regenerating: boolean;
  onProject: (project: PublicVideo) => void;
  onRegenerate: () => Promise<boolean>;
}) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const chat =
    project.sceneChats?.find((thread) => thread.clipNumber === clipNumber)?.messages ?? [];
  const framesBusy = project.frames.some(
    (frame) =>
      frame.clipNumber === clipNumber &&
      (frame.status === "queued" || frame.status === "in_progress"),
  );
  const credits = sceneImageCost(project, [clipNumber]) + clipVideoCost(project, clipNumber);
  const latestChanged = chat.findLastIndex(
    (message) => message.role === "assistant" && (message.changedPaths?.length ?? 0) > 0,
  );

  useEffect(() => {
    setPending("");
    setError("");
  }, [clipNumber]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [chat.length, pending, error, clipNumber]);

  async function send(message: string) {
    setPending(message);
    setError("");
    try {
      const result = await sendClipSceneChatAction({
        videoId: project.id,
        clipNumber,
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

  const empty = chat.length === 0 && !pending && !error;

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[var(--studio-panel)]">
      <h2 className="shrink-0 border-b border-[var(--studio-line)] px-3 py-2 text-sm font-bold">
        {t("production.sceneChat.title", { n: clipNumber })}
      </h2>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2" aria-live="polite">
        {empty ? (
          <p className="px-1 py-2 text-sm leading-6 text-muted">{t("production.sceneChat.empty")}</p>
        ) : null}
        {chat.map((message, index) => (
          <SceneChatMessage
            key={`${message.createdAt}-${index}`}
            role={message.role}
            content={message.content}
            changedPaths={message.changedPaths}
            regenerating={regenerating && index === latestChanged}
            regenerateDisabled={regenerating || framesBusy}
            credits={credits}
            onRegenerate={
              index === latestChanged
                ? () => {
                    void onRegenerate();
                  }
                : undefined
            }
          />
        ))}
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
            disabled={framesBusy || regenerating}
            sending={Boolean(pending)}
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
