"use client";

import { useEffect, useState } from "react";
import type { PublicTeleportJob } from "@/model/teleport-job";
import {
  deleteTeleportJobAction,
  pollTeleportJobStatusAction,
  startTeleportJobAction,
} from "@/presentation/actions/teleport";
import {
  DirectorDockCastGroup,
  DirectorDockComposer,
  DirectorDockCurveCell,
  DirectorDockDivider,
  DirectorDockDurationCell,
  DirectorDockHero,
  DirectorDockPanel,
  DirectorDockPill,
  DirectorDockQuickTile,
  DirectorDockStage,
  DirectorDockStepperCell,
} from "@/presentation/components/app/director-dock";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { TeleportHistoryDialog } from "@/presentation/components/app/teleport/teleport-history-dialog";
import { TeleportHistoryPanel } from "@/presentation/components/app/teleport/teleport-history-panel";
import { useI18n } from "@/presentation/components/i18n-provider";

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
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [trimModalOpen, setTrimModalOpen] = useState(false);
  const [modeFocus, setModeFocus] = useState<"photo" | "prompt">("photo");

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

  const slotItems = [
    {
      index: 0,
      character: sourceVideoUrl
        ? { id: "src", name: isEn ? "Video" : "來源片" }
        : null,
    },
    {
      index: 1,
      character: sceneImageUrl
        ? { id: "scene", name: isEn ? "Scene" : "場景照", previewUrl: sceneImageUrl }
        : null,
    },
  ];

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] w-full">
      <DirectorDockStage
        topLeft={
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#12141c] px-2.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-wider text-[#c6f24b]">
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
            className="director-dock-cell inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3.5 text-xs font-bold text-[#12141c] transition hover:border-zinc-400"
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
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-700">
              {jobs.length}
            </span>
          </button>
        }
        bottomContent={
          jobs.length > 0 ? (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 text-[#12141c] shadow-xs">
              <TeleportHistoryPanel
                jobs={jobs}
                activeJobId={activeJob?.id ?? null}
                onSelectJob={setActiveJob}
                onDeleteJob={(id) => void onDeleteJob(id)}
                layout="sidebar"
              />
            </div>
          ) : null
        }
      >
        <DirectorDockHero kind="teleport" />

        {/* Collapsible 🎬 導演面板 */}
        <DirectorDockPanel>
          {/* Cell 1: Source & Scene Slots */}
          <DirectorDockCastGroup
            slots={slotItems}
            disabled={submitting}
            badgeLabel={isEn ? "Upload Media" : "上傳影片與場景"}
            onOpenPicker={() => setUploadMenuOpen(true)}
            onManageActive={() => setUploadMenuOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 2: Start Time */}
          <DirectorDockStepperCell
            thumbUrl={sceneImageUrl || "/talking-head-backgrounds/hk-seaview-office.webp"}
            label={isEn ? "Start Time" : "起始秒數"}
            value={`${clampStart(startText)}s`}
            disabled={submitting}
            onPrev={() =>
              setStartText(String(Math.max(0, clampStart(startText) - 0.5)))
            }
            onNext={() =>
              setStartText(String(clampStart(startText) + 0.5))
            }
            onClick={() => setTrimModalOpen(true)}
          />

          <DirectorDockDivider />

          {/* Cell 3: Audio & Color */}
          <DirectorDockCurveCell
            label={isEn ? "Audio & Color" : "音訊與調色"}
            value={`${keepSourceAudio ? (isEn ? "Audio ON" : "保留原聲") : isEn ? "Muted" : "靜音"} · ${applyColorFix ? "H3 Soft" : isEn ? "Raw" : "原色"}`}
            disabled={submitting}
            onPrev={() => setKeepSourceAudio((prev) => !prev)}
            onNext={() => setApplyColorFix((prev) => !prev)}
            onClick={() => setKeepSourceAudio((prev) => !prev)}
          />

          <DirectorDockDivider />

          {/* Cell 4: Clip Length */}
          <DirectorDockDurationCell
            label={isEn ? "Duration" : "截取時長"}
            value={`${clampLength(lengthText)}s`}
            disabled={submitting}
            onClick={() => setTrimModalOpen(true)}
          />
        </DirectorDockPanel>

        {/* Main Composer Box + Left Floating Mode Rail */}
        <DirectorDockComposer
          disabled={submitting}
          modeItems={[
            {
              id: "photo",
              label: isEn ? "Photo" : "實景",
              icon: (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              ),
            },
            {
              id: "prompt",
              label: isEn ? "Prompt" : "生景",
              icon: (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3v18M3 12h18" />
                </svg>
              ),
            },
          ]}
          activeModeId={modeFocus}
          onSelectMode={(next) => {
            setModeFocus(next as "photo" | "prompt");
            if (next === "photo" && !sceneImageUrl) {
              setUploadMenuOpen(true);
            }
          }}
          topMediaSlot={
            sourceVideoUrl ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-2.5 text-[#12141c]">
                <video
                  src={sourceVideoUrl}
                  controls
                  playsInline
                  className="max-h-36 rounded-lg bg-black object-contain"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 font-bold">
                    {isEn ? "Start:" : "起始:"} {clampStart(startText)}s
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 font-bold">
                    {isEn ? "Length:" : "時長:"} {clampLength(lengthText)}s
                  </span>
                  <button
                    type="button"
                    onClick={() => setTrimModalOpen(true)}
                    className="cursor-pointer rounded-full border border-accent-ink/20 px-3 py-1 font-bold hover:border-accent-ink"
                  >
                    {isEn ? "Adjust Trim" : "調整秒數"}
                  </button>
                </div>
              </div>
            ) : null
          }
          promptValue={scenePrompt}
          onPromptChange={(val) => {
            setScenePrompt(val);
            if (error) setError("");
          }}
          promptPlaceholder={
            isEn
              ? "Describe the new scene or lighting mood (e.g. A rainy neon street in Tokyo at night)..."
              : "描述你想瞬移過去的場景與光線氣氛（例如：下雨嘅東京霓虹街道夜景、陽光海灘日落；若有上傳場景照可留空）..."
          }
          plusMenuOpen={uploadMenuOpen}
          onPlusToggle={() => setUploadMenuOpen((prev) => !prev)}
          plusMenuSlot={
            <div className="space-y-3 text-[#12141c]">
              <div className="space-y-2 rounded-xl bg-white p-3">
                <p className="text-xs font-bold">
                  {isEn ? "1. Source Video (MP4/MOV)" : "1. 上傳來源影片 (MP4/MOV)"}
                </p>
                <BrandUploadButton
                  label={
                    sourceVideoUrl
                      ? isEn
                        ? "Replace Video"
                        : "更換來源影片"
                      : isEn
                        ? "Upload MP4 / MOV"
                        : "上傳來源影片"
                  }
                  accept="video/mp4,video/quicktime"
                  disabled={submitting}
                  onUploaded={(asset) => {
                    if (asset.kind === "video") {
                      setSourceVideoUrl(asset.url);
                      setError("");
                      setUploadMenuOpen(false);
                    }
                  }}
                  onProgress={setSourceUploadProgress}
                  onError={setError}
                />
              </div>

              <div className="space-y-2 rounded-xl bg-white p-3">
                <p className="text-xs font-bold">
                  {isEn
                    ? "2. Target Scene Photo (Optional)"
                    : "2. 上傳目標場景照（選填）"}
                </p>
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
                      setUploadMenuOpen(false);
                    }
                  }}
                  onError={setError}
                />
              </div>
            </div>
          }
          pills={
            <>
              <DirectorDockPill
                accentBadge={<span>✦</span>}
                label="Teleport H3 2K"
                hasChevron
                disabled={submitting}
                onClick={() => setTrimModalOpen(true)}
              />

              <DirectorDockPill
                icon={
                  <span className="inline-block h-3 w-2 rounded-[2px] border border-current" />
                }
                label="9:16"
                disabled={submitting}
              />

              <DirectorDockPill
                label={
                  keepSourceAudio
                    ? isEn
                      ? "Audio: ON"
                      : "保留原聲: 開"
                    : isEn
                      ? "Audio: OFF"
                      : "保留原聲: 關"
                }
                disabled={submitting}
                onClick={() => setKeepSourceAudio((prev) => !prev)}
              />

              <DirectorDockPill
                label={
                  applyColorFix
                    ? isEn
                      ? "Color Fix: ON"
                      : "自動調色: 開"
                    : isEn
                      ? "Color Fix: OFF"
                      : "自動調色: 關"
                }
                disabled={submitting}
                onClick={() => setApplyColorFix((prev) => !prev)}
              />
            </>
          }
          rightSlot1={
            <DirectorDockQuickTile
              label={isEn ? "Source" : "來源影片"}
              badge={
                sourceUploadProgress !== null
                  ? `${Math.round(sourceUploadProgress)}%`
                  : isEn
                    ? "Req"
                    : "必選"
              }
              videoUrl={sourceVideoUrl || undefined}
              disabled={submitting}
              onClick={() => setUploadMenuOpen(true)}
              onClear={
                sourceVideoUrl ? () => setSourceVideoUrl("") : undefined
              }
            />
          }
          rightSlot2={
            <DirectorDockQuickTile
              label={isEn ? "Scene" : "場景照"}
              badge={isEn ? "Opt" : "可選"}
              thumbUrl={sceneImageUrl || undefined}
              disabled={submitting}
              onClick={() => setUploadMenuOpen(true)}
              onClear={sceneImageUrl ? () => setSceneImageUrl("") : undefined}
            />
          }
          onGenerate={() => void onSubmit()}
          generateDisabled={!canSubmit}
          generating={submitting}
          generateLabel={
            submitting
              ? isEn
                ? "Starting..."
                : "啟動中..."
              : isEn
                ? "Generate"
                : "生成"
          }
          creditBadge="2K"
          error={error}
        />
      </DirectorDockStage>

      {/* Trim & Advanced Settings Modal */}
      {trimModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setTrimModalOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-accent-ink/15 bg-white p-6 text-[#12141c] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {isEn ? "Clip Section & Options" : "截取秒數與進階設定"}
              </h3>
              <button
                type="button"
                onClick={() => setTrimModalOpen(false)}
                className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="flex flex-wrap items-center gap-4 border-t border-accent-ink/10 pt-3">
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
