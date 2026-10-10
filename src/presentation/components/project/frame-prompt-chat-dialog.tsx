"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { FramePromptChatPanel } from "@/presentation/components/project/frame-prompt-chat-panel";
import { FrameTileDrawing } from "@/presentation/components/project/frame-tile-drawing";
import { useI18n } from "@/presentation/components/i18n-provider";
import { userFacingJobError } from "@/service/higgsfield/job-status";
import { displayMediaSrc } from "@/util/media-src";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { AspectRatio, FramePosition } from "@/model/project";
import type { PublicVideo } from "@/presentation/serialize";

// Prompt chat for one still: the picture on the left, the chat on the right.
export function FramePromptChatDialog({
  project,
  clipNumber,
  position,
  aspectRatio,
  subscribed,
  regenerating,
  onProject,
  onRegenerate,
  onClose,
}: {
  project: PublicVideo;
  clipNumber: number;
  position: FramePosition;
  aspectRatio: AspectRatio;
  subscribed: boolean;
  regenerating: boolean;
  onProject: (project: PublicVideo) => void;
  onRegenerate: () => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const frame = project.frames.find(
    (item) => item.clipNumber === clipNumber && item.position === position,
  );
  const src = displayMediaSrc(frame);
  const busy =
    regenerating || frame?.status === "queued" || frame?.status === "in_progress";
  const failed = frame?.status === "failed";
  const errorRaw = failed ? userFacingJobError("failed", frame?.error) : undefined;
  const error = errorRaw ? translateAppError(errorRaw, t) : undefined;
  const positionLabel = t(`production.frame.position.${position}`);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-[min(820px,calc(100vh-2rem))] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-accent-ink/10 bg-paper shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-accent-ink/10 px-6 py-4">
          <h2 id={titleId} className="font-display text-xl font-bold">
            {t("production.frameChat.title", { position: positionLabel })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("production.action.close")}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-muted transition hover:border-accent-ink/40 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div className="flex h-full min-h-48 items-center justify-center bg-[var(--studio-canvas)] p-6">
            <div
              className="relative h-full max-h-full max-w-full overflow-hidden rounded-xl border border-accent-ink/10 bg-paper"
              style={{ aspectRatio: aspectRatio.replace(":", " / ") }}
            >
              {src ? (
                <img
                  src={src}
                  alt={t("production.frame.alt", { position: positionLabel })}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="grid h-full min-h-48 w-full place-items-center border-2 border-dashed border-accent-ink/15 p-4 text-center text-xs font-semibold text-muted">
                  {failed ? (
                    <span>
                      {t("production.frame.generateFailed")}
                      {error ? <span className="mt-1 block font-medium text-accent">{error}</span> : null}
                    </span>
                  ) : (
                    t("production.frame.pending")
                  )}
                </div>
              )}
              {busy ? <FrameTileDrawing /> : null}
            </div>
          </div>
          <FramePromptChatPanel
            project={project}
            clipNumber={clipNumber}
            position={position}
            subscribed={subscribed}
            regenerating={regenerating}
            onProject={onProject}
            onRegenerate={onRegenerate}
          />
        </div>
      </div>
    </DialogBackdrop>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
