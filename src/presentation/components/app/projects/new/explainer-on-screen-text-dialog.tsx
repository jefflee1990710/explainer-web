"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import { ExplainerArtisticFontGrid } from "./explainer-artistic-font-grid";

export type ExplainerOnScreenTextDialogProps = {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedStyleId: string;
  onStyleIdChange: (styleId: string) => void;
  coverage: "hook" | "all";
  onCoverageChange: (coverage: "hook" | "all") => void;
  // Diagram explainers cannot turn writing off. The font grid stays required.
  required?: boolean;
};

export function ExplainerOnScreenTextDialog({
  open,
  onClose,
  enabled,
  onEnabledChange,
  selectedStyleId,
  onStyleIdChange,
  coverage,
  onCoverageChange,
  required = false,
}: ExplainerOnScreenTextDialogProps) {
  const { t, locale } = useI18n();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isEn = locale === "en";
  const active = required || enabled;

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/60 p-4 z-[999]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--studio-line)] px-6 py-4 shrink-0">
          <div>
            <h2 id={titleId} className="text-base font-bold tracking-tight">
              {isEn ? "AI On-Screen Text & Typography" : "AI 畫面藝術字 · On-Screen Text"}
            </h2>
            <p className="text-xs text-[var(--studio-muted)] mt-0.5">
              {isEn
                ? "Auto-detects safe empty space (SAM-3 face avoidance) and paints artistic titles"
                : "自動偵測畫面純淨空白區（SAM-3 嚴格避開人臉），生成無縫羽化藝術字"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--studio-muted)] hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)] transition"
            aria-label={t("common.close")}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {required ? (
            <div className="rounded-xl border border-[var(--studio-line)] bg-[var(--studio-canvas)] p-4">
              <p className="text-sm font-semibold">
                {isEn ? "On-screen explanation is required" : "畫面解釋文字一定要有"}
              </p>
              <p className="mt-1 text-xs text-[var(--studio-muted)]">
                {isEn
                  ? "Every clip keeps the animated elements, a written explanation in the font below, and the voiceover. You cannot turn this off."
                  : "每個分鏡都保留動畫元素、用下面的藝術字寫上解釋，再加上旁白。不能選關閉。"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--studio-line)] bg-[var(--studio-canvas)] p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onEnabledChange(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-neutral-600 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[var(--studio-teal)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                </label>
                <div>
                  <span className="text-sm font-semibold">
                    {isEn ? "Enable On-Screen Text" : "啟用畫面藝術字"}
                  </span>
                  <p className="text-xs text-[var(--studio-muted)]">
                    {enabled
                      ? isEn
                        ? "Automatically added to video without manual editor steps"
                        : "生成後自動貼合進影片，無需進編輯器手動加入"
                      : isEn
                        ? "Keep scene visuals clean with no added title graphics"
                        : "影片保持純淨畫面，不自動疊加藝術字卡"}
                  </p>
                </div>
              </div>
              {enabled ? (
                <div className="flex shrink-0 items-center self-start rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-1 sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onCoverageChange("hook")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      coverage === "hook"
                        ? "bg-[var(--studio-fill)] text-[var(--studio-ink)] shadow-sm"
                        : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                    }`}
                  >
                    {isEn ? "Hook Title Only" : "僅第 1 鏡頭 Hook (推薦)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCoverageChange("all")}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      coverage === "all"
                        ? "bg-[var(--studio-fill)] text-[var(--studio-ink)] shadow-sm"
                        : "text-[var(--studio-muted)] hover:text-[var(--studio-ink)]"
                    }`}
                  >
                    {isEn ? "All Clips" : "全部分鏡字卡"}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <ExplainerArtisticFontGrid
            selectedStyleId={selectedStyleId}
            onStyleIdChange={onStyleIdChange}
            disabled={!active}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--studio-line)] px-6 py-3.5 shrink-0 bg-[var(--studio-canvas)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-xs font-bold bg-[var(--studio-ink)] text-[var(--studio-panel)] hover:opacity-90 transition"
          >
            {isEn ? "Done" : "完成"}
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
