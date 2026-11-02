"use client";

import { useEffect, useId, useState } from "react";
import { applyClipTeleportAction } from "@/presentation/actions/opencut-clip-jutsu";
import { BrandUploadButton } from "@/presentation/components/app/projects/new/brand-upload-button";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicVideo } from "@/presentation/serialize";

/** Focused modal to apply Teleport scene relocation directly to one completed OpenEdit clip. */
export function OpenCutClipTeleportDialog({
  videoId,
  clipNumber,
  durationSeconds,
  videoUrl,
  onApplied,
  onClose,
}: {
  videoId: string;
  clipNumber: number;
  durationSeconds: number;
  videoUrl: string;
  onApplied: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const [sceneImageUrl, setSceneImageUrl] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const canSubmit =
    !submitting && (Boolean(sceneImageUrl) || Boolean(scenePrompt.trim()));

  async function onSubmit() {
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipTeleportAction({
        videoId,
        clipNumber,
        sceneImageUrl: sceneImageUrl || undefined,
        scenePrompt: scenePrompt.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      notifyTasksChanged();
      onApplied(res.project);
      onClose();
    } catch {
      setError(isEn ? "Failed to start Teleport." : "啟動 Teleport 失敗，請重試");
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
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                Teleport
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                Clip {clipNumber} · {isEn ? "Scene Relocate" : "Teleport 換場"} ({durationSeconds}s)
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Keep the person and motion from this clip, and relocate them into a new scene."
                : "保留呢段分鏡入面嘅人物同動作，換入新背景場景並自動替換片段。"}
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
            <div className="overflow-hidden rounded-xl border border-accent-ink/15 bg-accent-ink/5">
              <video
                src={videoUrl}
                controls
                playsInline
                className="aspect-[9/16] max-h-48 w-full bg-black object-contain"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-xs font-bold">
                    {isEn ? "Scene Photo (optional)" : "場景照片（可選）"}
                  </span>
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
                </div>
                {sceneImageUrl ? (
                  <div className="flex items-center gap-3 rounded-xl border border-accent-ink/20 bg-surface-hi/40 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sceneImageUrl}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <span className="flex-1 text-xs font-semibold">
                      {isEn
                        ? "Photo sets the location; text below adjusts mood."
                        : "以照片為地點；下方文字可微調氣氛。"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSceneImageUrl("")}
                      className="rounded-lg border border-accent-ink/20 px-2.5 py-1 text-xs font-semibold"
                    >
                      {isEn ? "Remove" : "移除"}
                    </button>
                  </div>
                ) : null}
              </div>

              <label className="block space-y-1.5">
                <span className="font-display text-xs font-bold">
                  {isEn ? "Scene or Mood Prompt" : "場景描述或氣氛文字"}
                </span>
                <textarea
                  rows={3}
                  value={scenePrompt}
                  disabled={submitting}
                  onChange={(ev) => setScenePrompt(ev.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. Cozy Tokyo izakaya at rainy night, warm neon reflections..."
                      : "例如：雨夜東京居酒屋、溫暖霓虹反光…"
                  }
                  className="w-full rounded-xl border border-accent-ink/20 px-3 py-2 text-sm focus:border-accent-ink focus:outline-none"
                />
              </label>
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
            {isEn ? "Apply Teleport" : "套用 Teleport 換場"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
