"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ClipVideoPlaceholder } from "@/presentation/components/project/clip-video-placeholder";
import { ClipVideoPlayer } from "@/presentation/components/project/clip-video-player";
import { ASPECT_CLASS } from "@/presentation/components/project/frame-tile";
import { Spinner } from "@/presentation/components/spinner";
import { clipNextAction, clipNextActionText } from "@/service/clip-next-action";
import type { ClipState } from "@/service/clip-stage";
import { MIN_VIDEO_COST } from "@/service/credit-costs";
import { userFacingJobError } from "@/service/higgsfield/job-status";
import { displayMediaSrc } from "@/util/media-src";
import { translateAppError } from "@/util/i18n/translate-app-error";
import type { AspectRatio, ProjectClip } from "@/model/project";

export function ClipVideoPanel({
  clip,
  state,
  aspectRatio,
  pending,
  posterSrc,
  boxStyle,
  onGenerate,
  onCancel,
  cancelPending,
}: {
  clip?: ProjectClip;
  state: ClipState;
  aspectRatio: AspectRatio;
  pending: boolean;
  // Scene still shown until this clip's video file is ready.
  posterSrc?: string;
  boxStyle?: { width: number; height: number };
  onGenerate: () => void;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const { t } = useI18n();
  const src = displayMediaSrc(clip);
  const generating = state.stage === "video_generating" || pending;
  const failed = clip?.status === "failed";
  const errorRaw = failed ? userFacingJobError("failed", clip?.error) : undefined;
  const error = errorRaw ? translateAppError(errorRaw, t) : "";
  const showVideo = Boolean(src) && !generating;
  const showPoster = Boolean(posterSrc) && !showVideo;

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-[var(--studio-line)] bg-[var(--studio-canvas)] ${
        boxStyle ? "shrink-0" : `w-full ${ASPECT_CLASS[aspectRatio]}`
      }`}
      style={boxStyle}
    >
      {showPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {src && showVideo ? (
        <>
          <ClipVideoPlayer src={src} dimmed={state.stale.video || failed} />
          {failed ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-accent/85 px-2 py-1.5 text-center font-display text-[11px] font-bold text-white">
              {t("production.video.failedOverlay", { error: error ? `：${error}` : "" })}
            </span>
          ) : null}
        </>
      ) : generating ? (
        <GeneratingVideo
          state={state}
          overImage={showPoster}
          cancelling={cancelPending}
          onCancel={onCancel}
        />
      ) : failed ? (
        <div className="absolute inset-0 grid place-items-center bg-accent/10 p-3 text-center text-[11px] font-semibold text-accent">
          {t("production.video.failedInline", { error: error ? `：${error}` : "" })}
          <br />
          <span className="font-normal text-muted">{t("production.video.creditsRefunded")}</span>
        </div>
      ) : (
        <ClipVideoPlaceholder
          pending={pending}
          disabled={clipNextAction(state).kind !== "video"}
          cost={state.videoCost ?? MIN_VIDEO_COST}
          overImage={showPoster}
          onGenerate={onGenerate}
        />
      )}
      {showVideo && state.stale.video ? (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 font-display text-[10px] font-bold text-white">
          {t("production.stale.badge")}
        </span>
      ) : null}
    </div>
  );
}

function GeneratingVideo({
  state,
  overImage,
  cancelling,
  onCancel,
}: {
  state: ClipState;
  overImage: boolean;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const action = clipNextAction(state);
  const text = clipNextActionText(t, action);
  return (
    <div
      className={`absolute inset-0 grid place-items-center ${overImage ? "bg-white/45" : "bg-accent-ink/5"}`}
      aria-label={text.label}
    >
      <motion.div
        className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-paper/80 to-transparent"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative z-10 flex flex-col items-center gap-2 px-4 text-center text-accent-ink/50">
        <Spinner className="h-5 w-5" />
        <span className="font-display text-[11px] font-bold">{text.label}</span>
        <span className="text-[11px]">{text.hint}</span>
        {state.videoUnsent ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="mt-1 cursor-pointer rounded-full bg-[var(--studio-ink)] px-3 py-1.5 font-display text-[11px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {cancelling ? <Spinner className="h-3.5 w-3.5" /> : t("production.video.cancelQueued")}
          </button>
        ) : null}
      </span>
    </div>
  );
}
