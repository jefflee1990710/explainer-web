"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { SceneChatPanel } from "@/presentation/components/project/scene-chat-panel";
import { SceneStillPreview } from "@/presentation/components/project/scene-still-preview";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { AspectRatio } from "@/model/project";
import type { PublicVideo } from "@/presentation/serialize";

// Director chat for one clip: start still, end still, and camera motion.
export function SceneChatDialog({
  project,
  clipNumber,
  aspectRatio,
  subscribed,
  onProject,
  onClose,
}: {
  project: PublicVideo;
  clipNumber: number;
  aspectRatio: AspectRatio;
  subscribed: boolean;
  onProject: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const row = project.phaseA?.clips.find((item) => item.clipNumber === clipNumber);
  const start = project.frames.find((item) => item.clipNumber === clipNumber && item.position === "start");
  const end = project.frames.find((item) => item.clipNumber === clipNumber && item.position === "end");

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
            {t("production.sceneChat.title", { n: clipNumber })}
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
          <div className="flex h-full min-h-48 flex-col justify-center gap-4 bg-[var(--studio-canvas)] p-6">
            <div className="grid grid-cols-2 gap-3">
              <SceneStillPreview
                frame={start}
                aspectRatio={aspectRatio}
                label={t("production.frame.position.start")}
              />
              <SceneStillPreview
                frame={end}
                aspectRatio={aspectRatio}
                label={t("production.frame.position.end")}
              />
            </div>
            {row?.motionCamera ? (
              <p className="text-xs leading-5 text-muted">
                <span className="font-semibold text-accent-ink">
                  {t("production.sceneChat.fieldMotion")}
                </span>
                {` · ${row.motionCamera}`}
              </p>
            ) : null}
          </div>
          <SceneChatPanel
            project={project}
            clipNumber={clipNumber}
            subscribed={subscribed}
            onProject={onProject}
            hideTitle
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
