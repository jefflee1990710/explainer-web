"use client";

import { useEffect, useState } from "react";
import type { PublicCustomWardrobeItem } from "@/model/custom-wardrobe-item";
import type {
  JutsuColorSettings,
  JutsuMode,
  JutsuObjectEditMode,
  JutsuPlacementBox,
  PublicJutsuJob,
} from "@/model/jutsu-job";
import { JUTSU_MODES, JUTSU_OBJECT_EDIT_MODES } from "@/model/jutsu-job";
import {
  deleteJutsuJobAction,
  pollJutsuJobStatusAction,
  prepareJutsuJobAction,
  renderJutsuVideoAction,
} from "@/presentation/actions/jutsu";
import { JutsuColorPanel } from "@/presentation/components/app/jutsu/jutsu-color-panel";
import { JutsuPlacementBoxEditor } from "@/presentation/components/app/jutsu/jutsu-placement-box-editor";
import { JutsuRelightPicker } from "@/presentation/components/app/jutsu/jutsu-relight-picker";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicCharacter } from "@/presentation/serialize";
import { DEFAULT_JUTSU_COLOR_SETTINGS } from "@/service/jutsu/color-settings";

const MODE_LABELS: Record<
  JutsuMode,
  { titleZh: string; titleEn: string; descZh: string; descEn: string }
> = {
  character_swap: {
    titleZh: "1. 影片角色動作遷移 (Character Swap)",
    titleEn: "1. Character Motion Swap",
    descZh: "上傳一段參考影片 + 選擇 Scro 角色（或相片），自動複製原片姿勢、動作與音軌，支援 17 款重新打光。",
    descEn: "Drop a video and choose a Scro character to transfer motion, pose, and soundtrack with optional 17-look relighting.",
  },
  object_swap: {
    titleZh: "2. 局部換衫 / 換物 / 換背景 (Object Swap)",
    titleEn: "2. Object & Wardrobe Swap",
    descZh: "替換影片內嘅服裝、髮型、手持道具（Change）、移除雜物（Remove）、換背景（Background）或框選位置新增物件（Add）。",
    descEn: "Change outfits/hair/props, remove objects, swap backgrounds, or draw a box to add new items.",
  },
  relight_video: {
    titleZh: "3. 原片電影級打光 (Relight Video)",
    titleEn: "3. Relight Video's Person",
    descZh: "保留原片人物、表情與構圖，直接套用 17 款電影打光（如 Golden halo、Venetian blinds、Phone glow）。",
    descEn: "Keep the video's own person, pose, and setting while relighting with 17 cinematic lighting looks.",
  },
  color_fix: {
    titleZh: "4. H3 畫質柔化與調色 (Fix Colours)",
    titleEn: "4. Post-Processing: Fix Colours",
    descZh: "使用 Image Detail Contrast (-0.20) + Orion4D H3 Soft Tone Mapper 消除 AI 影片過份銳利生硬感。",
    descEn: "Soften crunchy fine AI detail (-0.20) and apply Orion4D's H3 Soft Reinhard tone mapper in seconds.",
  },
};

const OBJECT_MODE_LABELS: Record<
  JutsuObjectEditMode,
  { zh: string; en: string }
> = {
  change: { zh: "替換單品 / 衣服 (Change)", en: "Change" },
  remove: { zh: "移除物件 (Remove)", en: "Remove" },
  background: { zh: "更換背景 (Background)", en: "Background" },
  add: { zh: "框選新增物件 (Add)", en: "Add Object" },
};

