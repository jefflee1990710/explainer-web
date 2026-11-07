"use client";

import { useEffect, useId, useRef, useState } from "react";
import { applyClipExtendAction } from "@/presentation/actions/opencut-clip-jutsu";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";
import { teleportCost } from "@/service/credit-costs";

/** Modal to extend a completed OpenEdit clip into a new Clip N+1 via Vast MiniMax H3 ref2va (39-frame latent prefix + 6s video ref + character/scene/prop refs). */
export function OpenCutClipExtendDialog({
  videoId,
  clipNumber,
  durationSeconds,
  videoUrl,
  defaultCharacterImageUrls,
  defaultSceneImageUrl,
  defaultPropImageUrls,
  onApplied,
  onClose,
}: {
  videoId: string;
  clipNumber: number;
  durationSeconds: number;
  videoUrl: string;
  defaultCharacterImageUrls: string[];
  defaultSceneImageUrl?: string;
  defaultPropImageUrls: string[];
  onApplied: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [prompt, setPrompt] = useState("");
  const [characterImageUrls, setCharacterImageUrls] = useState<string[]>(
    defaultCharacterImageUrls,
  );
  const [sceneImageUrl, setSceneImageUrl] = useState<string>(defaultSceneImageUrl ?? "");
  const [propImageUrls, setPropImageUrls] = useState<string[]>(defaultPropImageUrls);
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

  const canSubmit = !submitting && Boolean(prompt.trim());
  const refSeconds = Math.min(6, Math.max(2, durationSeconds));

  async function onSubmit() {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipExtendAction({
        videoId,
        clipNumber,
        prompt: prompt.trim(),
        characterImageUrls,
        sceneImageUrl: sceneImageUrl || undefined,
        propImageUrls,
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
      setError(
        isEn ? "Failed to start Extend Video." : "啟動延展影片失敗，請重試",
      );
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
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                H3 Ref2VA Extend
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                Clip {clipNumber} → Clip {clipNumber + 1} ·{" "}
                {isEn ? "Extend +6s" : "無縫延展 +6s"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? `Encodes the last 39 frames as a protected latent prefix + last ${refSeconds}s video & references into MiniMax H3 ref2va, inserting a new 6s Clip ${clipNumber + 1}.`
                : `自動取最後 39 幀編碼為 Latent 前綴 ＋ 最後 ${refSeconds} 秒影片與角色／場景／道具參考圖送入 Vast MiniMax H3 ref2va，在後方插入新的 6 秒 Clip ${clipNumber + 1}。`}
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
          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <div className="space-y-1.5">
              <div className="overflow-hidden rounded-xl border border-accent-ink/15 bg-accent-ink/5">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="aspect-[9/16] max-h-48 w-full bg-black object-contain"
                />
              </div>
              <p className="text-center text-[11px] font-semibold text-muted">
                {isEn
                  ? `Last 39f Latent + ${refSeconds}s Ref`
                  : `最後 39 幀 Latent + ${refSeconds}s 參考`}
              </p>
            </div>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="font-display text-xs font-bold">
                  {isEn
                    ? "Continuation Action & Camera Prompt"
                    : "接下來 6 秒的動作與運鏡描述"}
                </span>
                <textarea
                  rows={3}
                  value={prompt}
                  disabled={submitting}
                  onChange={(ev) => setPrompt(ev.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. She turns toward the camera with a warm smile, lifts the coffee cup, and the camera slowly dollies in..."
                      : "例如：主角轉身面向鏡頭微笑並舉起咖啡杯，鏡頭緩慢向前推近…"
                  }
                  className="w-full rounded-xl border border-accent-ink/20 px-3 py-2 text-sm focus:border-accent-ink focus:outline-none"
                />
              </label>

              {/* Character References */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold">
                    {isEn
                      ? `Character Ref (${characterImageUrls.length}/6)`
                      : `角色參考圖 (${characterImageUrls.length}/6)`}
                  </span>
                  {characterImageUrls.length < 6 ? (
                    <BrandUploadButton
                      label={isEn ? "+ Add Character Ref" : "+ 新增角色圖"}
                      accept="image/png,image/jpeg,image/webp"
                      disabled={submitting}
                      onUploaded={(asset) => {
                        if (asset.kind === "image") {
                          setCharacterImageUrls((prev) =>
                            prev.includes(asset.url) ? prev : [...prev, asset.url].slice(0, 6),
                          );
                        }
                      }}
                      onError={setError}
                    />
                  ) : null}
                </div>
                {characterImageUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {characterImageUrls.map((url) => (
                      <div
                        key={url}
                        className="relative h-14 w-14 overflow-hidden rounded-lg border border-accent-ink/20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setCharacterImageUrls((prev) => prev.filter((item) => item !== url))
                          }
                          className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/75 text-[10px] font-bold text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    {isEn ? "None (uses video frames only)" : "未附角色圖（僅依賴前段影片）"}
                  </p>
                )}
              </div>

              {/* Scene Reference */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold">
                    {isEn ? "Scene Ref (optional)" : "場景參考圖（可選）"}
                  </span>
                  <BrandUploadButton
                    label={
                      sceneImageUrl
                        ? isEn
                          ? "Replace Scene Ref"
                          : "更換場景圖"
                        : isEn
                          ? "+ Add Scene Ref"
                          : "+ 新增場景圖"
                    }
                    accept="image/png,image/jpeg,image/webp"
                    disabled={submitting}
                    onUploaded={(asset) => {
                      if (asset.kind === "image") {
                        setSceneImageUrl(asset.url);
                      }
                    }}
                    onError={setError}
                  />
                </div>
                {sceneImageUrl ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-accent-ink/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sceneImageUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSceneImageUrl("")}
                        className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/75 text-[10px] font-bold text-white"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Props / Product References */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold">
                    {isEn
                      ? `Props / Product Ref (${propImageUrls.length}/4)`
                      : `道具／產品參考圖 (${propImageUrls.length}/4)`}
                  </span>
                  {propImageUrls.length < 4 ? (
                    <BrandUploadButton
                      label={isEn ? "+ Add Prop Ref" : "+ 新增道具圖"}
                      accept="image/png,image/jpeg,image/webp"
                      disabled={submitting}
                      onUploaded={(asset) => {
                        if (asset.kind === "image") {
                          setPropImageUrls((prev) =>
                            prev.includes(asset.url) ? prev : [...prev, asset.url].slice(0, 4),
                          );
                        }
                      }}
                      onError={setError}
                    />
                  ) : null}
                </div>
                {propImageUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {propImageUrls.map((url) => (
                      <div
                        key={url}
                        className="relative h-14 w-14 overflow-hidden rounded-lg border border-accent-ink/20"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setPropImageUrls((prev) => prev.filter((item) => item !== url))
                          }
                          className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/75 text-[10px] font-bold text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
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
              {isEn
                ? `Extend → Clip ${clipNumber + 1}`
                : `延展產生 Clip ${clipNumber + 1}`}{" "}
              · {teleportCost({ durationSeconds: 6 })}
            </span>
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
