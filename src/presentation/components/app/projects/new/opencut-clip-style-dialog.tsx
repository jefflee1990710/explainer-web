"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { localizeBilingualLabel } from "@/opencut/i18n/use-opencut-i18n";
import { applyClipStyleAction } from "@/presentation/actions/opencut-clip-style";
import { notifyTasksChanged } from "@/presentation/components/app/tasks/task-signal";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { Spinner } from "@/presentation/components/spinner";
import type { PublicStyle, PublicVideo } from "@/presentation/serialize";
import { STYLES } from "@/service/style/catalog";
import { localizedStyleName } from "@/util/style-i18n";

const FALLBACK_STYLES: PublicStyle[] = STYLES.map((s) => ({
  id: s.id,
  name: s.name,
  description: s.description,
  canvasColor: s.canvasColor,
  previewUrl: s.previewUrl,
  isCustom: false,
}));

/** Focused modal to switch the visual style of one selected clip in OpenCut and regenerate it. */
export function OpenCutClipStyleDialog({
  videoId,
  clipNumber,
  durationSeconds,
  currentStyleId,
  styles,
  onApplied,
  onClose,
}: {
  videoId: string;
  clipNumber: number;
  durationSeconds: number;
  currentStyleId: string;
  styles: PublicStyle[];
  onApplied: (project: PublicVideo) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  const availableStyles = useMemo(
    () => (styles.length > 0 ? styles.filter((s) => !s.isCustom) : FALLBACK_STYLES),
    [styles],
  );

  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    currentStyleId || availableStyles[0]?.id || "realistic",
  );
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

  const canSubmit = !submitting && Boolean(selectedStyleId);

  async function onSubmit() {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const res = await applyClipStyleAction({
        videoId,
        clipNumber,
        styleId: selectedStyleId,
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
        isEn
          ? "Failed to change clip style. Please try again."
          : "更換分鏡風格失敗，請重試",
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
        className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-accent-ink bg-white shadow-[8px_8px_0_0_#12141c]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-accent-ink/10 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-accent-ink px-2.5 py-0.5 font-display text-[11px] font-bold uppercase tracking-wider text-lime">
                {isEn ? "Visual Style" : "視覺風格"}
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold">
                Clip {clipNumber} · {isEn ? "Change Video Style" : "更換分鏡視覺風格"} (
                {durationSeconds}s)
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {isEn
                ? "Select a visual style for this clip. Its keyframes and video will regenerate in the chosen style."
                : "揀選呢段分鏡要套用嘅視覺風格，確認後會自動以新風格重畫場景圖並重新產生片段影片。"}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label={isEn ? "Close dialog" : "關閉視窗"}
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-accent-ink/15 text-base font-bold text-muted transition hover:border-accent-ink hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableStyles.map((style) => {
              const active = style.id === selectedStyleId;
              const isCurrent = style.id === currentStyleId;
              const label = localizeBilingualLabel(
                style.isCustom ? style.name : localizedStyleName(style.id) || style.name,
                locale,
              );
              const desc = style.description;
              return (
                <button
                  key={style.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setSelectedStyleId(style.id);
                    setError("");
                  }}
                  className={`style-option group flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 text-left transition ${
                    active
                      ? "border-[var(--studio-teal)] bg-[var(--studio-cyan-soft)] shadow-xs"
                      : "border-accent-ink/15 bg-white hover:border-accent-ink/50"
                  }`}
                >
                  <div
                    className="relative aspect-[16/10] w-full overflow-hidden bg-accent-ink/5"
                    style={{ backgroundColor: style.canvasColor || "#f4f4f5" }}
                  >
                    {style.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={style.previewUrl}
                        alt={label}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : null}
                    {isCurrent ? (
                      <span className="absolute top-2 left-2 rounded-md bg-accent-ink/85 px-2 py-0.5 text-[10px] font-bold text-lime">
                        {isEn ? "Current" : "目前風格"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col justify-between gap-1 p-3">
                    <div className="font-display text-xs font-bold text-foreground">
                      {label}
                    </div>
                    {desc ? (
                      <p className="line-clamp-2 text-[11px] leading-snug text-muted">
                        {desc}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-accent-ink/10 bg-paper px-6 py-4">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-accent-ink/20 bg-white px-4 py-2 text-xs font-bold text-foreground transition hover:border-accent-ink"
          >
            {isEn ? "Cancel" : "取消"}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onSubmit()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-accent-ink px-5 py-2 text-xs font-bold text-lime transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Spinner className="h-3.5 w-3.5" /> : null}
            <span>
              {submitting
                ? isEn
                  ? "Applying Style…"
                  : "套用風格並重產中…"
                : isEn
                  ? "Apply Style & Regenerate"
                  : "套用風格並重產片段"}
            </span>
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
