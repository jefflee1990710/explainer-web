"use client";

import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { StudioButton } from "@/presentation/studio/studio-button";
import { draftShareCaptionAction } from "@/presentation/actions/video-share";
import { useFileDownload } from "@/presentation/components/app/projects/new/use-file-download";
import { VideoShareCaption } from "@/presentation/components/app/projects/new/video-share-caption";
import { VideoShareIcon } from "@/presentation/components/app/projects/new/video-share-icons";
import {
  VIDEO_SHARE_TARGETS,
  canPostVideoUrl,
  shareableVideoUrl,
  videoFileName,
  videoShareHref,
  type VideoShareId,
} from "@/presentation/components/app/projects/new/video-share";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

export function VideoSharePanel({
  project,
  edit,
}: {
  project: PublicVideo;
  edit: VideoEdit;
}) {
  const { t } = useI18n();
  const src = shareableVideoUrl(project, edit);
  const filename = videoFileName(project);
  const { saving, error, download } = useFileDownload();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [hint, setHint] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [caption, setCaption] = useState("");
  const [drafts, setDrafts] = useState<Partial<Record<VideoShareId, string>>>({});
  const [activeDraft, setActiveDraft] = useState<VideoShareId | "">("");
  const [drafting, setDrafting] = useState<VideoShareId | "">("");

  async function copyText(value: string, kind: "link" | "caption") {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "link") {
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCaption(true);
        window.setTimeout(() => setCopiedCaption(false), 2000);
      }
      return true;
    } catch {
      setHint(t("video.share.copyFailed"));
      return false;
    }
  }

  async function saveFile() {
    if (!src) return;
    await download(src, filename);
  }

  async function shareNative() {
    if (!src || !navigator.share) return;
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("share fetch");
      const file = new File([await response.blob()], filename, { type: "video/mp4" });
      const payload = { files: [file], title: filename, text: caption || filename };
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
        return;
      }
      await navigator.share({ title: filename, url: src, text: caption || undefined });
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setHint(t("video.share.nativeFailed"));
    }
  }

  function rememberCaption(id: VideoShareId, text: string) {
    setActiveDraft(id);
    setDrafts((current) => ({ ...current, [id]: text }));
    setCaption(text);
  }

  async function captionFor(id: VideoShareId) {
    const cached = drafts[id];
    if (cached) {
      const text = activeDraft === id && caption.trim() ? caption.trim() : cached;
      rememberCaption(id, text);
      return { text, error: "" };
    }
    setDrafting(id);
    const result = await draftShareCaptionAction(project.id, id);
    setDrafting("");
    if (!result.ok) return { text: "", error: result.error };
    rememberCaption(id, result.text);
    return { text: result.text, error: "" };
  }

  async function openTarget(id: VideoShareId) {
    if (!src) return;
    const target = VIDEO_SHARE_TARGETS.find((item) => item.id === id);
    if (!target) return;
    setHint("");
    let text = "";
    let draftError = "";
    if (useAi) {
      const drafted = await captionFor(id);
      text = drafted.text;
      draftError = drafted.error;
      if (text) await copyText(text, "caption");
    }
    const notes: string[] = [];
    if (target.kind === "upload" || !canPostVideoUrl(src)) {
      await download(src, filename);
      notes.push(
        target.kind === "upload" ? t("video.share.noteUploadPage") : t("video.share.noteDownloadFirst"),
      );
    }
    if (draftError) notes.push(translateAppError(draftError, t));
    else if (useAi && text) notes.push(t("video.share.noteCaptionCopied"));
    setHint(notes.join(" "));
    window.open(videoShareHref(id, src, text), "_blank", "noopener,noreferrer");
  }

  const busy = saving || Boolean(drafting);

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">{t("video.share.section")}</h3>
      {src ? (
        <>
          <StudioButton className="w-full" disabled={busy} onClick={() => void saveFile()}>
            {saving ? <Spinner className="h-4 w-4" /> : null}
            {t("video.share.download")}
          </StudioButton>
          <VideoShareCaption
            checked={useAi}
            caption={caption}
            copied={copiedCaption}
            onChecked={setUseAi}
            onCaption={(value) => {
              setCaption(value);
              if (activeDraft) {
                setDrafts((current) => ({ ...current, [activeDraft]: value }));
              }
            }}
            onCopy={() => void copyText(caption, "caption")}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {VIDEO_SHARE_TARGETS.map((target) => (
              <button
                key={target.id}
                type="button"
                disabled={busy}
                onClick={() => void openTarget(target.id)}
                className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--studio-line)] bg-white px-2 text-left text-[11px] font-semibold leading-4 text-[var(--studio-ink)] hover:bg-[var(--studio-fill)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {drafting === target.id ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <VideoShareIcon id={target.id} />
                )}
                {t(`video.share.target.${target.id}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => src && void copyText(src, "link")}
              className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
            >
              {copiedLink ? t("video.share.linkCopied") : t("video.share.copyLink")}
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <button
                type="button"
                onClick={() => void shareNative()}
                className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
              >
                {t("video.share.native")}
              </button>
            ) : null}
          </div>
          <p className="text-[11px] leading-4 text-[var(--studio-muted)]">{t("video.share.platformHint")}</p>
        </>
      ) : (
        <p className="text-xs text-[var(--studio-muted)]">{t("video.share.notReady")}</p>
      )}
      {hint ? <p className="text-[11px] text-[var(--studio-ink)]">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {translateAppError(error, t)}
        </p>
      ) : null}
    </section>
  );
}
