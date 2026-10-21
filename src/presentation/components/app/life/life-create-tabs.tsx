"use client";

import { LIFE_CREATE_MODES, type LifeCreateMode } from "@/model/life-shot-kind";

const TAB_META: Record<
  LifeCreateMode,
  { title: string; badge: string; description: string }
> = {
  "replace-person": {
    title: "人物替換",
    badge: "Replace Person",
    description:
      "上傳含人物的照片，在圖上點擊或塗抹圈選要替換的人物（未圈選則替換主要人物），AI 會換上角色的臉孔、髮型與預設服裝，並保留原圖姿勢（亦可選填更換姿勢）。",
  },
  "scene-place": {
    title: "放入場景",
    badge: "Add to Scene",
    description:
      "上傳或搜尋一張場景照片，AI 會將所選角色自然融入場景中；可選填輸入文字描述角色如何出現在場景內，以及選填角色姿勢。",
  },
  "post-template": {
    title: "貼文類型與姿勢",
    badge: "Post Type & Pose",
    description:
      "選擇貼文類型（Post Type）作為構圖與氛圍指南，搭配選填姿勢（Pose）；可選填上傳場景照片作為背景，若未上傳則自動依貼文類型生成背景。",
  },
};

// Top tab switcher and mode description for the 3 photo creation methods in /app/life.
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
    <div className="shrink-0 border-b border-accent-ink/10 bg-paper/95 px-3.5 py-2.5">
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
      <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted">
        {activeMeta.description}
      </p>
    </div>
  );
}
