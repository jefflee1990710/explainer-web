"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useI18n } from "@/presentation/components/i18n-provider";
import { FrameTileDrawing } from "@/presentation/components/project/frame-tile-drawing";
import { frameTileFace } from "@/presentation/components/project/frame-tile-face";
import { mediaRetrySrc } from "@/util/media-retry-src";
import { PencilIcon } from "@/presentation/components/project/production-icons";
import { userFacingJobError } from "@/service/higgsfield/job-status";
import { mediaSrc } from "@/util/media-src";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { AspectRatio, ClipFrame, FramePosition } from "@/model/project";

const ease = [0.22, 1, 0.36, 1] as const;
const MAX_SRC_RETRIES = 3;

export const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
};

export function FrameTile({
  frame,
  position,
  aspectRatio,
  pending,
  stale = false,
  compact = false,
  boxStyle,
  onOpen,
}: {
  frame?: ClipFrame;
  position: FramePosition;
  aspectRatio: AspectRatio;
  pending: boolean;
  stale?: boolean;
  compact?: boolean;
  boxStyle?: { width: number; height: number };
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const src = mediaSrc(frame);
  const [retryState, setRetryState] = useState({ key: "", n: 0 });
  const retry = src && retryState.key === src ? retryState.n : 0;
  const displaySrc = src ? mediaRetrySrc(src, retry) : undefined;
  const completed = frame?.status === "completed" && Boolean(src);
  const failed = frame?.status === "failed";
  const errorRaw = failed ? userFacingJobError("failed", frame?.error) : undefined;
  const error = errorRaw ? translateAppError(errorRaw, t) : undefined;
  const inFlight =
    pending ||
    frame?.status === "queued" ||
    frame?.status === "in_progress";
  const face = frameTileFace(frame, pending, Boolean(src));
  const positionLabel = t(`production.frame.position.${position}`);
  const label = positionLabel;

  const statusCaption =
    face === "empty"
      ? t("production.frame.status.notGenerated")
      : face === "failed"
        ? t("production.frame.status.failed")
        : face === "image"
          ? t("production.frame.status.done")
          : frame?.status === "queued" && !pending
            ? t("production.frame.status.queued")
            : t("production.frame.status.generating");

  return (
    <figure className="min-w-0 shrink-0">
      <div
        className={`relative overflow-hidden rounded-xl border border-accent-ink/10 bg-paper ${
          boxStyle ? "shrink-0" : `w-full ${ASPECT_CLASS[aspectRatio]}`
        }`}
        style={boxStyle}
      >
        <AnimatePresence mode="wait" initial={false}>
          {face === "image" ? (
            <motion.button
              key={src}
              type="button"
              onClick={onOpen}
              aria-label={t("production.frame.annotateAria", { position: positionLabel })}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: stale || failed ? 0.6 : 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="group absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displaySrc}
                alt={t("production.frame.alt", { position: positionLabel })}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                onError={() => {
                  if (!src) return;
                  window.setTimeout(() => {
                    setRetryState((prev) => {
                      const n = prev.key === src ? prev.n : 0;
                      return { key: src, n: n < MAX_SRC_RETRIES ? n + 1 : n };
                    });
                  }, 400 * (retry + 1));
                }}
              />
              {failed ? (
                <span className="absolute inset-x-0 bottom-0 bg-accent/85 px-2 py-1.5 text-center font-display text-[11px] font-bold text-white">
                  {t("production.frame.generateFailed")}
                  {error ? `：${error}` : ""}
                </span>
              ) : (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-accent-ink/70 to-transparent px-2 pb-2 pt-6 font-display text-[11px] font-bold text-paper opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <PencilIcon className="h-3.5 w-3.5" />
                  {t("production.frame.clickToAnnotate")}
                </span>
              )}
            </motion.button>
          ) : face === "drawing" ? (
            <FrameTileDrawing />
          ) : face === "failed" ? (
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-xs font-semibold text-accent"
            >
              <span>
                {t("production.frame.generateFailed")}
                {error ? (
                  <span className="mt-1 block font-medium leading-snug text-accent/90">{error}</span>
                ) : null}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 grid place-items-center border-2 border-dashed border-accent-ink/15 text-xs font-semibold text-muted"
            >
              {t("production.frame.pending")}
            </motion.div>
          )}
        </AnimatePresence>
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-accent-ink/85 px-2 py-0.5 font-display text-[10px] font-bold text-paper">
          {label}
        </span>
        {stale && completed ? (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
            {t("production.stale.badge")}
          </span>
        ) : null}
      </div>
      {compact ? null : (
        <figcaption className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">{statusCaption}</span>
          {completed && !inFlight ? (
            <span className="text-[11px] text-muted">{t("production.frame.hint.annotate")}</span>
          ) : null}
        </figcaption>
      )}
    </figure>
  );
}
