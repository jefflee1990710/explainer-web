"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { Spinner } from "@/presentation/components/spinner";
import { useI18n } from "@/presentation/components/i18n-provider";
import { uploadCharacterImageAction } from "@/presentation/actions/upload";
import { translateAppError } from "@/util/i18n/translate-app-error";

// Face-only guided shots. A full-body photo is not required.
const CAPTURE_STEPS = [
  { id: "front", title: "characters.cameraStepFront", hint: "characters.cameraHintFront" },
  { id: "left", title: "characters.cameraStepLeft", hint: "characters.cameraHintLeft" },
  { id: "right", title: "characters.cameraStepRight", hint: "characters.cameraHintRight" },
] as const;

type CaptureStepId = (typeof CAPTURE_STEPS)[number]["id"];

type Shot = { stepId: CaptureStepId; blob: Blob; url: string };

// Shape Detection API (Chrome / Android). Absent on Safari and Firefox, where the shutter is manual.
type DetectedFace = { boundingBox: { x: number; y: number; width: number; height: number } };
type FaceDetectorLike = { detect(source: HTMLVideoElement): Promise<DetectedFace[]> };
type FaceDetectorCtor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;

function faceDetectorCtor(): FaceDetectorCtor | null {
  const ctor = (globalThis as { FaceDetector?: FaceDetectorCtor }).FaceDetector;
  return typeof ctor === "function" ? ctor : null;
}

// How long one steady face must sit inside the guide before the auto shutter counts down.
const STEADY_MS = 900;
const COUNTDOWN_SECONDS = 3;

