"use client";

import { useEffect, useId, useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { listBookendVideosAction } from "@/presentation/actions/video-edit";
import type { BookendPick } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Pick a finished 開場 (intro) or 結尾 (outro) clip to attach.
export function BookendVideoDialog({
  slot,
  onSelect,
  onClose,
}: {
  slot: "intro" | "outro";
  onSelect: (pick: BookendPick) => void;
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(32rem,80vh)] w-full max-w-md flex-col rounded-xl border border-[var(--studio-line)] bg-white shadow-lg"
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
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {error ? (
            <p role="alert" className="text-xs font-medium text-[#e11d48]">
              {error}
            </p>
          ) : videos === null ? (
            <div className="grid place-items-center py-10">
              <Spinner className="h-5 w-5" />
            </div>
          ) : videos.length === 0 ? (
            <p className="px-1 py-8 text-center text-xs text-[var(--studio-muted)]">{empty}</p>
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
