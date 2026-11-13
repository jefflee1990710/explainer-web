"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { put } from "@vercel/blob/client";
import {
  appendJutsuReferenceUrls,
  removeJutsuReferenceUrl,
} from "@/model/jutsu-job";
import { prepareBrandUploadAction } from "@/presentation/actions/brand-upload";
import { applyClipScroSwapAction } from "@/presentation/actions/opencut-clip-jutsu";
import { writeLastCharacterIds } from "@/presentation/components/app/projects/new/brief-defaults";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type {
  PublicCharacter,
  PublicCharacterPreset,
  PublicCharacterVersion,
  PublicVideo,
} from "@/presentation/serialize";
import { MAX_CHARACTER_REFERENCES } from "@/service/character/reference-urls";
import { scroSwapCost } from "@/service/credit-costs";
import { checkBrandUpload, resolveBrandContentType } from "@/service/video-edit/edit-state";
import { translateAppError } from "@/util/i18n/translate-app-error";

function versionImageUrl(v?: PublicCharacterVersion | null): string {
  if (!v) return "";
  return v.profileUrl || v.portraitUrl || v.blueprintUrl || "";
}

function presetImageUrl(p: PublicCharacterPreset, char: PublicCharacter): string {
  if (p.profileUrl || p.portraitUrl || p.blueprintUrl) {
    return p.profileUrl || p.portraitUrl || p.blueprintUrl || "";
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

/** Focused modal to apply Scro Swap directly to one completed OpenEdit clip. */
export function OpenCutClipScroSwapDialog({
  videoId,
  clipNumber,
  durationSeconds,
  videoUrl,
  characters,
  onApplied,
  onClose,
}: {
  videoId: string;
  clipNumber: number;
  durationSeconds: number;
  videoUrl: string;
  characters: PublicCharacter[];
  onApplied: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [characterId, setCharacterId] = useState<string>(characters[0]?.id ?? "");
  const [selectedLookUrl, setSelectedLookUrl] = useState<string>(() =>
    defaultCharacterLookUrl(characters[0]),
  );
  const [selectedLookKey, setSelectedLookKey] = useState<string>("default");
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === characterId) ?? null,
    [characters, characterId],
  );

  const savedPresets = useMemo(() => {
    if (!activeCharacter) return [];
    return [...(activeCharacter.presets || [])].filter((p) =>
      Boolean(presetImageUrl(p, activeCharacter)),
    );
  }, [activeCharacter]);

  const effectiveRefUrls =
    uploadedPhotoUrls.length > 0
      ? uploadedPhotoUrls
      : selectedLookUrl
        ? [selectedLookUrl]
        : [];
  const effectiveRefUrl = effectiveRefUrls[0] || "";
  const canSubmit = !submitting && !uploadingPhotos && Boolean(effectiveRefUrl);

  async function handleUploadFiles(fileList: FileList | File[] | undefined | null) {
    if (!fileList || submitting || uploadingPhotos) return;
    const files = Array.from(fileList).filter((f) =>
      resolveBrandContentType(f).startsWith("image/"),
    );
    if (files.length === 0) return;
    const remaining = Math.max(0, MAX_CHARACTER_REFERENCES - uploadedPhotoUrls.length);
    const toUpload = files.slice(0, remaining > 0 ? remaining : MAX_CHARACTER_REFERENCES);
    const baseUrls = remaining > 0 ? uploadedPhotoUrls : [];
    setError("");
    setUploadingPhotos(true);
    try {
      const added: string[] = [];
      for (const file of toUpload) {
        const contentType = resolveBrandContentType(file);
        const checked = checkBrandUpload({ type: contentType, size: file.size });
        if (!checked.ok) {
          setError(translateAppError(checked.error, t));
          break;
        }
        const prepared = await prepareBrandUploadAction({
          contentType,
          size: file.size,
        });
        if (!prepared.ok) {
          setError(translateAppError(prepared.error, t));
          break;
        }
        const blob = await put(prepared.pathname, file, {
          access: "public",
          token: prepared.token,
          contentType: prepared.contentType,
          multipart: file.size > 8 * 1024 * 1024,
        });
        added.push(blob.url);
      }
      if (added.length > 0) {
        setUploadedPhotoUrls(appendJutsuReferenceUrls(baseUrls, added));
      }
    } catch {
      setError(t("errors.uploadFailed"));
    } finally {
      setUploadingPhotos(false);
    }
  }

  function selectCharacter(char: PublicCharacter) {
    if (characterId === char.id && uploadedPhotoUrls.length === 0) {
      setCharacterId("");
      setSelectedLookKey("");
      setSelectedLookUrl("");
      return;
    }
    setCharacterId(char.id);
    writeLastCharacterIds([char.id]);
    setUploadedPhotoUrls([]);
    setSelectedLookKey("default");
    setSelectedLookUrl(defaultCharacterLookUrl(char));
  }

  async function onSubmit() {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipScroSwapAction({
        videoId,
        clipNumber,
        characterId: uploadedPhotoUrls.length > 0 ? undefined : characterId || undefined,
        referenceImageUrl: effectiveRefUrl,
        referenceImageUrls: effectiveRefUrls,
      });
      if (!res.ok) {
        submittingRef.current = false;
        setSubmitting(false);
        setError(res.error);
        return;
      }
      notifyTasksChanged();
      onApplied(res.project);
      onClose();
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
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
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                Scro Swap
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                Clip {clipNumber} · {isEn ? "Character Swap" : "Scro Swap 換角"} ({durationSeconds}s)
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Keep this clip's motion and scene, and replace the character in place."
                : "保留呢段分鏡嘅動作同場景，完成後自動替換時間軸上嘅片段。"}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={isEn ? "Close dialog" : "關閉視窗"}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-accent-ink/15 text-base font-bold text-muted transition hover:border-accent-ink hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="overflow-hidden rounded-xl border border-accent-ink/15 bg-accent-ink/5">
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-[9/16] max-h-48 w-full bg-black object-contain"
              />
            </div>

            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                disabled={submitting || uploadingPhotos}
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  e.target.value = "";
                  void handleUploadFiles(files);
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {isEn
                    ? "Choose Character or Upload 1–6 Photos"
                    : "選擇角色或上傳 1–6 張參考照"}
                </span>
                <button
                  type="button"
                  disabled={
                    submitting ||
                    uploadingPhotos ||
                    uploadedPhotoUrls.length >= MAX_CHARACTER_REFERENCES
                  }
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent-ink/20 bg-paper px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingPhotos ? <Spinner className="h-3.5 w-3.5" /> : <span>+</span>}
                  <span>
                    {uploadingPhotos
                      ? isEn
                        ? "Uploading..."
                        : "上傳中..."
                      : uploadedPhotoUrls.length > 0
                        ? isEn
                          ? `Add Photo (${uploadedPhotoUrls.length}/${MAX_CHARACTER_REFERENCES})`
                          : `繼續加圖 (${uploadedPhotoUrls.length}/${MAX_CHARACTER_REFERENCES})`
                        : isEn
                          ? "Upload Custom Photo(s)"
                          : "上傳自訂角色照（可多張）"}
                  </span>
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!submitting && !uploadingPhotos) setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void handleUploadFiles(e.dataTransfer.files);
                }}
                className={`rounded-xl border border-dashed p-2.5 transition ${
                  uploadedPhotoUrls.length > 0
                    ? "border-accent-ink bg-lime/15"
                    : dragOver
                      ? "border-accent-ink bg-lime/10"
                      : "border-accent-ink/20 bg-surface-hi/30"
                }`}
              >
                {uploadedPhotoUrls.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">
                        {isEn
                          ? `Using ${uploadedPhotoUrls.length} uploaded character ${uploadedPhotoUrls.length === 1 ? "photo" : "photos"}`
                          : `使用已上傳嘅 ${uploadedPhotoUrls.length} 張自訂角色參考照`}
                      </span>
                      <button
                        type="button"
                        disabled={submitting || uploadingPhotos}
                        onClick={() => setUploadedPhotoUrls([])}
                        className="cursor-pointer rounded-lg border border-accent-ink/20 bg-white px-2.5 py-1 text-xs font-semibold hover:border-accent-ink"
                      >
                        {isEn ? "Clear" : "清除"}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {uploadedPhotoUrls.map((url, idx) => (
                        <div key={url} className="relative h-14 w-14 overflow-hidden rounded-lg border border-accent-ink/20 bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover object-top"
                          />
                          <button
                            type="button"
                            disabled={submitting || uploadingPhotos}
                            onClick={() =>
                              setUploadedPhotoUrls((prev) =>
                                removeJutsuReferenceUrl(prev, url),
                              )
                            }
                            aria-label={isEn ? `Remove photo ${idx + 1}` : `移除第 ${idx + 1} 張照片`}
                            className="absolute right-0.5 top-0.5 grid h-4 w-4 cursor-pointer place-items-center rounded-full bg-accent-ink/85 text-[10px] font-bold text-white hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={submitting || uploadingPhotos}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 text-left text-xs text-muted hover:text-foreground"
                  >
                    <span>
                      {isEn
                        ? "Drop 1–6 character photos here (front, side, full-body) or click to browse"
                        : "拖放 1–6 張角色照片至此（正面、側面、全身穿搭）或點擊上傳"}
                    </span>
                    <span className="shrink-0 rounded-lg border border-accent-ink/15 bg-white px-2 py-0.5 font-semibold text-foreground">
                      {isEn ? "Browse" : "選擇檔案"}
                    </span>
                  </button>
                )}
              </div>

              {characters.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {characters.map((char) => {
                    const thumb = defaultCharacterLookUrl(char);
                    const active = uploadedPhotoUrls.length === 0 && char.id === characterId;
                    return (
                      <button
                        key={char.id}
                        type="button"
                        onClick={() => selectCharacter(char)}
                        className={`flex flex-col overflow-hidden rounded-xl border text-left transition ${
                          active
                            ? "border-2 border-accent-ink bg-lime/20"
                            : "border-accent-ink/15 hover:border-accent-ink/50"
                        }`}
                      >
                        <div className="aspect-square w-full bg-accent-ink/5">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={char.name} className="size-full object-cover" />
                          ) : null}
                        </div>
                        <span className="truncate px-2 py-1 text-xs font-semibold">
                          {char.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {activeCharacter && uploadedPhotoUrls.length === 0 && savedPresets.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-semibold text-muted">
                    {isEn ? "Look / Outfit Preset" : "造型預設"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLookKey("default");
                        setSelectedLookUrl(defaultCharacterLookUrl(activeCharacter));
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        selectedLookKey === "default"
                          ? "border-accent-ink bg-accent-ink text-white"
                          : "border-accent-ink/20"
                      }`}
                    >
                      {isEn ? "Default" : "預設造型"}
                    </button>
                    {savedPresets.map((preset) => {
                      const key = `preset:${preset.id}`;
                      const url = presetImageUrl(preset, activeCharacter);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedLookKey(key);
                            setSelectedLookUrl(url);
                          }}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            selectedLookKey === key
                              ? "border-accent-ink bg-accent-ink text-white"
                              : "border-accent-ink/20"
                          }`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-accent-ink/10 px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl border border-accent-ink/20 px-4 py-2 text-xs font-bold hover:border-accent-ink"
          >
            {isEn ? "Cancel" : "取消"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-accent-ink bg-lime px-5 py-2 font-display text-xs font-bold text-accent-ink shadow-[3px_3px_0_0_#12141c] disabled:opacity-40"
          >
            {submitting ? <Spinner className="h-3.5 w-3.5" /> : null}
            <span>
              {isEn ? "Apply Scro Swap" : "套用 Scro Swap 換角"} ·{" "}
              {scroSwapCost({ durationSeconds, mediaKind: "video" })}
            </span>
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