// Opens the camera, walks through the guided shots, uploads them, and hands back the URLs.
export function CameraCaptureDialog({
  remaining,
  onClose,
  onCaptured,
}: {
  // How many photos the reference list can still take.
  remaining: number;
  onClose: () => void;
  onCaptured: (urls: string[]) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [canSwitch, setCanSwitch] = useState(false);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Only rendered after a click, so reading the browser API in the initializer is safe.
  const [autoShutter] = useState(() => Boolean(faceDetectorCtor()));
  const [faceInGuide, setFaceInGuide] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const step = CAPTURE_STEPS[Math.min(stepIndex, CAPTURE_STEPS.length - 1)];
  const finished = stepIndex >= CAPTURE_STEPS.length;
  const atLimit = shots.length >= remaining;
  const mirrored = facing === "user";
  const detecting = autoShutter && ready && !finished;

  // Start (or restart) the stream for the chosen camera.
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => {
        if (!cancelled) setCameraError(t("characters.cameraUnsupported"));
      });
      return () => {
        cancelled = true;
      };
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // Autoplay can reject before the element is attached; the loadedmetadata handler retries.
          }
        }
        setReady(true);
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setCanSwitch(devices.filter((device) => device.kind === "videoinput").length > 1);
        } catch {
          setCanSwitch(false);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setCameraError(
          name === "NotAllowedError" || name === "SecurityError"
            ? t("characters.cameraDenied")
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? t("characters.cameraNotFound")
              : t("characters.cameraFailed"),
        );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facing, t]);

  // Freeze the current frame to a JPEG and queue it for this step.
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || atLimit || finished) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    // The preview is mirrored for a selfie; the saved photo keeps the true orientation.
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const current = CAPTURE_STEPS[Math.min(stepIndex, CAPTURE_STEPS.length - 1)];
        setShots((list) => [...list, { stepId: current.id, blob, url: URL.createObjectURL(blob) }]);
        setStepIndex((index) => index + 1);
      },
      "image/jpeg",
      0.92,
    );
  }, [atLimit, finished, stepIndex]);

  // Self-timer: tick once a second; the last tick fires the shutter.
  useEffect(() => {
    if (countdown === null) return;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        capture();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, capture]);

  // Auto shutter: one face steady inside the guide for STEADY_MS starts the countdown.
  useEffect(() => {
    if (!detecting) return;
    const Ctor = faceDetectorCtor();
    if (!Ctor) return;
    const detector = new Ctor({ fastMode: true, maxDetectedFaces: 2 });
    let steadySince: number | null = null;
    let armed = false;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      const video = videoRef.current;
      if (cancelled || !video || !video.videoWidth) return;
      let faces: DetectedFace[] = [];
      try {
        faces = await detector.detect(video);
      } catch {
        return;
      }
      if (cancelled) return;
      const inside = faces.length === 1 && faceInsideGuide(faces[0], video.videoWidth, video.videoHeight);
      setFaceInGuide(inside);
      if (!inside) {
        steadySince = null;
        armed = false;
        return;
      }
      const now = Date.now();
      if (steadySince === null) steadySince = now;
      if (!armed && now - steadySince >= STEADY_MS) {
        armed = true;
        setCountdown((value) => (value === null ? COUNTDOWN_SECONDS : value));
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [detecting, stepIndex]);

  // Release object URLs when the dialog goes away.
  useEffect(() => {
    return () => {
      shots.forEach((shot) => URL.revokeObjectURL(shot.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !uploading) {
        // The create dialog listens on window too; keep it open.
        event.stopImmediatePropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, uploading]);

  function retakeLast() {
    setShots((list) => {
      const last = list[list.length - 1];
      if (last) URL.revokeObjectURL(last.url);
      return list.slice(0, -1);
    });
    setStepIndex((index) => Math.max(0, index - 1));
    setCountdown(null);
  }

  function skipStep() {
    setCountdown(null);
    setStepIndex((index) => index + 1);
  }

  // Upload every shot through the same action the file picker uses.
  async function finish() {
    if (shots.length === 0) {
      onClose();
      return;
    }
    setUploading(true);
    setUploadError("");
    const urls: string[] = [];
    try {
      for (const shot of shots) {
        const data = new FormData();
        data.set("file", new File([shot.blob], `camera-${shot.stepId}-${Date.now()}.jpg`, { type: "image/jpeg" }));
        const result = await uploadCharacterImageAction(data);
        if (!result.ok) {
          setUploadError(translateAppError(result.error, t));
          setUploading(false);
          return;
        }
        urls.push(result.url);
      }
      onCaptured(urls);
      onClose();
    } catch {
      setUploadError(t("characters.referencesUploadFailed"));
      setUploading(false);
    }
  }

  const stepTitle = finished ? t("characters.cameraDoneTitle") : t(step.title);
  const stepHint = finished ? t("characters.cameraDoneHint") : t(step.hint);

  return (
    <DialogBackdrop
      zIndex={120}
      className="grid place-items-center bg-accent-ink/70 p-4 backdrop-blur-sm"
      onClick={(event) => {
        // Nested inside the create dialog: a scrim click must not close that one too.
        event.stopPropagation();
        if (!uploading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-accent-ink/10 bg-paper p-5 shadow-[8px_8px_0_0_rgba(18,20,28,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("characters.cameraTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("characters.cameraIntro")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label={t("common.close")}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-lg leading-none disabled:opacity-60"
          >
            ×
          </button>
        </div>

        {/* Step progress */}
        <ol className="mt-4 flex items-center gap-2" aria-label={t("characters.cameraProgressAria")}>
          {CAPTURE_STEPS.map((item, index) => {
            const done = shots.some((shot) => shot.stepId === item.id);
            const active = index === stepIndex;
            return (
              <li
                key={item.id}
                className={`h-1.5 flex-1 rounded-full ${done ? "bg-accent-ink" : active ? "bg-accent" : "bg-accent-ink/15"}`}
                aria-current={active ? "step" : undefined}
              />
            );
          })}
        </ol>

        <p className="mt-3 text-sm font-semibold">{stepTitle}</p>
        <p className="text-xs leading-5 text-muted">{stepHint}</p>

        {/* Live preview with the framing guide */}
        <div className="relative mt-3 aspect-[3/4] w-full overflow-hidden rounded-[1.25rem] border border-accent-ink/10 bg-accent-ink">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={(event) => void event.currentTarget.play().catch(() => undefined)}
            className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
          />
          {!finished && ready ? (
            <div
              aria-hidden
              className={`pointer-events-none absolute left-1/2 top-[42%] h-[52%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px] transition-colors ${
                detecting && faceInGuide ? "border-lime" : "border-paper/80"
              }`}
            />
          ) : null}
          {countdown !== null ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="font-display text-8xl font-bold text-paper drop-shadow">{countdown}</span>
            </div>
          ) : null}
          {!ready && !cameraError ? (
            <div className="absolute inset-0 grid place-items-center text-sm text-paper">
              <span className="inline-flex items-center gap-2">
                <Spinner /> {t("characters.cameraStarting")}
              </span>
            </div>
          ) : null}
          {cameraError ? (
            <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-paper">
              {cameraError}
            </div>
          ) : null}
          {canSwitch ? (
            <button
              type="button"
              onClick={() => {
                // Reset here (not in the effect) so the preview shows the spinner while the new stream opens.
                setReady(false);
                setCameraError("");
                setFacing((value) => (value === "user" ? "environment" : "user"));
              }}
              className="absolute right-3 top-3 cursor-pointer rounded-full bg-paper/90 px-3 py-1.5 text-xs font-semibold"
            >
              {t("characters.cameraSwitch")}
            </button>
          ) : null}
        </div>

        {autoShutter && !finished ? (
          <p className="mt-2 text-xs text-muted">{t("characters.cameraAutoHint")}</p>
        ) : null}

        {/* Shutter row */}
        {!finished ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={capture}
              disabled={!ready || atLimit || countdown !== null}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[3px_3px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("characters.cameraShutter")}
            </button>
            <button
              type="button"
              onClick={() => setCountdown(COUNTDOWN_SECONDS)}
              disabled={!ready || atLimit || countdown !== null}
              className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-accent-ink/15 bg-paper px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {t("characters.cameraTimer", { s: COUNTDOWN_SECONDS })}
            </button>
            <button
              type="button"
              onClick={skipStep}
              className="min-h-[44px] cursor-pointer rounded-full px-3 text-sm font-semibold text-muted hover:text-foreground"
            >
              {t("characters.cameraSkipStep")}
            </button>
            {atLimit ? <p className="text-xs text-accent">{t("characters.cameraAtLimit")}</p> : null}
          </div>
        ) : null}

        {/* Captured strip */}
        {shots.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {shots.map((shot, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={shot.url}
                src={shot.url}
                alt={t("characters.cameraShotAlt", { n: index + 1 })}
                className="h-16 w-12 rounded-lg border border-accent-ink/10 object-cover"
              />
            ))}
            <button
              type="button"
              onClick={retakeLast}
              disabled={uploading}
              className="min-h-[36px] cursor-pointer rounded-full border border-accent-ink/15 px-3 text-xs font-semibold disabled:opacity-60"
            >
              {t("characters.cameraRetake")}
            </button>
          </div>
        ) : null}

        {uploadError ? (
          <p role="alert" className="mt-3 text-sm text-accent">
            {uploadError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-accent-ink/10 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="min-h-[44px] cursor-pointer rounded-full px-4 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-60"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void finish()}
            disabled={uploading || shots.length === 0}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 text-sm font-semibold text-lime transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? <Spinner className="h-4 w-4" /> : null}
            {t("characters.cameraUse", { n: shots.length })}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}

// The face oval sits at 42% height, 62% wide, 52% tall of the preview; the
// preview is object-cover, so compare in the video's own coordinates by ratio.
function faceInsideGuide(face: DetectedFace, width: number, height: number) {
  const box = face.boundingBox;
  const cx = (box.x + box.width / 2) / width;
  const cy = (box.y + box.height / 2) / height;
  const size = box.height / height;
  return Math.abs(cx - 0.5) < 0.18 && Math.abs(cy - 0.42) < 0.16 && size > 0.18 && size < 0.6;
}
