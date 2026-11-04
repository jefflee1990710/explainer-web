"use client";

import { useEffect, useRef, useState } from "react";
import { put } from "@vercel/blob/client";
import type { PublicTeleportJob } from "@/model/teleport-job";
import { prepareBrandUploadAction } from "@/presentation/actions/brand-upload";
import {
  deleteTeleportJobAction,
  pollTeleportJobStatusAction,
  startTeleportJobAction,
} from "@/presentation/actions/teleport";
import {
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockStage,
  DirectorDockStepperCell,
} from "@/presentation/components/app/director-dock";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { TeleportHistoryDialog } from "@/presentation/components/app/teleport/teleport-history-dialog";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { checkBrandUpload, resolveBrandContentType } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

/** Teleport studio: Director Panel settings + Drag & Drop Source Video + Scene Photo + Generate workbench. */
export function TeleportStudio({ initialJobs }: { initialJobs: PublicTeleportJob[] }) {
  const { t, locale } = useI18n();
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
  const [sourceDuration, setSourceDuration] = useState(15);
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);
  const [sceneImageUrl, setSceneImageUrl] = useState("");
  const [sceneUploadProgress, setSceneUploadProgress] = useState<number | null>(null);
  const [scenePrompt, setScenePrompt] = useState("");
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);
  const [applyColorFix, setApplyColorFix] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [trimModalOpen, setTrimModalOpen] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [sourceDragOver, setSourceDragOver] = useState(false);
  const [sceneDragOver, setSceneDragOver] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const sceneInputRef = useRef<HTMLInputElement>(null);
  const trimVideoRef = useRef<HTMLVideoElement>(null);

  async function uploadDirectBlob(
    file: File,
    allowGif: boolean,
    onProgress?: (pct: number | null) => void,
  ): Promise<{ url: string; kind: "image" | "video" } | null> {
    const contentType = resolveBrandContentType(file);
    const checked = checkBrandUpload({ type: contentType, size: file.size }, { allowGif });
    if (!checked.ok) {
      setError(translateAppError(checked.error, t));
      return null;
    }
    onProgress?.(0);
    try {
      const prepared = await prepareBrandUploadAction({
        contentType,
        size: file.size,
        allowGif,
      });
      if (!prepared.ok) {
        setError(translateAppError(prepared.error, t));
        return null;
      }
      const blob = await put(prepared.pathname, file, {
        access: "public",
        token: prepared.token,
        contentType: prepared.contentType,
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) =>
          onProgress?.(Math.min(100, Math.round(percentage))),
      });
      return { url: blob.url, kind: prepared.kind };
    } catch {
      setError(t("errors.uploadFailed"));
      return null;
    } finally {
      onProgress?.(null);
    }
  }

  async function handleSourceFile(file: File | undefined) {
    if (!file || submitting) return;
    setError("");
    const uploaded = await uploadDirectBlob(file, false, setSourceUploadProgress);
    if (uploaded && uploaded.kind === "video") {
      setSourceVideoUrl(uploaded.url);
    }
  }

  async function handleSceneFile(file: File | undefined) {
    if (!file || submitting) return;
    setError("");
    const uploaded = await uploadDirectBlob(file, false, setSceneUploadProgress);
    if (uploaded && uploaded.kind === "image") {
      setSceneImageUrl(uploaded.url);
    }
  }

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
    <div className="min-h-[calc(100dvh-4.5rem)] w-full">
      <input
        ref={sourceInputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        disabled={submitting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleSourceFile(file);
        }}
      />
      <input
        ref={sceneInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={submitting}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleSceneFile(file);
        }}
      />

      <DirectorDockStage
        topLeft={
          <div className="flex items-center gap-2">
            <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#c6f24b]">
              Teleport
            </span>
            <span className="text-xs font-semibold text-zinc-600">
              {isEn ? "Scene Relocate Studio" : "影片瞬移換場"}
            </span>
          </div>
        }
        topRight={
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-100 px-3.5 text-xs font-bold text-[#12141c] transition hover:border-zinc-400"
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
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-2xl bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-700">
              {jobs.length}
            </span>
          </button>
        }
      >
        <DirectorDockHero kind="teleport" />

        {/* Director Panel — All Teleport Settings */}
        <DirectorDockPanel>
          {/* Setting 1: Scene Mood / Prompt */}
          <DirectorDockStepperCell
            thumbUrl={sceneImageUrl || "/talking-head-backgrounds/hk-seaview-office.webp"}
            label={isEn ? "Scene Mood / Prompt" : "場景描述與光線"}
            value={
              scenePrompt.trim()
                ? scenePrompt.trim()
                : sceneImageUrl
                  ? isEn
                    ? "Match Scene Photo"
                    : "依場景照光影"
                  : isEn
                    ? "Click to describe scene"
                    : "點擊輸入場景描述"
            }
            disabled={submitting}
            onClick={() => setPromptModalOpen(true)}
          />

          {/* Setting 2: Source Audio */}
          <DirectorDockStepperCell
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            }
            label={isEn ? "Source Audio" : "原片音訊"}
            value={
              keepSourceAudio
                ? isEn
                  ? "Audio: ON"
                  : "保留原聲: 開"
                : isEn
                  ? "Audio: OFF"
                  : "保留原聲: 關"
            }
            disabled={submitting}
            onPrev={() => setKeepSourceAudio((prev) => !prev)}
            onNext={() => setKeepSourceAudio((prev) => !prev)}
            onClick={() => setKeepSourceAudio((prev) => !prev)}
          />

          {/* Setting 3: H3 Color Fix */}
          <DirectorDockStepperCell
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            }
            label={isEn ? "Color Grading" : "H3 智慧調色"}
            value={
              applyColorFix
                ? isEn
                  ? "Color Fix: ON"
                  : "H3 調色: 開"
                : isEn
                  ? "Color Fix: OFF"
                  : "H3 調色: 關"
            }
            disabled={submitting}
            onPrev={() => setApplyColorFix((prev) => !prev)}
            onNext={() => setApplyColorFix((prev) => !prev)}
            onClick={() => setApplyColorFix((prev) => !prev)}
          />

          {/* Setting 4: Interactive Timeline Range Trim */}
          <DirectorDockStepperCell
            icon={
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            label={isEn ? "Timeline Range" : "時間軸截取"}
            value={`${sectionStart}s–${sectionStart + sectionLength}s (${sectionLength}s)`}
            disabled={submitting}
            onClick={() => setTrimModalOpen(true)}
          />
        </DirectorDockPanel>

        {/* Main Drag & Drop Workbench: Source Video + Scene Photo + Generate Button */}
        <div className="mt-3 flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_12px_36px_rgba(18,20,28,0.07)]">
          <div className="flex flex-col items-stretch gap-3 md:flex-row">
            {/* 1. Source Video Drag & Drop Upload / Preview Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!submitting) setSourceDragOver(true);
              }}
              onDragLeave={() => setSourceDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSourceDragOver(false);
                const file = e.dataTransfer.files?.[0];
                void handleSourceFile(file);
              }}
              className={`relative flex min-h-[180px] flex-1 flex-col justify-between overflow-hidden rounded-2xl border-2 border-dashed p-3 transition ${
                sourceDragOver
                  ? "border-[#12141c] bg-[#c6f24b]/15"
                  : sourceVideoUrl
                    ? "border-zinc-200 bg-[#f4f4f5]"
                    : "border-zinc-300 bg-[#f4f4f5] hover:border-zinc-400"
              }`}
            >
              {sourceVideoUrl ? (
                <div className="flex h-full flex-col justify-between gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#12141c]">
                      {isEn ? "1. Source Video" : "1. 來源影片"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setTrimModalOpen(true)}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-bold text-[#12141c] hover:border-[#12141c]"
                      >
                        {isEn
                          ? `Trim ${sectionStart}s–${sectionStart + sectionLength}s`
                          : `截取 ${sectionStart}s–${sectionStart + sectionLength}s`}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => sourceInputRef.current?.click()}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:border-[#12141c] hover:text-[#12141c]"
                      >
                        {isEn ? "Replace" : "更換"}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setSourceVideoUrl("")}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2 py-1 text-[11px] font-bold text-zinc-500 hover:text-red-600"
                        aria-label="Clear source video"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="relative mx-auto max-h-48 w-full overflow-hidden rounded-2xl bg-black">
                    <video
                      src={sourceVideoUrl}
                      controls
                      playsInline
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (!Number.isFinite(dur) || dur <= 0) return;
                        setSourceDuration(Math.max(2, Math.round(dur * 10) / 10));
                        setSectionStart(0);
                        setSectionLength(
                          Math.min(15, Math.max(2, Math.round(dur))),
                        );
                      }}
                      className="max-h-48 w-full rounded-2xl bg-black object-contain"
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={submitting || sourceUploadProgress !== null}
                  onClick={() => sourceInputRef.current?.click()}
                  className="flex h-full min-h-[156px] w-full cursor-pointer flex-col items-center justify-center gap-2 text-center disabled:cursor-not-allowed"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-[#12141c] shadow-2xs">
                    {sourceUploadProgress !== null ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#12141c]">
                      {sourceUploadProgress !== null
                        ? isEn
                          ? `Uploading ${sourceUploadProgress}%...`
                          : `上傳中 ${sourceUploadProgress}%...`
                        : isEn
                          ? "Drop Source Video (MP4 / MOV) here"
                          : "拖放或點擊上傳來源影片 (MP4 / MOV)"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {isEn
                        ? "Extracts subject identity & motion automatically"
                        : "自動擷取原片人物身分與動作軌跡"}
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* 2. Target Scene Photo Drag & Drop / Prompt Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!submitting) setSceneDragOver(true);
              }}
              onDragLeave={() => setSceneDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSceneDragOver(false);
                const file = e.dataTransfer.files?.[0];
                void handleSceneFile(file);
              }}
              className={`relative flex min-h-[180px] w-full flex-col justify-between overflow-hidden rounded-2xl border-2 border-dashed p-3 transition md:w-64 ${
                sceneDragOver
                  ? "border-[#12141c] bg-[#c6f24b]/15"
                  : sceneImageUrl
                    ? "border-zinc-200 bg-[#f4f4f5]"
                    : "border-zinc-300 bg-[#f4f4f5] hover:border-zinc-400"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-[#12141c]">
                  {isEn ? "2. Target Scene" : "2. 目標場景照"}
                </span>
                <div className="flex items-center gap-1">
                  {sceneImageUrl ? (
                    <>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => sceneInputRef.current?.click()}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 hover:border-[#12141c]"
                      >
                        {isEn ? "Replace" : "更換"}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setSceneImageUrl("")}
                        className="cursor-pointer rounded-2xl border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 hover:text-red-600"
                        aria-label="Clear scene photo"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="rounded-2xl bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-600 shadow-2xs">
                      {sceneUploadProgress !== null
                        ? `${sceneUploadProgress}%`
                        : isEn
                          ? "Photo / Prompt"
                          : "場景照 / 描述"}
                    </span>
                  )}
                </div>
              </div>

              {sceneImageUrl ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => sceneInputRef.current?.click()}
                  className="group relative my-2 h-28 w-full cursor-pointer overflow-hidden rounded-2xl border border-zinc-200 bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sceneImageUrl}
                    alt="Target scene"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || sceneUploadProgress !== null}
                  onClick={() => sceneInputRef.current?.click()}
                  className="my-2 flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 bg-white p-2 text-center text-xs text-zinc-500 hover:border-zinc-400"
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 text-zinc-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <span className="font-semibold text-[#12141c]">
                    {isEn ? "Drop or upload scene photo" : "拖放或點擊上傳場景照"}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={() => setPromptModalOpen(true)}
                className="block w-full cursor-pointer truncate text-left text-[11px] font-semibold text-zinc-500 hover:text-[#12141c]"
              >
                {scenePrompt.trim()
                  ? `${isEn ? "Mood" : "描述"}: ${scenePrompt.trim()}`
                  : isEn
                    ? "+ Or describe scene mood in Director Panel"
                    : "+ 或點此輸入文字生成場景與光線"}
              </button>
            </div>

            {/* 3. Generate Button */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void onSubmit()}
              className="director-dock-generate flex min-h-[120px] w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-[#c6f24b] px-5 py-4 font-display text-sm font-extrabold text-[#12141c] transition duration-200 hover:bg-[#b6e23a] disabled:cursor-not-allowed disabled:opacity-45 md:w-36"
            >
              {submitting ? (
                <Spinner className="h-5 w-5 text-[#12141c]" />
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 14-7-4 14-3-5-7-2z" />
                </svg>
              )}
              <span className="text-base font-extrabold tracking-tight">
                {submitting
                  ? isEn
                    ? "Starting..."
                    : "啟動中..."
                  : isEn
                    ? "Generate"
                    : "生成"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-2xl bg-[#12141c]/10 px-2.5 py-0.5 text-xs font-bold text-[#12141c]">
                <svg
                  aria-hidden="true"
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
                <span>2K</span>
              </span>
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
            >
              {error}
            </p>
          ) : null}
        </div>
      </DirectorDockStage>

      {/* Scene Mood / Text Prompt Modal */}
      {promptModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setPromptModalOpen(false)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold">
                  {isEn ? "Scene Description & Lighting Mood" : "目標場景與光線氣氛描述"}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {isEn
                    ? "Describe a new scene plate or lighting mood to relocate the subject."
                    : "輸入文字以生成全新場景底圖，或為已上傳的場景照微調光線氛圍。"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromptModalOpen(false)}
                className="cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <textarea
              rows={4}
              value={scenePrompt}
              disabled={submitting}
              onChange={(e) => setScenePrompt(e.target.value)}
              placeholder={
                isEn
                  ? "e.g. A rainy neon street in Tokyo at night with warm reflections..."
                  : "例如：下雨嘅東京霓虹街道夜景、陽光海灘日落…"
              }
              className="w-full rounded-2xl border border-accent-ink/20 bg-paper p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-accent"
            />

            <div className="flex items-center justify-end gap-2">
              {scenePrompt.trim() ? (
                <button
                  type="button"
                  onClick={() => setScenePrompt("")}
                  className="cursor-pointer rounded-2xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:text-[#12141c]"
                >
                  {isEn ? "Clear" : "清除"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPromptModalOpen(false)}
                className="cursor-pointer rounded-2xl bg-[#12141c] px-5 py-2 text-xs font-bold text-[#c6f24b] transition hover:bg-black"
              >
                {isEn ? "Done" : "完成"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Interactive Timeline Range Trim Modal */}
      {trimModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setTrimModalOpen(false)}
        >
          <div
            className="w-full max-w-xl space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold">
                  {isEn
                    ? "Select Clip Range on Timeline"
                    : "時間軸互動截取範圍設定"}
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  {isEn
                    ? "Drag the start and end handles to choose a 2s–15s segment."
                    : "拖曳時間軸起點與長度滑桿，選擇要瞬移換場的 2–15 秒片段。"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTrimModalOpen(false)}
                className="cursor-pointer rounded-2xl px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {sourceVideoUrl ? (
              <div className="overflow-hidden rounded-2xl bg-black">
                <video
                  ref={trimVideoRef}
                  src={sourceVideoUrl}
                  controls
                  playsInline
                  className="max-h-56 w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (Number.isFinite(dur) && dur > 0) {
                      setSourceDuration(Math.max(2, Math.round(dur * 10) / 10));
                    }
                    e.currentTarget.currentTime = sectionStart;
                  }}
                />
              </div>
            ) : null}

            {(() => {
              const maxDur = Math.max(sourceDuration, sectionStart + sectionLength, 15);
              const startPct = Math.min(100, (sectionStart / maxDur) * 100);
              const widthPct = Math.min(100 - startPct, (sectionLength / maxDur) * 100);
              return (
                <div className="space-y-3 rounded-2xl border border-zinc-200 bg-[#f4f4f5] p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#12141c]">
                    <span>
                      {isEn ? "Start" : "起點"}: {sectionStart.toFixed(1)}s
                    </span>
                    <span className="rounded-2xl bg-[#12141c] px-2.5 py-0.5 text-[#c6f24b]">
                      {sectionLength}s ({sectionStart.toFixed(1)}s – {(sectionStart + sectionLength).toFixed(1)}s)
                    </span>
                    <span>
                      {isEn ? "End" : "終點"}: {(sectionStart + sectionLength).toFixed(1)}s
                    </span>
                  </div>

                  <div className="relative h-8 w-full overflow-hidden rounded-2xl bg-zinc-200">
                    <div
                      className="absolute inset-y-0 rounded-2xl border-2 border-[#12141c] bg-[#c6f24b]/85 transition-all"
                      style={{
                        left: `${startPct}%`,
                        width: `${Math.max(4, widthPct)}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                        <span>{isEn ? "Start Time" : "起始位置 (Start)"}</span>
                        <span>{sectionStart.toFixed(1)}s</span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(0, maxDur - 2)}
                        step={0.5}
                        disabled={submitting}
                        value={sectionStart}
                        onChange={(e) => {
                          const nextStart = Math.max(0, Number(e.target.value));
                          setSectionStart(nextStart);
                          if (trimVideoRef.current) {
                            trimVideoRef.current.currentTime = nextStart;
                          }
                        }}
                        className="mt-1.5 w-full cursor-pointer accent-[#12141c]"
                      />
                    </label>

                    <label className="block">
                      <span className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                        <span>{isEn ? "Duration (2s–15s)" : "片段長度 (2–15秒)"}</span>
                        <span>{sectionLength}s</span>
                      </span>
                      <input
                        type="range"
                        min={2}
                        max={15}
                        step={1}
                        disabled={submitting}
                        value={sectionLength}
                        onChange={(e) => {
                          const nextLen = Math.min(15, Math.max(2, Number(e.target.value)));
                          setSectionLength(nextLen);
                          if (trimVideoRef.current) {
                            trimVideoRef.current.currentTime = sectionStart + nextLen;
                          }
                        }}
                        className="mt-1.5 w-full cursor-pointer accent-[#12141c]"
                      />
                    </label>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTrimModalOpen(false)}
                className="cursor-pointer rounded-2xl bg-[#12141c] px-5 py-2 text-xs font-bold text-[#c6f24b] transition hover:bg-black"
              >
                {isEn ? "Apply Range" : "確認範圍"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
