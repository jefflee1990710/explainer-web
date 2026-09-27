"use client";

import { useState } from "react";
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
import type { PublicVideo } from "@/presentation/serialize";
import type { VideoEdit } from "@/model/video-edit";

// Download the finished reel and open IG / Facebook / TikTok / etc.
export function VideoSharePanel({
  project,
  edit,
}: {
  project: PublicVideo;
  edit: VideoEdit;
}) {
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
      setHint("複製失敗，請再試一次");
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
      setHint("無法開啟系統分享，請改下載後自行上傳。");
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
        target.kind === "upload"
          ? "檔案已下載，請在開啟的頁面上傳。"
          : "這個連結不能直接貼到社群，已先下載影片。",
      );
    }
    if (draftError) notes.push(draftError);
    else if (useAi && text) notes.push("文案已複製。");
    setHint(notes.join(" "));
    window.open(videoShareHref(id, src, text), "_blank", "noopener,noreferrer");
  }

  const busy = saving || Boolean(drafting);

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-bold text-[var(--studio-muted)]">下載與分享</h3>
      {src ? (
        <>
          <StudioButton className="w-full" disabled={busy} onClick={() => void saveFile()}>
            {saving ? <Spinner className="h-4 w-4" /> : null}
            下載影片
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
                {target.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => src && void copyText(src, "link")}
              className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
            >
              {copiedLink ? "已複製連結" : "複製影片連結"}
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <button
                type="button"
                onClick={() => void shareNative()}
                className="text-[11px] font-semibold text-[var(--studio-muted)] underline-offset-2 hover:underline"
              >
                系統分享
              </button>
            ) : null}
          </div>
          <p className="text-[11px] leading-4 text-[var(--studio-muted)]">
            Instagram、TikTok、YouTube 無法直接貼上檔案，會先下載再打開上傳頁。
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--studio-muted)]">成片好了才能下載與分享到社群。</p>
      )}
      {hint ? <p className="text-[11px] text-[var(--studio-ink)]">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[11px] text-[#e11d48]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
