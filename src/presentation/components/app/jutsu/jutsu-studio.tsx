"use client";

import { useEffect, useState } from "react";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import {
  deleteJutsuJobAction,
  pollJutsuJobStatusAction,
  startScroSwapJobAction,
} from "@/presentation/actions/jutsu";
import { JutsuRelightPicker } from "@/presentation/components/app/jutsu/jutsu-relight-picker";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";

export function JutsuStudio({
  characters,
  initialJobs,
}: {
  characters: PublicCharacter[];
  customWardrobeItems?: PublicCustomWardrobeItem[];
  initialJobs: PublicJutsuJob[];
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";

  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sourceUploadProgress, setSourceUploadProgress] = useState<number | null>(null);
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);

  // Character / Reference Image
  const [characterId, setCharacterId] = useState<string>(
    characters[0]?.id ?? "",
  );
  const [referenceImageUrl, setReferenceImageUrl] = useState("");

  // Optional Relight
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [relightId, setRelightId] = useState("golden_halo");
  const [customLightPrompt, setCustomLightPrompt] = useState("");

  // SAM 3.1 Mannequin + Render Options
  const [maskMargin, setMaskMargin] = useState<"tight" | "normal" | "loose">("normal");
  const [hatFix, setHatFix] = useState(false);
  const [noLipSync, setNoLipSync] = useState(false);
  const [motionSize, setMotionSize] = useState<512 | 768 | 1376>(512);
  const [applyColorFixOnRender, setApplyColorFixOnRender] = useState(true);
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);

  // Jobs & Active Result
  const [jobs, setJobs] = useState<PublicJutsuJob[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<PublicJutsuJob | null>(
    initialJobs[0] ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Poll any in-flight job automatically and keep the right result panel updated.
  useEffect(() => {
    const runningIds = jobs
      .filter((item) => item.status === "rendering")
      .map((item) => item.id);
    if (runningIds.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const id of runningIds) {
        const res = await pollJutsuJobStatusAction(id);
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

  async function onGenerate() {
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await startScroSwapJobAction({
        sourceVideoUrl,
        sectionStart,
        sectionLength,
        characterId: characterId || undefined,
        referenceImageUrl: referenceImageUrl || undefined,
        relightId: relightEnabled ? relightId : undefined,
        customLightPrompt: relightEnabled ? customLightPrompt : undefined,
        maskMargin,
        hatFix,
        noLipSync,
        motionSize,
        keepSourceAudio,
        applyColorFix: applyColorFixOnRender,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setActiveJob(res.job);
      setJobs((prev) => [
        res.job,
        ...prev.filter((item) => item.id !== res.job.id),
      ]);
      notifyTasksChanged();
    } catch {
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteJob(id: string) {
    const res = await deleteJutsuJobAction(id);
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
    <div className="flex w-full max-w-none flex-col gap-6 pb-12">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/90 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
              Scro Swap
            </span>
            <h1 className="font-display text-xl font-bold">
              1. Character Motion Swap
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            {isEn
              ? "Drop a video, pick a Scro character, and click Generate. Runs in the background and delivers the swapped MP4 directly to the result panel."
              : "上傳參考影片並揀選 Scro 角色，一鍵按 Generate 即交由背景任務自動完成角色動作遷移，完成後直接喺右側播放及下載。"}
          </p>
        </div>
      </header>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_1fr]">
        {/* Left Column: Source Video + Character Selection + Generate */}
        <section className="flex flex-col gap-4 rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c]">
          {/* Source Video & Section Trimmer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold">
                {isEn ? "Source Video & Section" : "上傳來源影片與截取片段"}
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
              <div className="space-y-2.5 rounded-xl border border-accent-ink/12 bg-paper/70 p-3">
                <video
                  src={sourceVideoUrl}
                  controls
                  playsInline
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    if (!Number.isFinite(dur) || dur <= 0) return;
                    setSectionStart(0);
                    setSectionLength(Math.min(15, Math.max(2, Math.round(dur))));
                  }}
                  className="max-h-56 w-full rounded-lg bg-black object-contain"
                />
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      {isEn ? "Starts at (sec)" : "起始秒數 Starts at (s)"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      step={0.5}
                      disabled={submitting}
                      value={sectionStart}
                      onChange={(e) => setSectionStart(Math.max(0, Number(e.target.value)))}
                      className="mt-1 h-8 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
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
                      value={sectionLength}
                      onChange={(e) =>
                        setSectionLength(
                          Math.min(15, Math.max(2, Number(e.target.value))),
                        )
                      }
                      className="mt-1 h-8 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid h-32 place-items-center rounded-xl border-2 border-dashed border-accent-ink/20 bg-paper/50 p-4 text-center text-xs text-muted">
                {sourceUploadProgress != null ? (
                  <span className="inline-flex items-center gap-2 font-semibold text-accent-ink">
                    <Spinner className="h-4 w-4" />
                    {sourceUploadProgress > 0
                      ? t("video.upload.progress", { percent: sourceUploadProgress })
                      : t("video.upload.uploading")}
                  </span>
                ) : isEn ? (
                  "Upload a source MP4/MOV video (up to 50MB) to begin."
                ) : (
                  "請點擊右上角「上傳影片 (MP4/MOV)」選擇要處理嘅參考短片"
                )}
              </div>
            )}
          </div>

          {/* Character Selection */}
          <div className="space-y-4 border-t border-accent-ink/10 pt-4">
            <div>
              <p className="text-sm font-bold">
                {isEn
                  ? "Choose Scro Character (or Upload Photo)"
                  : "選擇要換入去嘅 Scro 角色（或自訂相片）"}
              </p>
              {characters.length > 0 ? (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {characters.map((char) => {
                    const active = characterId === char.id && !referenceImageUrl;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setCharacterId(char.id);
                          setReferenceImageUrl("");
                        }}
                        className={`flex cursor-pointer flex-col items-center overflow-hidden rounded-xl border p-1.5 text-center transition ${
                          active
                            ? "border-2 border-accent-ink bg-accent-ink text-paper"
                            : "border-accent-ink/15 bg-paper hover:border-accent-ink/40"
                        }`}
                      >
                        {char.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={char.previewUrl}
                            alt={char.name}
                            className="aspect-square w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="grid aspect-square w-full place-items-center rounded-lg bg-zinc-200 text-xs font-bold text-zinc-600">
                            {char.name.slice(0, 2)}
                          </div>
                        )}
                        <span className="mt-1 w-full truncate text-[11px] font-bold">
                          {char.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent-ink/12 bg-paper/60 px-3 py-2">
                <span className="text-xs font-semibold text-muted">
                  {referenceImageUrl
                    ? isEn
                      ? "Using custom uploaded character photo"
                      : "已選用自訂上傳角色相片"
                    : isEn
                      ? "Or upload any character photo:"
                      : "或直接上傳任何人物參考相片："}
                </span>
                <div className="flex items-center gap-2">
                  <BrandUploadButton
                    label={isEn ? "Upload Photo" : "上傳相片"}
                    accept="image/png,image/jpeg,image/webp"
                    disabled={submitting}
                    onUploaded={(asset) => {
                      if (asset.kind === "image") {
                        setReferenceImageUrl(asset.url);
                      }
                    }}
                    onError={setError}
                  />
                  {referenceImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setReferenceImageUrl("")}
                      className="cursor-pointer text-xs font-semibold text-red-600"
                    >
                      {isEn ? "Clear" : "清除"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <JutsuRelightPicker
              enabled={relightEnabled}
              onEnabledChange={setRelightEnabled}
              selectedId={relightId}
              onSelectId={setRelightId}
              customPrompt={customLightPrompt}
              onCustomPromptChange={setCustomLightPrompt}
              disabled={submitting}
            />

            {/* Motion & Output Settings */}
            <div className="space-y-3 rounded-2xl border border-accent-ink/12 bg-paper/75 p-4">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="text-[11px] font-semibold text-muted">
                    {isEn ? "Mask Margin" : "遮罩邊距 Mask Margin"}
                  </span>
                  <select
                    value={maskMargin}
                    disabled={submitting}
                    onChange={(e) =>
                      setMaskMargin(e.target.value as "tight" | "normal" | "loose")
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                  >
                    <option value="tight">Tight (20 px)</option>
                    <option value="normal">Normal (40 px)</option>
                    <option value="loose">Loose (60 px)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-semibold text-muted">
                    {isEn ? "Motion Resolution" : "動作參考解析度"}
                  </span>
                  <select
                    value={motionSize}
                    disabled={submitting}
                    onChange={(e) =>
                      setMotionSize(Number(e.target.value) as 512 | 768 | 1376)
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                  >
                    <option value={512}>512 px (Default)</option>
                    <option value={768}>768 px (High Precision)</option>
                    <option value={1376}>1376 px (Max Detail)</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={hatFix}
                    disabled={submitting}
                    onChange={(e) => setHatFix(e.target.checked)}
                    className="h-4 w-4 rounded accent-accent-ink"
                  />
                  <span>{isEn ? "Hat fix" : "帽子修復 Hat Fix"}</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={noLipSync}
                    disabled={submitting}
                    onChange={(e) => setNoLipSync(e.target.checked)}
                    className="h-4 w-4 rounded accent-accent-ink"
                  />
                  <span>{isEn ? "No lip-sync" : "關閉對嘴 No Lip-Sync"}</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={keepSourceAudio}
                    disabled={submitting}
                    onChange={(e) => setKeepSourceAudio(e.target.checked)}
                    className="h-4 w-4 rounded accent-accent-ink"
                  />
                  <span>{isEn ? "Keep source audio" : "保留原片音軌"}</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={applyColorFixOnRender}
                    disabled={submitting}
                    onChange={(e) => setApplyColorFixOnRender(e.target.checked)}
                    className="h-4 w-4 rounded accent-accent-ink"
                  />
                  <span>{isEn ? "H3 Soft Color Fix" : "套用 H3 Soft 調色"}</span>
                </label>
              </div>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!sourceVideoUrl || submitting}
            onClick={() => void onGenerate()}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
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
        </section>

        {/* Right Column: Direct Result & Background Task History */}
        <section className="flex flex-col gap-5">
          {activeJob ? (
            <div className="rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 pb-3">
                <div>
                  <span className="rounded-full bg-lime/40 px-2.5 py-0.5 text-[11px] font-bold text-accent-ink">
                    1. Character Motion Swap
                    {activeJob.characterName ? ` · ${activeJob.characterName}` : ""}
                  </span>
                  <h2 className="mt-1 font-display text-lg font-bold">
                    {activeJob.status === "completed"
                      ? isEn
                        ? "Swap Result Ready"
                        : "Scro Swap 成片已完成"
                      : activeJob.status === "failed"
                        ? isEn
                          ? "Swap Failed"
                          : "Scro Swap 失敗"
                        : isEn
                          ? "Running in Background…"
                          : "背景生成中（可離開此頁，完成後自動更新）…"}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-muted">
                  {activeJob.sectionLength}s · {activeJob.aspectRatio}
                </span>
              </div>

              {activeJob.status === "completed" && activeJob.outputVideoUrl ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-accent-ink/15 bg-zinc-950 p-4 text-white">
                  <video
                    src={activeJob.outputVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="max-h-[28rem] w-full rounded-xl object-contain"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-white/75">
                      {isEn
                        ? "Swapped MP4 with synchronized audio"
                        : "已完成角色動作遷移並同步原片音軌"}
                    </span>
                    <a
                      href={activeJob.outputVideoUrl}
                      download={`scro-swap-${activeJob.id}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-full bg-lime px-4 text-xs font-bold text-accent-ink"
                    >
                      {isEn ? "Download MP4" : "下載 MP4 影片"}
                    </a>
                  </div>
                </div>
              ) : activeJob.status === "failed" ? (
                <div className="mt-4 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-600">
                  {activeJob.error || (isEn ? "Generation failed." : "生成失敗，請重試")}
                </div>
              ) : (
                <div className="mt-4 grid min-h-[18rem] place-items-center rounded-2xl border border-accent-ink/12 bg-paper/70 p-6 text-center">
                  <div className="max-w-md space-y-3">
                    <Spinner className="mx-auto h-7 w-7 text-accent-ink" />
                    <p className="font-display text-sm font-bold text-foreground">
                      {activeJob.preparedStartFrameUrl
                        ? isEn
                          ? "Keyframes & motion ready — rendering final video…"
                          : "已完成角色畫格與動作追蹤，正在渲染最終影片…"
                        : isEn
                          ? "Preparing character frame & tracking motion in background…"
                          : "正在背景準備角色畫格與追蹤原片動作…"}
                    </p>
                    <p className="text-xs text-muted">
                      {isEn
                        ? "This task is also tracked in the top background task bar. You can keep working and come back when it finishes."
                        : "此任務已加入頂部背景任務列，你可以自由切換頁面，完成後會自動顯示成片。"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid min-h-[22rem] place-items-center rounded-2xl border border-dashed border-accent-ink/20 bg-paper/60 p-8 text-center">
              <div className="max-w-md space-y-2">
                <p className="font-display text-base font-bold text-foreground">
                  {isEn
                    ? "Ready to run Scro Swap"
                    : "準備好開始 Scro Swap"}
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  {isEn
                    ? "Upload a reference video on the left, select a Scro character, and click Generate to get the result directly."
                    : "喺左側上傳一段參考影片並揀選 Scro 角色，按「Generate 立即生成」即可直接產出結果。"}
                </p>
              </div>
            </div>
          )}

          {/* Recent Swap Runs */}
          {jobs.length > 0 ? (
            <div className="rounded-2xl border border-accent-ink/12 bg-paper/90 p-5">
              <h3 className="font-display text-base font-bold">
                {isEn
                  ? `Recent Scro Swap Runs (${jobs.length})`
                  : `最近 Scro Swap 紀錄（${jobs.length}）`}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => {
                  const selected = activeJob?.id === job.id;
                  const thumb =
                    job.preparedStartFrameUrl || job.rawStartFrameUrl || job.referenceImageUrl;
                  return (
                    <div
                      key={job.id}
                      onClick={() => setActiveJob(job)}
                      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${
                        selected
                          ? "border-accent-ink bg-white shadow-xs"
                          : "border-accent-ink/12 bg-paper hover:border-accent-ink/35"
                      }`}
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] font-bold text-lime">
                            MP4
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-foreground">
                          {job.characterName || (isEn ? "Character Motion Swap" : "角色動作遷移")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {job.status === "completed"
                            ? isEn
                              ? "✓ Completed"
                              : "✓ 已完成影片"
                            : job.status === "rendering"
                              ? isEn
                                ? "⏳ Generating in background…"
                                : "⏳ 背景生成中…"
                              : job.status === "failed"
                                ? isEn
                                  ? "✕ Failed"
                                  : "✕ 失敗"
                                : isEn
                                  ? "Prepared"
                                  : "已準備"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          void onDeleteJob(job.id);
                        }}
                        className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-xs text-muted hover:bg-red-50 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
