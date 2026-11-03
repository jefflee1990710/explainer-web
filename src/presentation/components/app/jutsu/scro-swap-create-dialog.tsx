"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { PublicJutsuJob } from "@/model/jutsu-job";
import { startScroSwapJobAction } from "@/presentation/actions/jutsu";
import { JutsuRelightPicker } from "@/presentation/components/app/jutsu/jutsu-relight-picker";
import { CharacterManageDialog } from "@/presentation/components/app/projects/[id]/character-manage-dialog";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
} from "@/presentation/serialize";
import type { CharacterPresetSelection } from "@/service/character/character-presets";

type LookTab = "presets" | "historical";

function versionImageUrl(v?: PublicCharacterVersion | null): string {
  if (!v) return "";
  return v.portraitUrl || v.profileUrl || v.blueprintUrl || "";
}

function presetImageUrl(p: PublicCharacterPreset, char: PublicCharacter): string {
  if (p.portraitUrl || p.profileUrl || p.blueprintUrl) {
    return p.portraitUrl || p.profileUrl || p.blueprintUrl || "";
  }
  const ver = char.versions.find((v) => v.id === p.versionId);
  return versionImageUrl(ver);
}

function defaultCharacterLookUrl(char?: PublicCharacter | null): string {
  if (!char) return "";
  const completed = [...(char.versions || [])]
    .reverse()
    .filter((v) => v.status === "completed" && Boolean(versionImageUrl(v)));
  const def = char.defaultVersionId
    ? completed.find((v) => v.id === char.defaultVersionId)
    : undefined;
  return versionImageUrl(def ?? completed[0]) || char.previewUrl || "";
}

/** Single-portrait avatar URL (avoids the 2-column blueprint board image). */
function characterAvatarUrl(char?: PublicCharacter | null): string {
  if (!char) return "";
  const completed = [...(char.versions || [])]
    .reverse()
    .filter((v) => v.status === "completed");
  const def = char.defaultVersionId
    ? completed.find((v) => v.id === char.defaultVersionId)
    : undefined;
  const pick = def ?? completed[0];
  return (
    pick?.portraitUrl ||
    pick?.profileUrl ||
    char.previewUrl ||
    pick?.blueprintUrl ||
    ""
  );
}

/**
 * Large modal dialog for creating a new Scro Swap job:
 * - Video upload + start/length controls
 * - 2-layer character selection:
 *   Layer 1: Character grid (or upload custom photo)
 *   Layer 2: Presets (default) | Historical versions | Customize Outfit (opens CharacterManageDialog)
 */
