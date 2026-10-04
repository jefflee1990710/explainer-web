"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { listBookendVideosAction } from "@/presentation/actions/video-edit";
import type { BookendClip } from "@/model/video-edit";
import type { BookendPick } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

const MEDIA_ACCEPT = "image/png,image/jpeg,image/webp,video/mp4,video/quicktime";

// Upload a file or pick a finished 開場 / 結尾 clip.
export function BookendVideoDialog({
  slot,
  current,
  busy = false,
  onSelect,
  onUploaded,
  onRemove,
  onClose,
}: {
  slot: "intro" | "outro";
  current?: BookendClip;
  busy?: boolean;
  onSelect: (pick: BookendPick) => void;
  onUploaded: (asset: { url: string; kind: "image" | "video"; durationSec?: number }) => void;
  onRemove?: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [videos, setVideos] = useState<BookendPick[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listBookendVideosAction(slot).then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(translateAppError(result.error, t));
      else setVideos(result.videos);
    });
    return () => {
      cancelled = true;
    };
  }, [slot, t]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = slot === "intro" ? t("video.layers.selectIntroTitle") : t("video.layers.selectOutroTitle");
  const empty = slot === "intro" ? t("video.layers.selectEmptyIntro") : t("video.layers.selectEmptyOutro");
  const label = slot === "intro" ? t("video.layers.intro") : t("video.layers.outro");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(36rem,80vh)] w-full max-w-md flex-col rounded-xl border border-[var(--studio-line)] bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--studio-line)] px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="cursor-pointer px-1 text-sm text-[var(--studio-muted)]">
            {t("common.cancel")}
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {current ? (
            <div className="flex items-center gap-3 rounded-lg border border-[var(--studio-line)] px-2 py-2">
              <span className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded bg-[var(--studio-fill)]">
                {current.kind === "video" ? (
                  <video src={current.assetUrl} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.assetUrl} alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-xs font-semibold">{label}</span>
              {onRemove ? (
                <button
                  type="button"
                  onClick={onRemove}
                  className="cursor-pointer px-1 text-xs font-semibold text-[#e11d48]"
                >
                  {t("video.layers.removeBookendAria", { label })}
                </button>
              ) : null}
            </div>
          ) : null}
          <BrandUploadButton
            label={current ? t("video.layers.replace") : t("video.layers.upload")}
            accept={MEDIA_ACCEPT}
            disabled={busy}
            onUploaded={onUploaded}
            onError={setError}
          />
          <p className="text-[11px] font-bold text-[var(--studio-muted)]">{t("video.layers.orChoose")}</p>
          {error ? (
            <p role="alert" className="text-xs font-medium text-[#e11d48]">
              {error}
            </p>
          ) : videos === null ? (
            <div className="grid place-items-center py-10">
              <Spinner className="h-5 w-5" />
            </div>
          ) : videos.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-[var(--studio-muted)]">{empty}</p>
          ) : (
            <ul className="space-y-1">
              {videos.map((video) => (
                <li key={video.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(video)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--studio-fill)]"
                  >
                    <span className="grid h-14 w-10 shrink-0 place-items-center overflow-hidden rounded bg-[var(--studio-fill)]">
                      {video.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={video.posterUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{video.title}</span>
                      <span className="text-xs text-[var(--studio-muted)]">{video.durationSec}s</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
