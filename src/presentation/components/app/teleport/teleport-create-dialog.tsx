"use client";

import { useEffect, useId, useState } from "react";
import type { PublicTeleportJob } from "@/model/teleport-job";
import { startTeleportJobAction } from "@/presentation/actions/teleport";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { BrandUploadDropzone } from "@/presentation/components/app/projects/new/brand-upload-dropzone";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";

/** Parse the start field; empty or invalid text falls back to 0, never below 0. */
function clampStart(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/** Parse the length field; empty or invalid text falls back to 6, clamped to 2–15. */
function clampLength(text: string): number {
  const n = Number(text);
  if (text.trim() === "" || !Number.isFinite(n)) return 6;
  return Math.min(15, Math.max(2, n));
}

/** Modal for creating a Teleport job: source clip, section, scene still and/or prompt. */
export function TeleportCreateDialog({
  onCreated,
  onClose,
}: {
  onCreated: (job: PublicTeleportJob) => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sourceUploadProgress, setSourceUploadProgress] = useState<number | null>(null);
  // Raw input text so typing is not clamped per keystroke; clamped on blur and submit.
  const [startText, setStartText] = useState("0");
  const [lengthText, setLengthText] = useState("6");
  const [sceneImageUrl, setSceneImageUrl] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);
  const [applyColorFix, setApplyColorFix] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Escape closes the dialog unless a request is in flight.
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const canSubmit =
    !submitting && Boolean(sourceVideoUrl) && (Boolean(sceneImageUrl) || Boolean(scenePrompt.trim()));

  // Start the job through the server action.
  async function onSubmit() {
    if (!canSubmit) return;
    setError("");
    const sectionStart = clampStart(startText);
    const sectionLength = clampLength(lengthText);
    setStartText(String(sectionStart));
    setLengthText(String(sectionLength));
    setSubmitting(true);
    try {
      const res = await startTeleportJobAction({
        sourceVideoUrl,
        sectionStart,
        sectionLength,
        sceneImageUrl: sceneImageUrl || undefined,
        scenePrompt: scenePrompt.trim() || undefined,
        keepSourceAudio,
        applyColorFix,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated(res.job);
    } catch {
      setError(isEn ? "Failed to start Teleport." : "啟動 Teleport 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogBackdrop
      className="grid place-items-center bg-accent-ink/50 p-3 backdrop-blur-xs sm:p-6"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        {/* Dialog header */}
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                Teleport
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                {isEn ? "New scene relocate" : "新增換場"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Upload a clip, relocate it with a scene photo, and tweak the mood with text."
                : "上傳短片，用場景照當地點，文字可以再改氣氛。"}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={isEn ? "Close dialog" : "關閉視窗"}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-base font-bold text-muted transition hover:border-accent-ink hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Step 1: source video + section */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold">
                {isEn ? "1. Source Video & Section" : "1. 上傳來源影片與截取片段"}
              </span>
              <BrandUploadButton
                label={
                  sourceVideoUrl
                    ? isEn
                      ? "Replace Video"
                      : "更換影片"
                    : isEn
                      ? "Upload MP4 / MOV"
                      : "上傳影片 (MP4/MOV)"
                }
                accept="video/mp4,video/quicktime"
                disabled={submitting}
                onUploaded={(asset) => {
                  if (asset.kind === "video") {
                    setSourceVideoUrl(asset.url);
                    setError("");
                  }
                }}
                onProgress={setSourceUploadProgress}
                onError={setError}
              />
            </div>

            {sourceVideoUrl ? (
              <div className="grid gap-4 rounded-xl border border-accent-ink/12 bg-paper/70 p-3 sm:grid-cols-[1fr_14rem]">
                <video
                  src={sourceVideoUrl}
                  controls
                  playsInline
                  className="max-h-52 w-full rounded-lg bg-black object-contain"
                />
                <div className="flex flex-col justify-center gap-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      {isEn ? "Starts at (sec)" : "起始秒數 Starts at (s)"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={submitting}
                      value={startText}
                      onChange={(e) => setStartText(e.target.value)}
                      onBlur={() => setStartText(String(clampStart(startText)))}
                      className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      {isEn ? "Clip Length (2–15s)" : "截取長度 Length (2–15秒)"}
                    </span>
                    <input
                      type="number"
                      min={2}
                      max={15}
                      step={1}
                      disabled={submitting}
                      value={lengthText}
                      onChange={(e) => setLengthText(e.target.value)}
                      onBlur={() => setLengthText(String(clampLength(lengthText)))}
                      className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <BrandUploadDropzone
                accept="video/mp4,video/quicktime"
                disabled={submitting}
                externalProgress={sourceUploadProgress}
                hintText={
                  isEn
                    ? "Click or drag & drop a source MP4/MOV video (up to 50MB) here"
                    : "點擊或拖曳上傳參考短片 (MP4/MOV，最高 50MB)"
                }
                onUploaded={(asset) => {
                  if (asset.kind === "video") {
                    setSourceVideoUrl(asset.url);
                    setError("");
                  }
                }}
                onProgress={setSourceUploadProgress}
                onError={setError}
              />
            )}
          </section>

          {/* Step 2: scene still + prompt */}
          <section className="space-y-3 border-t border-accent-ink/10 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-sm font-bold">
                {isEn ? "2. New Scene" : "2. 新場景"}
              </span>
              <div className="flex items-center gap-2">
                <BrandUploadButton
                  label={
                    sceneImageUrl
                      ? isEn
                        ? "Replace Scene Photo"
                        : "更換場景照"
                      : isEn
                        ? "Upload Scene Photo"
                        : "上傳場景照"
                  }
                  accept="image/png,image/jpeg,image/webp"
                  disabled={submitting}
                  onUploaded={(asset) => {
                    if (asset.kind === "image") {
                      setSceneImageUrl(asset.url);
                      setError("");
                    }
                  }}
                  onError={setError}
                />
                {sceneImageUrl ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setSceneImageUrl("")}
                    className="cursor-pointer text-xs font-semibold text-red-600"
                  >
                    {isEn ? "Clear photo" : "清除相片"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              {sceneImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sceneImageUrl}
                  alt=""
                  className="h-32 w-full rounded-xl border border-accent-ink/12 bg-zinc-900 object-cover"
                />
              ) : (
                <BrandUploadDropzone
                  accept="image/png,image/jpeg,image/webp"
                  disabled={submitting}
                  className="h-32"
                  hintText={isEn ? "Click or drop scene photo" : "點擊或拖曳場景照"}
                  onUploaded={(asset) => {
                    if (asset.kind === "image") {
                      setSceneImageUrl(asset.url);
                      setError("");
                    }
                  }}
                  onError={setError}
                />
              )}
              <label className="block">
                <span className="text-[11px] font-semibold text-muted">
                  {isEn ? "Scene description (optional with a photo)" : "場景描述（有場景照時可留空）"}
                </span>
                <textarea
                  rows={4}
                  disabled={submitting}
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. A rainy neon street at night"
                      : "例如：下雨嘅霓虹街道夜景"
                  }
                  className="mt-1 w-full resize-none rounded-lg border border-accent-ink/20 bg-white px-2.5 py-2 text-xs font-semibold"
                />
              </label>
            </div>
          </section>

          {/* Advanced options */}
          <details className="rounded-2xl border border-accent-ink/12 bg-paper/60 p-4">
            <summary className="cursor-pointer font-display text-xs font-bold text-foreground">
              {isEn ? "Advanced" : "進階設定"}
            </summary>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={keepSourceAudio}
                  disabled={submitting}
                  onChange={(e) => setKeepSourceAudio(e.target.checked)}
                  className="h-4 w-4 rounded accent-accent-ink"
                />
                <span>{isEn ? "Keep source audio" : "保留原片聲音"}</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={applyColorFix}
                  disabled={submitting}
                  onChange={(e) => setApplyColorFix(e.target.checked)}
                  className="h-4 w-4 rounded accent-accent-ink"
                />
                <span>{isEn ? "H3 Soft color" : "H3 Soft 調色"}</span>
              </label>
            </div>
          </details>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
            >
              {error}
            </p>
          ) : null}
        </div>

        {/* Dialog footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-accent-ink/10 bg-paper/80 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full px-4 text-xs font-bold text-muted transition hover:text-foreground"
          >
            {isEn ? "Cancel" : "取消"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Spinner className="h-4 w-4" /> : null}
            <span>
              {submitting
                ? isEn
                  ? "Starting Background Task…"
                  : "正在啟動背景任務…"
                : isEn
                  ? "Generate"
                  : "Generate 立即生成"}
            </span>
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
