"use client";

import { useEffect, useId } from "react";
import { SceneChatPanel } from "@/presentation/components/project/scene-chat-panel";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { PublicVideo } from "@/presentation/serialize";

// Director chat sits beside the preview. Width is the desk column, not a modal.
export function SceneChatDialog({
  project,
  clipNumber,
  subscribed,
  onProject,
  onClose,
}: {
  project: PublicVideo;
  clipNumber: number;
  subscribed: boolean;
  onProject: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--studio-line)] px-3 py-2">
        <h2 id={titleId} className="text-sm font-bold">
          {t("production.sceneChat.title", { n: clipNumber })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("production.action.close")}
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-accent-ink/5 hover:text-foreground"
        >
          <CloseIcon />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <SceneChatPanel
          project={project}
          clipNumber={clipNumber}
          subscribed={subscribed}
          onProject={onProject}
          hideTitle
        />
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
