"use client";

import { useEffect, useRef, useState } from "react";
import { persistExportedShareVideoAction } from "@/presentation/actions/video-share";
import { useI18n } from "@/presentation/components/i18n-provider";
import { VideoEditorHeaderExport } from "@/presentation/components/app/projects/new/video-edit-summary-end";
import {
  ALL_EXPORT_SHARE_TARGETS,
  buildExportShareTargetUrl,
  VideoExportMegaMenu,
  type ExportShareTargetId,
} from "@/presentation/components/app/projects/new/video-export-mega-menu";
import { AllFramesVideoIcon } from "@/presentation/components/project/production-bulk-action-icons";
import { OpenCutSaveIndicator } from "@/presentation/components/app/projects/new/opencut-save-indicator";
import {
  AddClipIcon,
  FinishMissingIcon,
} from "@/presentation/studio/studio-action-icons";
import { StudioButton } from "@/presentation/studio/studio-button";
import { StudioHint } from "@/presentation/studio/studio-hint";
import { allFramesReady } from "@/service/production-plan";
import type { ScroClipMenuAction } from "@/opencut/embed/scro-video-actions";
import type { ScroOpenCutHost } from "@/service/opencut/host-channel";
import type { PublicVideo } from "@/presentation/serialize";

function exportFilename(project: PublicVideo, fallback: string) {
  const raw = project.phaseA?.localizedTitle || project.phaseA?.englishTitle || fallback;
  const base = raw.replace(/[\\/:*?"<>|]+/g, " ").trim() || fallback;
  return `${base}.mp4`;
}

function fallbackShareUrl(project: PublicVideo): string | undefined {
  if (project.finalUrl) return project.finalUrl;
  if (project.reelUrl) return project.reelUrl;
  const firstClip = project.clips?.find((c) => c.blobUrl || c.outputUrl);
  return firstClip?.blobUrl || firstClip?.outputUrl;
}

function writePopupPreparingScreen(popup: Window, platformLabel: string, isZh: boolean) {
  try {
    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${isZh ? `正在匯出影片並前往 ${platformLabel}…` : `Exporting video for ${platformLabel}…`}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #12141c; color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; box-sizing: border-box; }
    .card { max-width: 420px; width: 100%; border: 2px solid #c6f24b; border-radius: 20px; padding: 28px 24px; text-align: center; background: #191c26; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(198,242,75,0.25); border-top-color: #c6f24b; border-radius: 50%; margin: 0 auto 16px; animation: spin 0.8s linear infinite; }
    h1 { font-size: 18px; margin: 0 0 8px; color: #c6f24b; }
    p { font-size: 13px; line-height: 1.6; color: #b4b9c7; margin: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>${isZh ? `正在匯出 MP4 並開啟 ${platformLabel}…` : `Exporting MP4 & opening ${platformLabel}…`}</h1>
    <p>${
      isZh
        ? "正在將時間軸合成為 1080p MP4 影片並自動下載至裝置，完成後本分頁將立即跳轉至發佈畫面。"
        : "Rendering your timeline to 1080p MP4 and downloading to your device. This tab will redirect automatically once ready."
    }</p>
  </div>
</body>
</html>`);
    popup.document.close();
  } catch {
    // Ignore cross-origin document write errors
  }
}

// Sits to the right of 重新開始 and asks the in-page OpenCut editor to render the timeline
// or export & share directly to WhatsApp, Instagram Reel/Story/Post, TikTok, YouTube Shorts, etc.
export function OpenCutExportButton({
  project,
  host,
  disabled,
  idle = true,
  saving = false,
  onOpenTutorial,
}: {
  project: PublicVideo;
  host: ScroOpenCutHost;
  disabled: boolean;
  idle?: boolean;
  saving?: boolean;
  onOpenTutorial?: () => void;
}) {
  const { t, locale } = useI18n();
  const isZh = locale.startsWith("zh");
  const [phase, setPhase] = useState<"idle" | "exporting" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [activeTarget, setActiveTarget] = useState<ExportShareTargetId | null>(null);
  const pendingPopupRef = useRef<Window | null>(null);
  const videosEnabled = idle && allFramesReady(project);

  const shareTitle =
    project.phaseA?.localizedTitle ||
    project.phaseA?.englishTitle ||
    project.spokenScript?.slice(0, 80) ||
    project.source.slice(0, 80) ||
    "Video";

  async function finalizeExportShare({
    targetId,
    buffer,
    filename,
  }: {
    targetId: ExportShareTargetId;
    buffer?: ArrayBuffer;
    filename: string;
  }) {
    const popup = pendingPopupRef.current;
    pendingPopupRef.current = null;

    try {
      if (targetId === "download") return;

      const file =
        buffer && buffer.byteLength > 0
          ? new File([buffer], filename, { type: "video/mp4" })
          : null;

      const isInstagramTarget =
        targetId === "instagram_reel" ||
        targetId === "instagram_story" ||
        targetId === "instagram_post";

      // On mobile devices (iOS / Android), use Web Share API with the MP4 file if supported
      // so the native Instagram Reel / Story / Post sheet opens with the video attached directly.
      if (
        (targetId === "native_share" ||
          (isInstagramTarget &&
            typeof navigator !== "undefined" &&
            /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))) &&
        file &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        const shareData = { files: [file], title: shareTitle, text: shareTitle };
        if (!navigator.canShare || navigator.canShare(shareData)) {
          if (popup && !popup.closed) popup.close();
          await navigator.share(shareData).catch(() => {});
          return;
        }
      }
      if (targetId === "native_share") return;

      const spec = ALL_EXPORT_SHARE_TARGETS.find((item) => item.id === targetId);
      let hostedUrl = fallbackShareUrl(project);
      if (spec?.needsHostedUrl && file) {
        try {
          const formData = new FormData();
          formData.set("file", file);
          const uploaded = await persistExportedShareVideoAction(project.id, formData);
          if (uploaded.ok && uploaded.url) {
            hostedUrl = uploaded.url;
          }
        } catch {
          // Fall back to existing project URL
        }
      }

      const targetUrl = buildExportShareTargetUrl({
        targetId,
        videoUrl: hostedUrl,
        title: shareTitle,
      });

      if (targetUrl) {
        if (popup && !popup.closed) {
          popup.location.replace(targetUrl);
        } else {
          window.open(targetUrl, "_blank", "noopener,noreferrer");
        }
      }
    } finally {
      setActiveTarget(null);
      setPhase("idle");
      setProgress(0);
    }
  }

  useEffect(() => {
    return host.subscribeScro((payload) => {
      const data = payload as {
        type?: string;
        exporting?: boolean;
        progress?: number;
        buffer?: ArrayBuffer;
        filename?: string;
        targetId?: ExportShareTargetId;
      };
      if (data?.type === "scro-export-progress" && data.exporting) {
        setPhase("exporting");
        setProgress(typeof data.progress === "number" ? data.progress : 0);
      } else if (data?.type === "scro-export-done") {
        const targetId = data.targetId || "download";
        const filename =
          data.filename || exportFilename(project, t("video.export.fallbackBasename"));
        void finalizeExportShare({
          targetId,
          buffer: data.buffer,
          filename,
        });
      } else if (data?.type === "scro-export-error") {
        if (pendingPopupRef.current && !pendingPopupRef.current.closed) {
          pendingPopupRef.current.close();
        }
        pendingPopupRef.current = null;
        setActiveTarget(null);
        setPhase("error");
        setProgress(0);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, project.id]);

  function startExportForTarget(targetId: ExportShareTargetId = "download") {
    if (disabled || phase === "exporting") return;
    setActiveTarget(targetId);
    setPhase("exporting");
    setProgress(0);

    // Copy title/caption to clipboard for 1-click paste on the destination platform
    if (targetId !== "download" && typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(shareTitle).catch(() => {});
    }

    // Open the destination window synchronously inside the click handler so popup blockers never block it
    if (targetId !== "download" && targetId !== "native_share" && typeof window !== "undefined") {
      const spec = ALL_EXPORT_SHARE_TARGETS.find((item) => item.id === targetId);
      const platformLabel = spec ? (isZh ? spec.titleZh : spec.titleEn) : targetId;
      const popup = window.open("about:blank", "_blank");
      if (popup) {
        pendingPopupRef.current = popup;
        writePopupPreparingScreen(popup, platformLabel, isZh);
      }
    }

    host.postToEditor({
      type: "scro-export",
      filename: exportFilename(project, t("video.export.fallbackBasename")),
      targetId,
      skipDownload: false,
    });
  }

  function runClipAction(action: ScroClipMenuAction) {
    host.postToScro({
      type: "scro-clip-menu",
      videoId: project.id,
      action,
    });
  }

  const label =
    phase === "exporting"
      ? progress > 0
        ? t("video.export.percent", { n: Math.round(progress * 100) })
        : t("video.export.exporting")
      : phase === "error"
        ? t("video.export.retry")
        : t("video.export.export");

  const remainingLabel = t("production.bulk.mode.remaining.label");
  const allVideosLabel = t("production.toolbar.bulkAllVideos");
  const addClipLabel = t("production.filmstrip.addClip");

  return (
    <VideoEditorHeaderExport>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span data-opencut-tour="header-save" className="inline-flex">
          <OpenCutSaveIndicator saving={saving} />
        </span>
        <StudioHint hint={remainingLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!idle}
            aria-label={remainingLabel}
            data-opencut-tour="header-finish-missing"
            onClick={() => runClipAction("remaining")}
          >
            <FinishMissingIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={allVideosLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!videosEnabled}
            aria-label={allVideosLabel}
            data-opencut-tour="header-all-videos"
            onClick={() => runClipAction("clips")}
          >
            <AllFramesVideoIcon />
          </StudioButton>
        </StudioHint>
        <StudioHint hint={addClipLabel}>
          <StudioButton
            variant="ghost"
            className="w-9 !px-0"
            disabled={!idle}
            aria-label={addClipLabel}
            data-opencut-tour="header-add-clip"
            onClick={() => runClipAction("add")}
          >
            <AddClipIcon className="h-4 w-4" />
          </StudioButton>
        </StudioHint>
        <VideoExportMegaMenu
          label={label}
          busy={phase === "exporting"}
          activeTarget={activeTarget}
          disabled={disabled}
          hint={disabled ? t("video.export.waitForClips") : t("video.export.hint")}
          locale={locale}
          onSelectTarget={startExportForTarget}
        />
        {onOpenTutorial ? (
          <StudioHint hint="查看編輯器操作導覽 · Editor Tour">
            <button
              type="button"
              onClick={onOpenTutorial}
              aria-label="OpenCut Editor Tour"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--studio-line)] bg-[var(--studio-fill)] font-display text-xs font-bold text-[var(--studio-muted)] transition hover:border-[var(--studio-ink)] hover:text-[var(--studio-ink)]"
            >
              ?
            </button>
          </StudioHint>
        ) : null}
      </div>
    </VideoEditorHeaderExport>
  );
}
