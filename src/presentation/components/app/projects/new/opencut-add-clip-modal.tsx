"use client";

import { useState } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { CharacterPicker } from "@/presentation/components/app/projects/[id]/character-picker";
import {
  OpenCutAddClipSelectionDialog,
} from "./opencut-add-clip-selection-dialog";
import type { OpenCutAddClipMode } from "./opencut-add-clip-types";
import {
  AppendDirectorDialog,
  type AppendDirectorSubmitPayload,
} from "./append-director-dialog";
import { appendSimpleClipAction } from "@/presentation/actions/clip-timeline";
import {
  applyClipScroSwapInsertAction,
  applyClipTeleportInsertAction,
} from "@/presentation/actions/opencut-clip-jutsu";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import type {
  PublicCharacter,
  PublicProduct,
  PublicSkill,
  PublicStyle,
  PublicVideo,
} from "@/presentation/serialize";
import { Cancel01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function OpenCutAddClipModal({
  open,
  defaultInsertAt,
  project,
  skills = [],
  styles = [],
  characters = [],
  products = [],
  credits,
  subscribed = true,
  onClose,
  onProject,
  onAppendDirector,
}: {
  open: boolean;
  defaultInsertAt: number;
  project: PublicVideo;
  skills?: PublicSkill[];
  styles?: PublicStyle[];
  characters?: PublicCharacter[];
  products?: PublicProduct[];
  credits: number;
  subscribed?: boolean;
  onClose: () => void;
  onProject: (project: PublicVideo) => void;
  onAppendDirector: (payload: AppendDirectorSubmitPayload) => Promise<void>;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [selectedMode, setSelectedMode] = useState<OpenCutAddClipMode | null>(null);
  const [insertAt, setInsertAt] = useState<number>(defaultInsertAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Simple video form states
  const [simplePrompt, setSimplePrompt] = useState("");
  const [simpleDuration, setSimpleDuration] = useState(6);
  const [simpleCharacterId, setSimpleCharacterId] = useState<string | undefined>(undefined);
  const [simpleRefImages, setSimpleRefImages] = useState<string[]>([]);

  // Swap form states
  const [swapSourceType, setSwapSourceType] = useState<"clip" | "upload">("clip");
  const [swapSourceClipNumber, setSwapSourceClipNumber] = useState<number>(
    defaultInsertAt > 1 ? defaultInsertAt - 1 : 1,
  );
  const [swapUploadedUrl, setSwapUploadedUrl] = useState("");
  const [swapCharacterId, setSwapCharacterId] = useState<string | undefined>(undefined);

  // Teleport form states
  const [teleportSourceType, setTeleportSourceType] = useState<"clip" | "upload">("clip");
  const [teleportSourceClipNumber, setTeleportSourceClipNumber] = useState<number>(
    defaultInsertAt > 1 ? defaultInsertAt - 1 : 1,
  );
  const [teleportUploadedUrl, setTeleportUploadedUrl] = useState("");
  const [teleportScenePrompt, setTeleportScenePrompt] = useState("");
  const [teleportSceneImageUrl, setTeleportSceneImageUrl] = useState("");

  if (!open) return null;

  const totalClips = project.phaseA?.clips?.length ?? project.clips?.length ?? 0;
  const completedClips = (project.clips ?? []).filter((c) => c.status === "completed");

  const slotOptions = Array.from({ length: totalClips + 1 }, (_, i) => i + 1);

  // Handle Simple Video submission
  async function handleSimpleSubmit() {
    if (!simplePrompt.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await appendSimpleClipAction({
        videoId: project.id,
        insertAt,
        prompt: simplePrompt.trim(),
        durationSeconds: simpleDuration,
        characterId: simpleCharacterId,
        referenceImageUrls: simpleRefImages,
      });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      notifyTasksChanged();
      onProject(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to create simple clip." : "建立簡易分鏡失敗，請重試");
      setSubmitting(false);
    }
  }

  // Handle Scro Swap submission
  async function handleSwapSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await applyClipScroSwapInsertAction({
        videoId: project.id,
        insertAt,
        sourceClipNumber: swapSourceType === "clip" ? swapSourceClipNumber : undefined,
        sourceVideoUrl: swapSourceType === "upload" ? swapUploadedUrl : undefined,
        characterId: swapCharacterId,
      });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      notifyTasksChanged();
      onProject(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
      setSubmitting(false);
    }
  }

  // Handle Teleport submission
  async function handleTeleportSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await applyClipTeleportInsertAction({
        videoId: project.id,
        insertAt,
        sourceClipNumber: teleportSourceType === "clip" ? teleportSourceClipNumber : undefined,
        sourceVideoUrl: teleportSourceType === "upload" ? teleportUploadedUrl : undefined,
        scenePrompt: teleportScenePrompt.trim() || undefined,
        sceneImageUrl: teleportSceneImageUrl.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        setSubmitting(false);
        return;
      }
      notifyTasksChanged();
      onProject(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to start Teleport." : "啟動 Teleport 失敗，請重試");
      setSubmitting(false);
    }
  }

  // Step 1: Mode Selection
  if (!selectedMode) {
    return (
      <OpenCutAddClipSelectionDialog
        open={open}
        defaultInsertAt={defaultInsertAt}
        totalClips={totalClips}
        onSelectMode={(mode) => {
          setSelectedMode(mode);
          setInsertAt(defaultInsertAt);
        }}
        onClose={onClose}
      />
    );
  }

  // Step 2 for Explainer: Delegate to AppendDirectorDialog
  if (selectedMode === "explainer") {
    const clips = project.phaseA?.clips ?? [];
    return (
      <AppendDirectorDialog
        mode="add-clip"
        project={project}
        skills={skills}
        styles={styles}
        characters={characters}
        products={products}
        credits={credits}
        subscribed={subscribed}
        pending={submitting}
        error={error}
        afterOptions={clips.map((clip) => ({
          clipNumber: clip.clipNumber,
          title: `Clip #${clip.clipNumber} · ${clip.narrativeJob || clip.startScene?.slice(0, 20)}`,
        }))}
        defaultAfterClipNumber={insertAt > 1 ? insertAt - 1 : undefined}
        onCancel={() => setSelectedMode(null)}
        onConfirm={async (payload) => {
          setSubmitting(true);
          try {
            await onAppendDirector({
              ...payload,
              afterClipNumber: insertAt > 1 ? insertAt - 1 : undefined,
            });
            onClose();
          } catch {
            setError(isEn ? "Failed to append explainer clip." : "新增解說分鏡失敗");
          } finally {
            setSubmitting(false);
          }
        }}
      />
    );
  }

  // Step 2 for Simple Video, Scro Swap, and Teleport
  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/60 p-4 backdrop-blur-xs z-50"
      onClick={submitting ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--studio-line)] px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setSelectedMode(null)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)] disabled:opacity-50"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-[var(--studio-ink)]">
                {selectedMode === "simple" && (isEn ? "Simple Video Setup" : "簡易影片設定")}
                {selectedMode === "swap" && (isEn ? "Scro Swap Setup" : "Scro Swap 換角設定")}
                {selectedMode === "teleport" && (isEn ? "Teleport Setup" : "Teleport 換背景設定")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Configure clip parameters and insertion slot" : "設定分鏡參數與時間軸插入位置"}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)] disabled:opacity-50"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
              {error}
            </div>
          ) : null}

          {/* Insertion slot picker */}
          <div>
            <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
              {isEn ? "Timeline Insertion Slot" : "時間軸插入位置"}
            </label>
            <select
              value={insertAt}
              onChange={(e) => setInsertAt(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] px-3 py-2 text-xs text-[var(--studio-ink)] focus:outline-hidden focus:border-accent-ink"
            >
              {slotOptions.map((slot) => (
                <option key={slot} value={slot}>
                  {slot === 1
                    ? isEn ? "Slot 1 (At the beginning)" : "第 1 段（最開頭）"
                    : slot > totalClips
                    ? isEn ? `Slot ${slot} (Append at the end)` : `第 ${slot} 段（接在最後面）`
                    : isEn ? `Slot ${slot} (After Clip #${slot - 1})` : `第 ${slot} 段（在 Clip #${slot - 1} 之後）`}
                </option>
              ))}
            </select>
          </div>

          {/* Mode: Simple Video */}
          {selectedMode === "simple" ? (
            <>
              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "Prompt / Action Description" : "分鏡畫面與動作描述 (Prompt)"}
                </label>
                <textarea
                  value={simplePrompt}
                  onChange={(e) => setSimplePrompt(e.target.value)}
                  placeholder={
                    isEn
                      ? "A cinematic shot of character walking through a vibrant Tokyo night market..."
                      : "電影感鏡頭，角色穿梭於熱鬧的東京夜市，霓虹燈倒映於水坑中..."
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] p-3 text-xs text-[var(--studio-ink)] focus:outline-hidden focus:border-accent-ink resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "Duration" : "片段秒數"}
                </label>
                <div className="flex items-center gap-2">
                  {[5, 6, 8, 10, 12].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSimpleDuration(sec)}
                      className={`flex-1 rounded-lg border py-1.5 font-semibold transition ${
                        simpleDuration === sec
                          ? "border-accent-ink bg-accent-ink text-white"
                          : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)] hover:border-accent-ink"
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {characters.length > 0 ? (
                <div>
                  <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                    {isEn ? "Optional Character Face Lock" : "角色面部鎖定（選填）"}
                  </label>
                  <CharacterPicker
                    characters={characters}
                    value={simpleCharacterId ? [simpleCharacterId] : []}
                    onChange={(ids) => setSimpleCharacterId(ids[0] || undefined)}
                    credits={credits}
                    subscribed={subscribed}
                  />
                </div>
              ) : null}

              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "Optional Reference Stills" : "風格或場景參考圖（選填，至多 4 張）"}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {simpleRefImages.map((url, idx) => (
                    <div key={url} className="relative size-12 rounded-lg border border-[var(--studio-line)] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Ref ${idx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSimpleRefImages(simpleRefImages.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                      </button>
                    </div>
                  ))}
                  {simpleRefImages.length < 4 ? (
                    <BrandUploadButton
                      label={isEn ? "+ Add image" : "+ 新增參考圖"}
                      accept="image/*"
                      onUploaded={(asset) => setSimpleRefImages([...simpleRefImages, asset.url])}
                      onError={(msg) => setError(msg)}
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {/* Mode: Scro Swap */}
          {selectedMode === "swap" ? (
            <>
              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "Source Video Selection" : "動態來源影片"}
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSwapSourceType("clip")}
                    className={`flex-1 rounded-lg border py-1.5 font-semibold transition ${
                      swapSourceType === "clip"
                        ? "border-accent-ink bg-accent-ink text-white"
                        : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)]"
                    }`}
                  >
                    {isEn ? "Timeline Clip" : "時間軸既有片段"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwapSourceType("upload")}
                    className={`flex-1 rounded-lg border py-1.5 font-semibold transition ${
                      swapSourceType === "upload"
                        ? "border-accent-ink bg-accent-ink text-white"
                        : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)]"
                    }`}
                  >
                    {isEn ? "Upload New Video" : "上傳新影片"}
                  </button>
                </div>

                {swapSourceType === "clip" ? (
                  completedClips.length > 0 ? (
                    <select
                      value={swapSourceClipNumber}
                      onChange={(e) => setSwapSourceClipNumber(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] px-3 py-2 text-xs text-[var(--studio-ink)] focus:outline-hidden"
                    >
                      {completedClips.map((c) => (
                        <option key={c.clipNumber} value={c.clipNumber}>
                          Clip #{c.clipNumber} ({c.durationSeconds}s)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-amber-500">
                      {isEn ? "No completed clips yet. Please upload a video." : "目前尚無已完成的片段，請切換至上傳新影片。"}
                    </p>
                  )
                ) : (
                  <input
                    type="url"
                    value={swapUploadedUrl}
                    onChange={(e) => setSwapUploadedUrl(e.target.value)}
                    placeholder="https://...mp4"
                    className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] p-2.5 text-xs text-[var(--studio-ink)] focus:outline-hidden"
                  />
                )}
              </div>

              {characters.length > 0 ? (
                <div>
                  <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                    {isEn ? "Target Character" : "置換目標角色"}
                  </label>
                  <CharacterPicker
                    characters={characters}
                    value={swapCharacterId ? [swapCharacterId] : []}
                    onChange={(ids) => setSwapCharacterId(ids[0] || undefined)}
                    credits={credits}
                    subscribed={subscribed}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {/* Mode: Teleport */}
          {selectedMode === "teleport" ? (
            <>
              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "Subject Video Selection" : "人物動作來源影片"}
                </label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTeleportSourceType("clip")}
                    className={`flex-1 rounded-lg border py-1.5 font-semibold transition ${
                      teleportSourceType === "clip"
                        ? "border-accent-ink bg-accent-ink text-white"
                        : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)]"
                    }`}
                  >
                    {isEn ? "Timeline Clip" : "時間軸既有片段"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeleportSourceType("upload")}
                    className={`flex-1 rounded-lg border py-1.5 font-semibold transition ${
                      teleportSourceType === "upload"
                        ? "border-accent-ink bg-accent-ink text-white"
                        : "border-[var(--studio-line)] bg-[var(--studio-fill)] text-[var(--studio-ink)]"
                    }`}
                  >
                    {isEn ? "Upload New Video" : "上傳新影片"}
                  </button>
                </div>

                {teleportSourceType === "clip" ? (
                  completedClips.length > 0 ? (
                    <select
                      value={teleportSourceClipNumber}
                      onChange={(e) => setTeleportSourceClipNumber(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] px-3 py-2 text-xs text-[var(--studio-ink)] focus:outline-hidden"
                    >
                      {completedClips.map((c) => (
                        <option key={c.clipNumber} value={c.clipNumber}>
                          Clip #{c.clipNumber} ({c.durationSeconds}s)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-amber-500">
                      {isEn ? "No completed clips yet. Please upload a video." : "目前尚無已完成的片段，請切換至上傳新影片。"}
                    </p>
                  )
                ) : (
                  <input
                    type="url"
                    value={teleportUploadedUrl}
                    onChange={(e) => setTeleportUploadedUrl(e.target.value)}
                    placeholder="https://...mp4"
                    className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] p-2.5 text-xs text-[var(--studio-ink)] focus:outline-hidden"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "New Scene Prompt (Optional)" : "全新背景場景描述（選填）"}
                </label>
                <input
                  type="text"
                  value={teleportScenePrompt}
                  onChange={(e) => setTeleportScenePrompt(e.target.value)}
                  placeholder={
                    isEn
                      ? "A futuristic high-tech laboratory with hologram screens..."
                      : "充滿全息投影螢幕的未來高科技實驗室..."
                  }
                  className="w-full rounded-lg border border-[var(--studio-line)] bg-[var(--studio-fill)] p-2.5 text-xs text-[var(--studio-ink)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[var(--studio-ink)]">
                  {isEn ? "New Scene Image (Optional)" : "全新場景圖片（選填）"}
                </label>
                <div className="flex items-center gap-2">
                  {teleportSceneImageUrl ? (
                    <div className="relative size-12 rounded-lg border border-[var(--studio-line)] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={teleportSceneImageUrl} alt="Scene" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setTeleportSceneImageUrl("")}
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <BrandUploadButton
                      label={isEn ? "Upload scene image" : "上傳場景圖"}
                      accept="image/*"
                      onUploaded={(asset) => setTeleportSceneImageUrl(asset.url)}
                      onError={(msg) => setError(msg)}
                    />
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--studio-line)] px-6 py-4 bg-[var(--studio-fill)]">
          <div className="text-xs text-muted-foreground">
            {selectedMode === "simple" && `${simpleDuration * 2} credits`}
            {selectedMode === "swap" && "Scro Swap"}
            {selectedMode === "teleport" && "Teleport"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setSelectedMode(null)}
              className="rounded-lg border border-[var(--studio-line)] px-4 py-2 font-semibold text-[var(--studio-ink)] hover:bg-[var(--studio-panel)] disabled:opacity-50"
            >
              {isEn ? "Back" : "上一步"}
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                (selectedMode === "simple" && !simplePrompt.trim()) ||
                (selectedMode === "swap" && swapSourceType === "upload" && !swapUploadedUrl.trim()) ||
                (selectedMode === "teleport" && teleportSourceType === "upload" && !teleportUploadedUrl.trim())
              }
              onClick={() => {
                if (selectedMode === "simple") void handleSimpleSubmit();
                if (selectedMode === "swap") void handleSwapSubmit();
                if (selectedMode === "teleport") void handleTeleportSubmit();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent-ink px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Spinner className="size-3.5" /> : null}
              <span>{isEn ? "Create & Insert Clip" : "建立並插入片段"}</span>
            </button>
          </div>
        </div>
      </div>
    </DialogBackdrop>
  );
}
