"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { applyClipScroSwapAction } from "@/presentation/actions/opencut-clip-jutsu";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
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
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [characterId, setCharacterId] = useState<string>(characters[0]?.id ?? "");
  const [selectedLookUrl, setSelectedLookUrl] = useState<string>(() =>
    defaultCharacterLookUrl(characters[0]),
  );
  const [selectedLookKey, setSelectedLookKey] = useState<string>("default");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  const effectiveRefUrl = uploadedPhotoUrl || selectedLookUrl || "";
  const canSubmit = !submitting && Boolean(effectiveRefUrl);

  function selectCharacter(char: PublicCharacter) {
    setCharacterId(char.id);
    setUploadedPhotoUrl("");
    setSelectedLookKey("default");
    setSelectedLookUrl(defaultCharacterLookUrl(char));
  }

  async function onSubmit() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipScroSwapAction({
        videoId,
        clipNumber,
        characterId: uploadedPhotoUrl ? undefined : characterId || undefined,
        referenceImageUrl: effectiveRefUrl,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notifyTasksChanged();
      onApplied(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to start Scro Swap." : "啟動 Scro Swap 失敗，請重試");
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-sm font-bold">
                  {isEn ? "Choose Character or Upload Photo" : "選擇角色或上傳參考照"}
                </span>
                <BrandUploadButton
                  label={
                    uploadedPhotoUrl
                      ? isEn
                        ? "Replace Photo"
                        : "更換照片"
                      : isEn
                        ? "Upload Custom Photo"
                        : "上傳自訂角色照"
                  }
                  accept="image/png,image/jpeg,image/webp"
                  disabled={submitting}
                  onUploaded={(asset) => {
                    if (asset.kind === "image") {
                      setUploadedPhotoUrl(asset.url);
                      setError("");
                    }
                  }}
                  onError={setError}
                />
              </div>

              {uploadedPhotoUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-accent-ink/20 bg-surface-hi/40 p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedPhotoUrl}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-semibold">
                      {isEn ? "Using uploaded character photo" : "使用已上傳嘅自訂角色照"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedPhotoUrl("")}
                    className="rounded-lg border border-accent-ink/20 px-2.5 py-1 text-xs font-semibold hover:border-accent-ink"
                  >
                    {isEn ? "Clear" : "清除"}
                  </button>
                </div>
              ) : null}

              {characters.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {characters.map((char) => {
                    const thumb = defaultCharacterLookUrl(char);
                    const active = !uploadedPhotoUrl && char.id === characterId;
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

              {activeCharacter && !uploadedPhotoUrl && savedPresets.length > 0 ? (
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
            {isEn ? "Apply Scro Swap" : "套用 Scro Swap 換角"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