export function JutsuStudio({
  characters,
  customWardrobeItems,
  initialJobs,
}: {
  characters: PublicCharacter[];
  customWardrobeItems: PublicCustomWardrobeItem[];
  initialJobs: PublicJutsuJob[];
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [mode, setMode] = useState<JutsuMode>("character_swap");
  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);

  // Character / Reference Image
  const [characterId, setCharacterId] = useState<string>(
    characters[0]?.id ?? "",
  );
  const [referenceImageUrl, setReferenceImageUrl] = useState("");

  // Relight
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [relightId, setRelightId] = useState("golden_halo");
  const [customLightPrompt, setCustomLightPrompt] = useState("");

  // Object Swap & SAM 3.1 Mannequin Tracking settings
  const [objectEditMode, setObjectEditMode] =
    useState<JutsuObjectEditMode>("change");
  const [objectTarget, setObjectTarget] = useState("person");
  const [objectChangeTo, setObjectChangeTo] = useState("");
  const [placementBox, setPlacementBox] = useState<
    JutsuPlacementBox | undefined
  >(undefined);
  const [maskMargin, setMaskMargin] = useState<"tight" | "normal" | "loose">("normal");
  const [hatFix, setHatFix] = useState(false);
  const [noLipSync, setNoLipSync] = useState(false);
  const [motionSize, setMotionSize] = useState<512 | 768 | 1376>(512);

  // Color Fix
  const [colorSettings, setColorSettings] = useState<JutsuColorSettings>(
    DEFAULT_JUTSU_COLOR_SETTINGS,
  );

  // Active Prepared / Rendering Job & History
  const [jobs, setJobs] = useState<PublicJutsuJob[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<PublicJutsuJob | null>(
    initialJobs[0] ?? null,
  );
  const [motionDraft, setMotionDraft] = useState(
    initialJobs[0]?.motionDescription ?? "",
  );
  const [applyColorFixOnRender, setApplyColorFixOnRender] = useState(true);
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);

  const [preparing, setPreparing] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");

  // Poll rendering job automatically
  useEffect(() => {
    if (!activeJob || activeJob.status !== "rendering") return;
    const timer = window.setInterval(async () => {
      const res = await pollJutsuJobStatusAction(activeJob.id);
      if (res.ok) {
        setActiveJob(res.job);
        setJobs((prev) =>
          prev.map((item) => (item.id === res.job.id ? res.job : item)),
        );
      }
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activeJob]);

  async function onPrepare() {
    if (preparing || rendering) return;
    setError("");
    setPreparing(true);
    try {
      const res = await prepareJutsuJobAction({
        mode,
        sourceVideoUrl,
        sectionStart,
        sectionLength,
        characterId: mode === "character_swap" ? characterId || undefined : undefined,
        referenceImageUrl: referenceImageUrl || undefined,
        relightId:
          mode === "relight_video" || relightEnabled ? relightId : undefined,
        customLightPrompt:
          mode === "relight_video" || relightEnabled
            ? customLightPrompt
            : undefined,
        objectEditMode: mode === "object_swap" ? objectEditMode : undefined,
        objectTarget:
          mode === "object_swap" || mode === "character_swap"
            ? objectTarget
            : undefined,
        objectChangeTo: mode === "object_swap" ? objectChangeTo : undefined,
        placementBox:
          mode === "object_swap" && objectEditMode === "add"
            ? placementBox
            : undefined,
        maskMargin,
        hatFix,
        noLipSync,
        motionSize,
        colorSettings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setActiveJob(res.job);
      setMotionDraft(res.job.motionDescription ?? "");
      setJobs((prev) => [
        res.job,
        ...prev.filter((item) => item.id !== res.job.id),
      ]);
    } catch {
      setError(isEn ? "Failed to prepare Jutsu preview." : "準備預覽失敗，請重試");
    } finally {
      setPreparing(false);
    }
  }

  async function onRenderVideo() {
    if (!activeJob || rendering || preparing) return;
    setError("");
    setRendering(true);
    try {
      const res = await renderJutsuVideoAction({
        jobId: activeJob.id,
        motionDescription: motionDraft,
        applyColorFix: applyColorFixOnRender,
        keepSourceAudio,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setActiveJob(res.job);
      setJobs((prev) =>
        prev.map((item) => (item.id === res.job.id ? res.job : item)),
      );
    } catch {
      setError(isEn ? "Failed to render Jutsu video." : "渲染影片失敗，請重試");
    } finally {
      setRendering(false);
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
    }
  }

  const busy = preparing || rendering;

  return (
    <div className="flex w-full max-w-none flex-col gap-6 pb-12">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-ink/10 bg-paper/90 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
              Scro Jutsu Studio
            </span>
            <h1 className="font-display text-xl font-bold">
              {isEn
                ? "AI Video Character, Wardrobe & Relight Transfer"
                : "AI 影片角色遷移、換衫換物、17 款電影打光與 H3 調色工作台"}
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted">
            {isEn
              ? "Native OpenRouter Seedream 5.0 Pro + MiniMax Hailuo-3 + Two-Pass VLM Motion Describer + H3 Soft Tone Mapper."
              : "整合 Openjutsu 全部核心工作流：上傳參考影片 + 選擇 Scro 角色或衣櫥單品，經兩階段 VLM 動作分析、Seedream 5.0 Pro 首尾幀預備與 Hailuo-3 渲染。"}
          </p>
        </div>
      </header>

      {/* 4 Mode Tabs */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {JUTSU_MODES.map((m) => {
          const active = mode === m;
          const info = MODE_LABELS[m];
          return (
            <button
              key={m}
              type="button"
              disabled={busy}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-2 border-accent-ink bg-accent-ink text-paper shadow-[4px_4px_0_0_rgba(18,20,28,0.18)]"
                  : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
              }`}
            >
              <p className="font-display text-sm font-bold">
                {isEn ? info.titleEn : info.titleZh}
              </p>
              <p
                className={`mt-1 line-clamp-2 text-xs leading-relaxed ${
                  active ? "text-paper/80" : "text-muted"
                }`}
              >
                {isEn ? info.descEn : info.descZh}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[28rem_1fr]">
        {/* Left Column: Source Video + Mode Settings */}
        <section className="flex flex-col gap-4 rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c]">
          {/* Step 1: Source Video & Section Trimmer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold">
                {isEn ? "Step 1 · Source Video & Section" : "Step 1 · 上傳來源影片與截取片段"}
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
                disabled={busy}
                onUploaded={(asset) => {
                  if (asset.kind === "video") {
                    setSourceVideoUrl(asset.url);
                    setError("");
                  }
                }}
                onError={setError}
              />
            </div>

            {sourceVideoUrl ? (
              <div className="space-y-2.5 rounded-xl border border-accent-ink/12 bg-paper/70 p-3">
                <video
                  src={sourceVideoUrl}
                  controls
                  playsInline
                  className="max-h-56 w-full rounded-lg bg-black object-contain"
                />
                {mode !== "color_fix" ? (
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
                        disabled={busy}
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
                        disabled={busy}
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
                ) : null}
              </div>
            ) : (
              <div className="grid h-32 place-items-center rounded-xl border-2 border-dashed border-accent-ink/20 bg-paper/50 p-4 text-center text-xs text-muted">
                {isEn
                  ? "Upload a source MP4/MOV video (up to 50MB) to begin."
                  : "請點擊右上角「上傳影片 (MP4/MOV)」選擇要處理嘅參考短片"}
              </div>
            )}
          </div>

          {/* Mode-Specific Controls */}
          {mode === "character_swap" ? (
            <div className="space-y-4 border-t border-accent-ink/10 pt-4">
              <div>
                <p className="text-sm font-bold">
                  {isEn
                    ? "Step 2 · Choose Scro Character (or Upload Photo)"
                    : "Step 2 · 選擇要換入去嘅 Scro 角色（或自訂相片）"}
                </p>
                {characters.length > 0 ? (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {characters.map((char) => {
                      const active = characterId === char.id && !referenceImageUrl;
                      return (
                        <button
                          key={char.id}
                          type="button"
                          disabled={busy}
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
                      disabled={busy}
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
                disabled={busy}
              />

              {/* SAM 3.1 + MiniMax H3 ref2va Motion Tracking Settings */}
              <div className="space-y-3 rounded-2xl border border-accent-ink/12 bg-paper/75 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent-ink">
                    {isEn
                      ? "SAM 3.1 + MiniMax H3 ref2va Motion Reference"
                      : "SAM 3.1 遮罩追蹤 + MiniMax H3 ref2va 灰階假人動作引導"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {isEn
                      ? "Generates a 24fps grey mannequin silhouette + cyan/orange edit mask for 1:1 motion transfer."
                      : "自動追蹤主體並生成 24fps 灰階假人（Grey Mannequin）+ 編輯遮罩（Check Mask），交由 MiniMax H3 ref2va 逐幀跟隨動作。"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-muted">
                      {isEn ? "Mask Margin (SAM Grow)" : "遮罩邊距 Mask Margin"}
                    </span>
                    <select
                      value={maskMargin}
                      disabled={busy}
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
                      {isEn ? "Mannequin Resolution" : "動作參考解析度 Motion Size"}
                    </span>
                    <select
                      value={motionSize}
                      disabled={busy}
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
                      disabled={busy}
                      onChange={(e) => setHatFix(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>{isEn ? "Hat fix (also mask hats)" : "帽子修復 Hat Fix（連同帽子一併追蹤替換）"}</span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={noLipSync}
                      disabled={busy}
                      onChange={(e) => setNoLipSync(e.target.checked)}
                      className="h-4 w-4 rounded accent-accent-ink"
                    />
                    <span>{isEn ? "No lip-sync (BGM only)" : "關閉對嘴 No Lip-Sync（適合純跳舞／BGM）"}</span>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          {mode === "object_swap" ? (
            <div className="space-y-4 border-t border-accent-ink/10 pt-4">
              <div>
                <span className="text-xs font-bold text-muted">
                  {isEn ? "Edit Mode" : "局部編輯模式"}
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {JUTSU_OBJECT_EDIT_MODES.map((em) => (
                    <button
                      key={em}
                      type="button"
                      disabled={busy}
                      onClick={() => setObjectEditMode(em)}
                      className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        objectEditMode === em
                          ? "border-accent-ink bg-accent-ink text-lime"
                          : "border-accent-ink/15 bg-paper text-foreground hover:border-accent-ink/40"
                      }`}
                    >
                      {isEn ? OBJECT_MODE_LABELS[em].en : OBJECT_MODE_LABELS[em].zh}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-bold text-foreground">
                  {objectEditMode === "background"
                    ? isEn
                      ? "What stays untouched (default: person)"
                      : "保留唔變嘅主體（預設：person）"
                    : objectEditMode === "add"
                      ? isEn
                        ? "Where does it go? (e.g. on the table)"
                        : "放置喺邊個位置？（例如：on the table / 喺張枱上面）"
                      : isEn
                        ? "What to track & replace (e.g. hair, top, jacket, sunglasses)"
                        : "要追蹤及替換嘅部位（例如：hair, top, jacket, sunglasses）"}
                </span>
                <input
                  type="text"
                  value={objectTarget}
                  disabled={busy}
                  onChange={(e) => setObjectTarget(e.target.value)}
                  placeholder="hair, top, jacket"
                  className="mt-1 h-9 w-full rounded-xl border border-accent-ink/20 bg-paper px-3 text-xs font-semibold"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-foreground">
                  {objectEditMode === "remove"
                    ? isEn
                      ? "What shows behind it instead? (optional)"
                      : "移除後露出咩背景？（選填，例如：a plain wall）"
                    : objectEditMode === "add"
                      ? isEn
                        ? "What object to add? (e.g. a chocolate cake on a plate)"
                        : "要新增咩物件？（例如：a chocolate cake on a plate）"
                      : isEn
                        ? "Describe the new outfit / object / background"
                        : "描述新服裝／新物件／新背景細節"}
                </span>
                <input
                  type="text"
                  value={objectChangeTo}
                  disabled={busy}
                  onChange={(e) => setObjectChangeTo(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. a cropped ivory bouclé tweed jacket"
                      : "例如：法式粗花呢短外套 / 黑色皮褸 / 東京街頭夜景"
                  }
                  className="mt-1 h-9 w-full rounded-xl border border-accent-ink/20 bg-paper px-3 text-xs font-semibold"
                />
              </label>

              {objectEditMode === "add" ? (
                <JutsuPlacementBoxEditor
                  videoUrl={sourceVideoUrl}
                  box={placementBox}
                  onChange={setPlacementBox}
                  disabled={busy}
                />
              ) : null}

              {objectEditMode !== "remove" ? (
                <div className="space-y-2 rounded-xl border border-accent-ink/12 bg-paper/70 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold">
                      {isEn
                        ? "Reference Outfit / Object Picture (Optional)"
                        : "參考服裝／單品圖片（可選自訂衣櫥或上傳圖片）"}
                    </span>
                    <BrandUploadButton
                      label={isEn ? "Upload Ref Image" : "上傳參考圖"}
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy}
                      onUploaded={(asset) => {
                        if (asset.kind === "image") setReferenceImageUrl(asset.url);
                      }}
                      onError={setError}
                    />
                  </div>

                  {customWardrobeItems.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {customWardrobeItems.slice(0, 12).map((item) => {
                        const selected = referenceImageUrl === item.previewImageUrl;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setReferenceImageUrl(item.previewImageUrl);
                              setObjectTarget(item.part);
                              setObjectChangeTo(
                                item.prompt.replace(
                                  /\s*Isolated wardrobe piece [\w-]+\.?/g,
                                  "",
                                ),
                              );
                            }}
                            className={`w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border p-1 text-center ${
                              selected
                                ? "border-2 border-accent-ink bg-accent-ink text-paper"
                                : "border-accent-ink/15 bg-white"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.previewImageUrl}
                              alt={item.nameZh || item.name}
                              className="aspect-square w-full rounded object-cover"
                            />
                            <span className="mt-0.5 block truncate text-[10px] font-bold">
                              {item.nameZh || item.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === "relight_video" ? (
            <div className="border-t border-accent-ink/10 pt-4">
              <JutsuRelightPicker
                enabled={true}
                alwaysOn
                selectedId={relightId}
                onSelectId={setRelightId}
                customPrompt={customLightPrompt}
                onCustomPromptChange={setCustomLightPrompt}
                disabled={busy}
              />
            </div>
          ) : null}

          {mode === "color_fix" ? (
            <div className="border-t border-accent-ink/10 pt-4">
              <JutsuColorPanel
                value={colorSettings}
                onChange={setColorSettings}
                disabled={busy}
              />
            </div>
          ) : null}

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
            disabled={!sourceVideoUrl || busy}
            onClick={() => void onPrepare()}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-white shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preparing ? <Spinner className="h-4 w-4" /> : null}
            <span>
              {preparing
                ? mode === "color_fix"
                  ? isEn
                    ? "Grading video with H3 Soft…"
                    : "正在套用 H3 Soft 調色…"
                  : isEn
                    ? "Preparing keyframes & analyzing motion…"
                    : "正在生成預覽畫格並分析原片動作…"
                : mode === "color_fix"
                  ? isEn
                    ? "Run H3 Soft Color Fix Now"
                    : "立即執行 H3 柔化調色"
                  : isEn
                    ? "Generate Preview Image & Motion Plan"
                    : "Step 1 · 生成預覽圖片與動作描述"}
            </span>
          </button>
        </section>

        {/* Right Column: Prepared Preview -> Review & Render Video -> Output History */}
        <section className="flex flex-col gap-5">
          {activeJob ? (
            <div className="rounded-2xl border-2 border-accent-ink bg-white p-5 shadow-[4px_4px_0_0_#12141c]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-accent-ink/10 pb-3">
                <div>
                  <span className="rounded-full bg-lime/40 px-2.5 py-0.5 text-[11px] font-bold text-accent-ink">
                    {MODE_LABELS[activeJob.mode]?.titleZh}
                  </span>
                  <h2 className="mt-1 font-display text-lg font-bold">
                    {activeJob.status === "completed"
                      ? isEn
                        ? "Finished Jutsu Video"
                        : "已完成 Jutsu 影片"
                      : activeJob.status === "rendering"
                        ? isEn
                          ? "Rendering Video on OpenRouter Hailuo-3…"
                          : "正在透過 OpenRouter Hailuo-3 渲染影片…"
                        : isEn
                          ? "Review Prepared Keyframes & Render Video"
                          : "Step 2 · 確認預備畫格與動作描述，開始渲染影片"}
                  </h2>
                </div>
                <span className="text-xs font-semibold text-muted">
                  {activeJob.sectionLength}s · {activeJob.aspectRatio}
                </span>
              </div>

              {/* Output Video Player when Completed */}
              {activeJob.outputVideoUrl ? (
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
                        ? "H3 Soft color-graded MP4 with synchronized audio"
                        : "已套用 H3 Soft 柔化調色並同步原片音軌"}
                    </span>
                    <a
                      href={activeJob.outputVideoUrl}
                      download={`scro-jutsu-${activeJob.id}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center rounded-full bg-lime px-4 text-xs font-bold text-accent-ink"
                    >
                      {isEn ? "Download MP4" : "下載 MP4 影片"}
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Raw vs Prepared Keyframe Comparison */}
              {activeJob.preparedStartFrameUrl ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-accent-ink/12 bg-paper/60 p-3">
                      <p className="mb-2 text-xs font-bold text-muted">
                        {isEn
                          ? "Raw Source Start Frame"
                          : "原片起點畫格 (Raw Start Frame)"}
                      </p>
                      {activeJob.rawStartFrameUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={activeJob.rawStartFrameUrl}
                          alt="Raw frame"
                          className="max-h-72 w-full rounded-lg object-contain"
                        />
                      ) : null}
                    </div>

                    <div className="rounded-xl border-2 border-accent-ink bg-paper p-3">
                      <p className="mb-2 text-xs font-bold text-accent-ink">
                        {isEn
                          ? "Prepared Jutsu Frame (Seedream 5.0 Pro)"
                          : "Jutsu 預備後畫格（已遷移姿勢／造型／打光）"}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeJob.preparedStartFrameUrl}
                        alt="Prepared frame"
                        className="max-h-72 w-full rounded-lg object-contain"
                      />
                    </div>
                  </div>

                  {/* SAM 3.1 Check Mask | Grey Mannequin Motion Reference Preview */}
                  {activeJob.checkMaskVideoUrl || activeJob.mannequinVideoUrl ? (
                    <div className="rounded-xl border border-accent-ink/15 bg-zinc-950 p-3.5 text-white">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-lime">
                            {isEn
                              ? "SAM 3.1 Check Mask (Cyan = Regenerated, Orange = Tracked) | H3 Grey Mannequin Motion Reference"
                              : "SAM 3.1 遮罩預覽（青色＝重繪範圍、橙色＝追蹤主體）｜右側：H3 ref2va 灰階假人動作參考"}
                          </p>
                          <p className="text-[11px] text-white/65">
                            {isEn
                              ? "MiniMax H3 ref2va follows the grey mannequin on the right frame-by-frame."
                              : "MiniMax H3 ref2va 渲染時會逐幀跟隨右側灰階假人嘅肢體動作與位置。"}
                          </p>
                        </div>
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white/85">
                          Margin: {activeJob.maskMargin ?? "normal"} · {activeJob.motionSize ?? 512}px
                        </span>
                      </div>
                      <video
                        src={activeJob.checkMaskVideoUrl || activeJob.mannequinVideoUrl}
                        controls
                        loop
                        muted
                        playsInline
                        className="max-h-60 w-full rounded-lg bg-black object-contain"
                      />
                    </div>
                  ) : null}

                  {/* Two-Pass VLM Video Motion Description Box */}
                  <div className="rounded-xl border border-accent-ink/15 bg-paper/80 p-4">
                    <label className="block text-xs font-bold text-foreground">
                      {isEn
                        ? "Two-Pass VLM Video Motion Description (Editable before Render)"
                        : "兩階段 AI 動作與表情描述（由 VLM 觀看原片自動生成，渲染前可自由微調）"}
                    </label>
                    <textarea
                      rows={3}
                      value={motionDraft}
                      disabled={busy || activeJob.status === "rendering"}
                      onChange={(e) => setMotionDraft(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-accent-ink/20 bg-white p-3 text-xs leading-5 focus-visible:outline-2 focus-visible:outline-accent"
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={keepSourceAudio}
                            onChange={(e) => setKeepSourceAudio(e.target.checked)}
                            className="h-4 w-4 rounded accent-accent-ink"
                          />
                          <span>
                            {isEn
                              ? "Keep source soundtrack"
                              : "保留原片音軌 / BGM"}
                          </span>
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                          <input
                            type="checkbox"
                            checked={applyColorFixOnRender}
                            onChange={(e) =>
                              setApplyColorFixOnRender(e.target.checked)
                            }
                            className="h-4 w-4 rounded accent-accent-ink"
                          />
                          <span>
                            {isEn
                              ? "Apply H3 Soft Color Fix (-0.20 detail + Reinhard)"
                              : "自動套用 H3 Soft 柔化調色"}
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={busy || activeJob.status === "rendering"}
                        onClick={() => void onRenderVideo()}
                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-accent-ink px-5 text-xs font-bold text-lime shadow-[2px_2px_0_0_#12141c] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rendering || activeJob.status === "rendering" ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : null}
                        <span>
                          {rendering || activeJob.status === "rendering"
                            ? isEn
                              ? "Rendering Video…"
                              : "正在渲染影片…"
                            : isEn
                              ? "Use This Image & Render Video →"
                              : "使用此預覽圖並渲染影片 (Render Video) →"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid min-h-[22rem] place-items-center rounded-2xl border border-dashed border-accent-ink/20 bg-paper/60 p-8 text-center">
              <div className="max-w-md space-y-2">
                <p className="font-display text-base font-bold text-foreground">
                  {isEn
                    ? "Ready to run Scro Jutsu"
                    : "準備好開始 Scro Jutsu 影片轉換"}
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  {isEn
                    ? "Upload a reference video on the left, pick a Scro character, outfit, or relight look, and click Generate Preview Image."
                    : "喺左側上傳一段參考影片，揀選你要換入去嘅 Scro 角色、衣櫥單品或 17 款電影打光，然後按「生成預覽圖片與動作描述」。"}
                </p>
              </div>
            </div>
          )}

          {/* Recent Jutsu Jobs History */}
          {jobs.length > 0 ? (
            <div className="rounded-2xl border border-accent-ink/12 bg-paper/90 p-5">
              <h3 className="font-display text-base font-bold">
                {isEn
                  ? `Recent Jutsu Runs (${jobs.length})`
                  : `最近 Jutsu 紀錄（${jobs.length}）`}
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => {
                  const selected = activeJob?.id === job.id;
                  const thumb =
                    job.preparedStartFrameUrl || job.rawStartFrameUrl;
                  return (
                    <div
                      key={job.id}
                      onClick={() => {
                        setActiveJob(job);
                        setMotionDraft(job.motionDescription ?? "");
                      }}
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
                          {MODE_LABELS[job.mode]?.titleZh.replace(/^\d\.\s*/, "")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {job.status === "completed"
                            ? "✓ 已完成影片"
                            : job.status === "rendering"
                              ? "⏳ 渲染中…"
                              : job.status === "failed"
                                ? "✕ 失敗"
                                : "已準備預覽圖"}
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
