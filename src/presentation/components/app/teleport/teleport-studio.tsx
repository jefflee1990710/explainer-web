"use client";

import { useEffect, useState } from "react";
import type { PublicTeleportJob } from "@/model/teleport-job";
import {
  deleteTeleportJobAction,
  pollTeleportJobStatusAction,
  startTeleportJobAction,
} from "@/presentation/actions/teleport";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { BrandUploadDropzone } from "@/presentation/components/app/projects/new/brand-upload-dropzone";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { TeleportHistoryDialog } from "@/presentation/components/app/teleport/teleport-history-dialog";
import { TeleportHistoryPanel } from "@/presentation/components/app/teleport/teleport-history-panel";
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

/** Teleport studio: directly displays the creation form with a top-right History button. */
export function TeleportStudio({ initialJobs }: { initialJobs: PublicTeleportJob[] }) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const historyLabel =
    locale === "zh-Hant"
      ? "歷史紀錄"
      : locale === "zh-Hans"
        ? "历史记录"
        : "History";

  const [jobs, setJobs] = useState<PublicTeleportJob[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<PublicTeleportJob | null>(
    initialJobs[0] ?? null,
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  // Creation form state
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sourceUploadProgress, setSourceUploadProgress] = useState<number | null>(null);
  const [startText, setStartText] = useState("0");
  const [lengthText, setLengthText] = useState("6");
  const [sceneImageUrl, setSceneImageUrl] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);
  const [applyColorFix, setApplyColorFix] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Poll every in-flight job and keep history in sync.
  useEffect(() => {
    const runningIds = jobs
      .filter((item) => item.status === "rendering")
      .map((item) => item.id);
    if (runningIds.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const id of runningIds) {
        const res = await pollTeleportJobStatusAction(id);
        if (!res.ok) continue;
        setJobs((prev) =>
          prev.map((item) => (item.id === res.job.id ? res.job : item)),
        );
        setActiveJob((prev) => (prev?.id === res.job.id ? res.job : prev));
        if (res.job.status === "completed" || res.job.status === "failed") {
          notifyTasksChanged();
        }
      }
    }, 4500);

    return () => window.clearInterval(timer);
  }, [jobs]);

  const canSubmit =
    !submitting &&
    Boolean(sourceVideoUrl) &&
    (Boolean(sceneImageUrl) || Boolean(scenePrompt.trim()));

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
      setActiveJob(res.job);
      setJobs((prev) => [res.job, ...prev.filter((item) => item.id !== res.job.id)]);
      if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
        setHistoryOpen(true);
      }
      notifyTasksChanged();
    } catch {
      setError(isEn ? "Failed to start Teleport." : "啟動 Teleport 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete one job, drop the row, and move the selection if needed.
  async function onDeleteJob(id: string) {
    const res = await deleteTeleportJobAction(id);
    if (res.ok) {
      const remaining = jobs.filter((j) => j.id !== id);
      setJobs(remaining);
      if (activeJob?.id === id) {
        setActiveJob(remaining[0] ?? null);
      }
      notifyTasksChanged();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
      {/* Header with Top-Right History Button (mobile/tablet only; desktop shows right sidebar) */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/90 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
              Teleport
            </span>
            <h1 className="font-display text-xl font-bold">
              {isEn ? "Scene relocate" : "Teleport 換場"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            {isEn
              ? "Upload a clip, relocate it with a scene photo, and tweak the mood with text."
              : "上傳短片，用場景照當地點，文字可以再改氣氛。"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink/15 bg-paper px-3.5 text-xs font-bold text-foreground transition hover:border-accent-ink lg:hidden"
          aria-label={historyLabel}
        >
          <svg
            aria-hidden
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>{historyLabel}</span>
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent-ink/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted">
            {jobs.length}
          </span>
        </button>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
        {/* Main Creation Form Card */}
        <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[4px_4px_0_0_#12141c]">
        <div className="space-y-6 px-6 py-6">
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
                  {isEn
                    ? "Scene description (optional with a photo)"
                    : "場景描述（有場景照時可留空）"}
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

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-accent-ink/10 bg-paper/80 px-6 py-4">
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

        {/* Desktop Right-Side History Panel */}
        <aside className="hidden lg:sticky lg:top-4 lg:block">
          <TeleportHistoryPanel
            jobs={jobs}
            activeJobId={activeJob?.id ?? null}
            onSelectJob={setActiveJob}
            onDeleteJob={(id) => void onDeleteJob(id)}
            layout="sidebar"
          />
        </aside>
      </div>

      {/* History Dialog (mobile/tablet fallback) */}
      <TeleportHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        jobs={jobs}
        activeJobId={activeJob?.id ?? null}
        onSelectJob={setActiveJob}
        onDeleteJob={(id) => void onDeleteJob(id)}
      />
    </div>
  );
}