export function ScroSwapCreateDialog({
  characters,
  onCharacterUpdated,
  onCreated,
  onClose,
}: {
  characters: PublicCharacter[];
  onCharacterUpdated: (next: PublicCharacter) => void;
  onCreated: (job: PublicJutsuJob) => void;
  onClose: () => void;
}) {
  const { locale, t } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [sourceUploadProgress, setSourceUploadProgress] = useState<number | null>(null);
  const [sectionStart, setSectionStart] = useState(0);
  const [sectionLength, setSectionLength] = useState(6);

  const [characterId, setCharacterId] = useState<string>(characters[0]?.id ?? "");
  const [lookTab, setLookTab] = useState<LookTab>("presets");
  // Selected look URL from Preset / Historical / Customize Outfit (or custom uploaded photo)
  const [selectedLookUrl, setSelectedLookUrl] = useState<string>(() =>
    defaultCharacterLookUrl(characters[0]),
  );
  const [selectedLookKey, setSelectedLookKey] = useState<string>("default");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [managingCharacter, setManagingCharacter] = useState(false);

  // Advanced options
  const [relightEnabled, setRelightEnabled] = useState(false);
  const [relightId, setRelightId] = useState("golden_halo");
  const [customLightPrompt, setCustomLightPrompt] = useState("");
  const [maskMargin, setMaskMargin] = useState<"tight" | "normal" | "loose">("normal");
  const [hatFix, setHatFix] = useState(false);
  const [noLipSync, setNoLipSync] = useState(false);
  const [motionSize, setMotionSize] = useState<512 | 768 | 1376>(512);
  const [applyColorFixOnRender, setApplyColorFixOnRender] = useState(true);
  const [keepSourceAudio, setKeepSourceAudio] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !managingCharacter && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [managingCharacter, onClose, submitting]);

  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  );

  const completedVersions = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.versions || [])]
      .filter((v) => v.status === "completed" && Boolean(versionImageUrl(v)))
      .sort((a, b) => b.number - a.number);
  }, [activeCharacter]);

  const savedPresets = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.presets || [])].filter((p) =>
      Boolean(presetImageUrl(p, activeCharacter)),
    );
  }, [activeCharacter]);

  function selectCharacter(char: PublicCharacter) {
    setCharacterId(char.id);
    setUploadedPhotoUrl("");
    setLookTab("presets");
    setSelectedLookKey("default");
    setSelectedLookUrl(defaultCharacterLookUrl(char));
  }

  function handleCustomizedLook(selection: CharacterPresetSelection) {
    setManagingCharacter(false);
    if (!activeCharacter) return;
    if (selection.presetId) {
      const preset = activeCharacter.presets.find((p) => p.id === selection.presetId);
      const url = preset ? presetImageUrl(preset, activeCharacter) : "";
      if (url) {
        setLookTab("presets");
        setSelectedLookKey(`preset:${preset!.id}`);
        setSelectedLookUrl(url);
        return;
      }
    }
    if (selection.versionId) {
      const ver = activeCharacter.versions.find((v) => v.id === selection.versionId);
      const url = versionImageUrl(ver);
      if (url) {
        setLookTab("historical");
        setSelectedLookKey(`ver:${ver!.id}`);
        setSelectedLookUrl(url);
      }
    }
  }

  async function onSubmit() {
    if (submitting || !sourceVideoUrl) return;
    setError("");
    setSubmitting(true);
    try {
      const effectiveRefUrl = uploadedPhotoUrl || selectedLookUrl || undefined;
      const res = await startScroSwapJobAction({
        sourceVideoUrl,
        sectionStart,
        sectionLength,
        characterId: uploadedPhotoUrl ? undefined : characterId || undefined,
        referenceImageUrl: effectiveRefUrl,
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
      onCreated(res.job);
    } catch {
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
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
          {/* Dialog Header */}
          <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                  Scro Swap
                </span>
                <h2 id={titleId} className="font-display text-lg font-bold">
                  {isEn ? "New Character Motion Swap" : "新增角色動作遷移"}
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {isEn
                  ? "Upload a reference video, pick a character and outfit look, then click Generate."
                  : "上傳參考短片，揀選角色與造型（Preset／歷史造型／自訂穿搭），再按 Generate。"}
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

          {/* Scrollable Body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* Step 1: Source Video */}
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
                    onLoadedMetadata={(e) => {
                      const dur = e.currentTarget.duration;
                      if (!Number.isFinite(dur) || dur <= 0) return;
                      setSectionStart(0);
                      setSectionLength(Math.min(15, Math.max(2, Math.round(dur))));
                    }}
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
                        max={300}
                        step={0.5}
                        disabled={submitting}
                        value={sectionStart}
                        onChange={(e) => setSectionStart(Math.max(0, Number(e.target.value)))}
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
                        value={sectionLength}
                        onChange={(e) =>
                          setSectionLength(Math.min(15, Math.max(2, Number(e.target.value))))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-accent-ink/20 bg-white px-2.5 text-xs font-bold"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid h-28 place-items-center rounded-xl border-2 border-dashed border-accent-ink/20 bg-paper/50 p-4 text-center text-xs text-muted">
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
            </section>

            {/* Step 2: Two-Layer Character & Outfit Picker */}
            <section className="space-y-4 border-t border-accent-ink/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {isEn ? "2. Select Character" : "2. 選擇角色"}
                </span>
                <div className="flex items-center gap-2">
                  <BrandUploadButton
                    label={isEn ? "Upload Custom Photo" : "上傳自訂人物相"}
                    accept="image/png,image/jpeg,image/webp"
                    disabled={submitting}
                    onUploaded={(asset) => {
                      if (asset.kind === "image") {
                        setUploadedPhotoUrl(asset.url);
                      }
                    }}
                    onError={setError}
                  />
                  {uploadedPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setUploadedPhotoUrl("")}
                      className="cursor-pointer text-xs font-semibold text-red-600"
                    >
                      {isEn ? "Clear photo" : "清除相片"}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Layer 1: Character avatar strip (image-only tile buttons, not pills) */}
              {characters.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-7">
                  {characters.map((char) => {
                    const active = characterId === char.id && !uploadedPhotoUrl;
                    const avatar = characterAvatarUrl(char);
                    return (
                      <button
                        key={char.id}
                        type="button"
                        disabled={submitting}
                        title={char.name}
                        aria-label={char.name}
                        aria-pressed={active}
                        onClick={() => selectCharacter(char)}
                        className={`style-option group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                          active
                            ? "border-2 border-accent-ink ring-2 ring-lime"
                            : "border-accent-ink/15 hover:border-accent-ink/45"
                        }`}
                      >
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatar}
                            alt={char.name}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center bg-zinc-200 text-xs font-bold text-zinc-600">
                            {char.name.slice(0, 2)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Layer 2: Selected Character's Presets / Historical / Customize Outfit */}
              {uploadedPhotoUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-accent-ink/15 bg-paper/70 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedPhotoUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-foreground">
                      {isEn ? "Custom character photo selected" : "已選用自訂上傳人物相片"}
                    </p>
                    <p className="mt-0.5 text-muted">
                      {isEn
                        ? "Click any character above to switch back to character presets & history."
                        : "點選上方任何角色即可切回角色 Preset 與歷史造型。"}
                    </p>
                  </div>
                </div>
              ) : activeCharacter ? (
                <div className="space-y-3 rounded-2xl border border-accent-ink/15 bg-paper/65 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={lookTab === "presets"}
                        onClick={() => setLookTab("presets")}
                        className={`min-h-[36px] cursor-pointer rounded-full px-3.5 text-xs font-bold transition ${
                          lookTab === "presets"
                            ? "bg-accent-ink text-lime"
                            : "border border-accent-ink/15 bg-white text-muted hover:text-foreground"
                        }`}
                      >
                        {isEn
                          ? `Presets (${1 + savedPresets.length})`
                          : `預設造型 Presets (${1 + savedPresets.length})`}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={lookTab === "historical"}
                        onClick={() => setLookTab("historical")}
                        className={`min-h-[36px] cursor-pointer rounded-full px-3.5 text-xs font-bold transition ${
                          lookTab === "historical"
                            ? "bg-accent-ink text-lime"
                            : "border border-accent-ink/15 bg-white text-muted hover:text-foreground"
                        }`}
                      >
                        {isEn
                          ? `Historical (${completedVersions.length})`
                          : `歷史造型 Historical (${completedVersions.length})`}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setManagingCharacter(true)}
                      className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-accent-ink bg-lime/60 px-3.5 text-xs font-bold text-accent-ink transition hover:bg-lime"
                    >
                      <span>{isEn ? "+ Customize Outfit" : "+ 自訂穿搭 Customize Outfit"}</span>
                    </button>
                  </div>

                  {lookTab === "presets" ? (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                      {/* Default preset card */}
                      {(() => {
                        const defUrl = defaultCharacterLookUrl(activeCharacter);
                        const active = selectedLookKey === "default";
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLookKey("default");
                              setSelectedLookUrl(defUrl);
                            }}
                            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1.5 text-left transition ${
                              active
                                ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                                : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
                            }`}
                          >
                            {defUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={defUrl}
                                alt={activeCharacter.name}
                                className="aspect-square w-full rounded-lg object-cover"
                              />
                            ) : null}
                            <span className="mt-1.5 truncate text-[11px] font-bold">
                              {isEn ? "Default Look" : "預設造型"}
                            </span>
                            <span className="text-[10px] text-muted">
                              {activeCharacter.name}
                            </span>
                          </button>
                        );
                      })()}

                      {savedPresets.map((preset) => {
                        const url = presetImageUrl(preset, activeCharacter);
                        const key = `preset:${preset.id}`;
                        const active = selectedLookKey === key;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setSelectedLookKey(key);
                              setSelectedLookUrl(url);
                            }}
                            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1.5 text-left transition ${
                              active
                                ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                                : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={preset.name}
                              className="aspect-square w-full rounded-lg object-cover"
                            />
                            <span className="mt-1.5 truncate text-[11px] font-bold">
                              {preset.name}
                            </span>
                            <span className="truncate text-[10px] text-muted">
                              v{preset.versionNumber}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                      {completedVersions.map((ver) => {
                        const url = versionImageUrl(ver);
                        const key = `ver:${ver.id}`;
                        const active = selectedLookKey === key;
                        const label = ver.editInstruction
                          ? ver.editInstruction
                              .replace(/\s*Isolated wardrobe piece [\w-]+\.?/gi, "")
                              .slice(0, 26)
                          : isEn
                            ? `Version #${ver.number}`
                            : `造型 #${ver.number}`;
                        return (
                          <button
                            key={ver.id}
                            type="button"
                            onClick={() => {
                              setSelectedLookKey(key);
                              setSelectedLookUrl(url);
                            }}
                            className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border p-1.5 text-left transition ${
                              active
                                ? "border-2 border-accent-ink bg-white ring-2 ring-lime"
                                : "border-accent-ink/12 bg-white hover:border-accent-ink/35"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={label}
                              className="aspect-square w-full rounded-lg object-cover"
                            />
                            <span className="mt-1.5 truncate text-[11px] font-bold">
                              {label}
                            </span>
                            <span className="text-[10px] text-muted">
                              v{ver.number} · {new Date(ver.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* Optional Relight & Render Settings */}
            <details className="rounded-2xl border border-accent-ink/12 bg-paper/60 p-4">
              <summary className="cursor-pointer font-display text-xs font-bold text-foreground">
                {isEn
                  ? "Advanced: Relight & Motion Settings"
                  : "進階設定：打光 Relight 與遮罩參數"}
              </summary>
              <div className="mt-4 space-y-4">
                <JutsuRelightPicker
                  enabled={relightEnabled}
                  onEnabledChange={setRelightEnabled}
                  selectedId={relightId}
                  onSelectId={setRelightId}
                  customPrompt={customLightPrompt}
                  onCustomPromptChange={setCustomLightPrompt}
                  disabled={submitting}
                />

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

                <div className="flex flex-wrap items-center gap-4">
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

          {/* Dialog Footer */}
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
              disabled={!sourceVideoUrl || submitting}
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

      {managingCharacter && activeCharacter ? (
        <CharacterManageDialog
          character={activeCharacter}
          onCharacterUpdated={onCharacterUpdated}
          onSelectAndClose={handleCustomizedLook}
          onClose={() => setManagingCharacter(false)}
        />
      ) : null}
    </>
  );
}
