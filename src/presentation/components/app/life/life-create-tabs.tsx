"use client";

import { LIFE_CREATE_MODES, type LifeCreateMode } from "@/model/life-shot-kind";

const TAB_META: Record<
  LifeCreateMode,
  {
    title: string;
    badge: string;
    requiredSummary: string;
    optionalSummary: string;
    description: string;
  }
> = {
  "replace-person": {
    title: "人物替換",
    badge: "Replace Person",
    requiredSummary: "上傳含人物照片",
    optionalSummary: "圈選人物、角色姿勢 (Pose)、補充替換說明",
    description:
      "上傳含人物的照片並圈選要替換的人物，AI 將替換為所選角色的臉孔、髮型與預設服裝，預設保留原圖人物姿勢。",
  },
  "scene-place": {
    title: "放入場景",
    badge: "Add to Scene",
    requiredSummary: "上傳或搜尋場景照片",
    optionalSummary: "場景融入描述、角色姿勢 (Pose)、位置塗鴉標註",
    description:
      "上傳或搜尋一張場景照片，AI 會將所選角色自然融入場景環境中，並匹配現場光影與透視比例。",
  },
  "post-template": {
    title: "貼文類型與姿勢",
    badge: "Post Type & Pose",
    requiredSummary: "選擇貼文類型 (Post Type)",
    optionalSummary: "角色姿勢 (Pose)、背景場景照片、補充細節說明",
    description:
      "以貼文類型作為構圖與氛圍指南；若未上傳背景場景照片，AI 將自動根據貼文類型建構真實場景。",
  },
};

// Top tab switcher and mode field summary for the 3 photo creation methods in /app/life.
export function LifeCreateTabs({
  value,
  disabled,
  onChange,
}: {
  value: LifeCreateMode;
  disabled?: boolean;
  onChange: (mode: LifeCreateMode) => void;
}) {
  const activeMeta = TAB_META[value];

  return (
    <div className="shrink-0 border-b border-accent-ink/12 bg-paper/95 px-4 py-3">
      <div
        role="tablist"
        aria-label="照片建立模式"
        className="grid grid-cols-3 gap-1.5 rounded-xl bg-accent-ink/6 p-1"
      >
        {LIFE_CREATE_MODES.map((mode, idx) => {
          const active = value === mode;
          const meta = TAB_META[mode];
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => onChange(mode)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg px-2 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "bg-accent-ink text-lime shadow-xs"
                  : "text-foreground/75 hover:bg-paper/70 hover:text-foreground"
              }`}
            >
              <span className="text-xs font-bold leading-tight">
                {idx + 1}. {meta.title}
              </span>
              <span
                className={`text-[10px] font-medium leading-tight ${
                  active ? "text-paper/80" : "text-muted"
                }`}
              >
                {meta.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mode description & Required/Optional field summary */}
      <div className="mt-2.5 flex flex-col gap-1.5 rounded-xl border border-accent-ink/10 bg-accent-ink/3 px-3 py-2">
        <p className="text-[11px] leading-relaxed text-foreground/90">
          {activeMeta.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            必填：{activeMeta.requiredSummary}
          </span>
          <span className="text-accent-ink/25">|</span>
          <span className="inline-flex items-center gap-1 text-muted">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-ink/35" />
            選填：{activeMeta.optionalSummary}
          </span>
        </div>
      </div>
    </div>
  );
}
