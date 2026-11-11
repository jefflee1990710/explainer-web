"use client";

import { useEffect, useId } from "react";
import Image from "next/image";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import {
  SYSTEM_TEXT_STYLE_ORDER,
  systemTextStylePreview,
  type SubtitleLook,
} from "@/service/director/subtitle-look";

export type ExplainerOnScreenTextDialogProps = {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedStyleId: string;
  onStyleIdChange: (styleId: string) => void;
  coverage: "hook" | "all";
  onCoverageChange: (coverage: "hook" | "all") => void;
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Enable Switch & Coverage Mode */}
          <div className="rounded-xl border border-[var(--studio-line)] bg-[var(--studio-canvas)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onEnabledChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--studio-teal)]"></div>
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

            {/* Coverage Segmented Control (Approach C) */}
            {enabled ? (
              <div className="flex items-center rounded-lg border border-[var(--studio-line)] bg-[var(--studio-panel)] p-1 shrink-0 self-start sm:self-auto">
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

          {/* 13 Styles Visual Grid */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--studio-muted)]">
                {isEn ? "Select Artistic Typography Style" : "選擇藝術字款式風格"}
              </span>
              <span className="text-xs text-[var(--studio-muted)]">
                {SYSTEM_TEXT_STYLE_ORDER.length} {isEn ? "Styles" : "款風格"}
              </span>
            </div>

            <div
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 transition-opacity ${
                enabled ? "opacity-100" : "opacity-40 pointer-events-none"
              }`}
            >
              {SYSTEM_TEXT_STYLE_ORDER.map((styleId) => {
                const isSelected = selectedStyleId === styleId;
                const previewSrc = systemTextStylePreview(styleId as SubtitleLook);
                const styleName = t(`pickers.subtitleLook.${styleId}.label` as any) || styleId;
                const sublabel = t(`pickers.subtitleLook.${styleId}.sublabel` as any) || "";

                return (
                  <button
                    key={styleId}
                    type="button"
                    onClick={() => onStyleIdChange(styleId)}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition duration-150 ${
                      isSelected
                        ? "border-[var(--studio-teal)] ring-2 ring-[var(--studio-teal)]/40 bg-[var(--studio-fill)]"
                        : "border-[var(--studio-line)] hover:border-[var(--studio-muted)] bg-[var(--studio-canvas)]"
                    }`}
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40">
                      <Image
                        src={previewSrc}
                        alt={styleName}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition duration-200 group-hover:scale-105"
                      />
                      {isSelected ? (
                        <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--studio-teal)] text-black">
                          <svg
                            className="h-2.5 w-2.5"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                          </svg>
                        </div>
                      ) : null}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-bold text-[var(--studio-ink)] truncate">
                        {styleName}
                      </div>
                      <div className="text-[10px] text-[var(--studio-muted)] truncate">
                        {sublabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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
