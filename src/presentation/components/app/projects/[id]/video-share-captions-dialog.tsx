"use client";

import { useEffect, useId, useState } from "react";
import { VideoShareCaptionCard } from "@/presentation/components/app/projects/[id]/video-share-caption-card";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { draftShareCaptionAction } from "@/presentation/actions/video-share";
import { useI18n } from "@/presentation/components/i18n-provider";
import { splitShareCaption } from "@/service/video-share/caption-brief";
import type { VideoShareId } from "@/service/video-share/platforms";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Reel, Shorts, and YouTube first. The rest stay available in the same dialog.
const CAPTION_FORMATS: Array<{ id: VideoShareId; titled: boolean }> = [
  { id: "instagram_reel", titled: false },
  { id: "youtube_shorts", titled: true },
  { id: "youtube", titled: true },
  { id: "tiktok", titled: false },
  { id: "instagram_post", titled: false },
  { id: "facebook", titled: false },
  { id: "x", titled: false },
];

type Draft = { title: string; body: string };

// Generates paste-ready titles and descriptions from the storyboard.
export function VideoShareCaptionsDialog({
  videoId,
  onClose,
}: {
  videoId: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [drafts, setDrafts] = useState<Partial<Record<VideoShareId, Draft>>>({});
  const [errors, setErrors] = useState<Partial<Record<VideoShareId, string>>>({});
  const [busy, setBusy] = useState<VideoShareId | "">("");
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function generate(id: VideoShareId, titled: boolean) {
    setBusy(id);
    setErrors((current) => ({ ...current, [id]: "" }));
    const result = await draftShareCaptionAction(videoId, id);
    setBusy("");
    if (!result.ok) {
      setErrors((current) => ({ ...current, [id]: translateAppError(result.error, t) }));
      return;
    }
    const split = titled ? splitShareCaption(result.text) : { title: "", body: result.text.trim() };
    setDrafts((current) => ({ ...current, [id]: split }));
  }

  async function copy(key: string, value: string) {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 2000);
    } catch {
      setErrors((current) => ({ ...current, [key.split(":")[0] as VideoShareId]: t("video.share.copyFailed") }));
    }
  }

  return (
    <DialogBackdrop
      className="flex items-center justify-center bg-accent-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      zIndex={110}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(90vh,52rem)] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-[var(--studio-line)] bg-paper p-5 shadow-[8px_8px_0_0_#12141c] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("video.share.captionsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("video.share.captionsIntro")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            {t("common.close")}
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {CAPTION_FORMATS.map((format) => {
            const draft = drafts[format.id];
            return (
              <VideoShareCaptionCard
                key={format.id}
                id={format.id}
                titled={format.titled}
                title={draft?.title ?? ""}
                body={draft?.body ?? ""}
                busy={busy === format.id}
                error={errors[format.id] ?? ""}
                copiedKey={copiedKey}
                onGenerate={() => void generate(format.id, format.titled)}
                onTitle={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [format.id]: { title: value, body: current[format.id]?.body ?? "" },
                  }))
                }
                onBody={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [format.id]: { title: current[format.id]?.title ?? "", body: value },
                  }))
                }
                onCopy={(key, value) => void copy(key, value)}
              />
            );
          })}
        </div>
      </div>
    </DialogBackdrop>
  );
}
