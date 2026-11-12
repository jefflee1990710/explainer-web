"use client";

import { useEffect, useId } from "react";
import { DialogBackdrop } from "@/presentation/components/dialog-backdrop";
import { useI18n } from "@/presentation/components/i18n-provider";
import type { OpenCutAddClipMode } from "./opencut-add-clip-types";
import {
  SparklesIcon,
  Video01Icon,
  UserSharingIcon,
  Location01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function OpenCutAddClipSelectionDialog({
  open,
  defaultInsertAt,
  totalClips,
  onSelectMode,
  onClose,
}: {
  open: boolean;
  defaultInsertAt: number;
  totalClips: number;
  onSelectMode: (mode: OpenCutAddClipMode) => void;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const isEn = locale === "en";
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const cards: Array<{
    mode: OpenCutAddClipMode;
    title: string;
    badge: string;
    cost: string;
    desc: string;
    icon: typeof SparklesIcon;
    color: string;
  }> = [
    {
      mode: "simple",
      title: isEn ? "Simple Video" : "簡易影片 (Simple Video)",
      badge: isEn ? "Fast Generation" : "提示詞生片",
      cost: "2 credits/s",
      desc: isEn
        ? "Fast text-to-video prompt generation with optional character face and style stills via ComfyUI ref2va."
        : "輸入提示詞快速生成單一分鏡，可搭配角色面部或參考圖片（ComfyUI ref2va / MiniMax H3）。",
      icon: SparklesIcon,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    {
      mode: "explainer",
      title: isEn ? "Explainer Director" : "AI 導演解說分鏡",
      badge: isEn ? "Voice & Continuity" : "腳本語音分鏡",
      cost: "2 credits/s",
      desc: isEn
        ? "Scripted story beat with voiceover, character locking, style direction, and auto on-screen text."
        : "輸入文案腳本與台詞，自動合成高傳真擬真語音、角色連續性與分鏡畫面。",
      icon: Video01Icon,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
      mode: "swap",
      title: isEn ? "Scro Swap" : "Scro Swap 角色動態換角",
      badge: isEn ? "Motion Replacement" : "動作替換",
      cost: "Jutsu",
      desc: isEn
        ? "Replace character motion from an existing clip or an uploaded video, creating a fresh clip."
        : "選取時間軸既有片段或上傳新影片，將人物肢體與動態置換為指定角色，新增為獨立分鏡。",
      icon: UserSharingIcon,
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
    {
      mode: "teleport",
      title: isEn ? "Teleport" : "Teleport AI 換場景",
      badge: isEn ? "Scene Background" : "背景穿越",
      cost: "Teleport",
      desc: isEn
        ? "Preserve subject motion while teleporting the background to a new environment or prompt plate."
        : "保留人物主體動作與語音，將背景無縫替換為全新場景圖片或提示詞背景，新增為獨立分鏡。",
      icon: Location01Icon,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
  ];

  return (
    <DialogBackdrop
      className="grid place-items-center bg-black/60 p-4 backdrop-blur-xs z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(ev) => ev.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--studio-line)] bg-[var(--studio-panel)] text-[var(--studio-ink)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--studio-line)] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent-ink px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-lime">
                Timeline + Clip
              </span>
              <h2 id={titleId} className="text-base font-bold text-[var(--studio-ink)]">
                {isEn ? "Add New Clip to Timeline" : "新增影片片段至時間軸"}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEn
                ? `Inserting at slot #${defaultInsertAt} (Total ${totalClips} clips). Choose your generation mode:`
                : `預計插入位置：第 ${defaultInsertAt} 段（目前共 ${totalClips} 段分鏡）。請選擇生成模式：`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-[var(--studio-fill)] hover:text-[var(--studio-ink)]"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
          </button>
        </div>

        {/* Mode cards */}
        <div className="grid gap-3 p-6 sm:grid-cols-2 overflow-y-auto">
          {cards.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => onSelectMode(card.mode)}
              className="group flex flex-col justify-between rounded-xl border border-[var(--studio-line)] bg-[var(--studio-fill)] p-4 text-left transition hover:border-[var(--studio-accent)] hover:bg-[var(--studio-surface,#18181b)] hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className={`flex size-8 items-center justify-center rounded-lg border ${card.color}`}>
                    <HugeiconsIcon icon={card.icon} className="size-4" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {card.badge}
                    </span>
                    <span className="rounded-full bg-accent-ink/10 px-2 py-0.5 text-[10px] font-semibold text-accent-ink">
                      {card.cost}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-sm text-[var(--studio-ink)] group-hover:text-accent-ink transition">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {card.desc}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-accent-ink opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition">
                <span>{isEn ? "Select" : "選擇"}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </DialogBackdrop>
  );
}
