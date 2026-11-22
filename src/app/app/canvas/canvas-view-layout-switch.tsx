"use client";

// Segmented Editor / Agent switch in the canvas top bar.

import { Bot, PanelLeft } from "lucide-react";
import type { CanvasViewLayout } from "@/app/app/canvas/canvas-view-layout";

export function CanvasViewLayoutSwitch({
  locale,
  layout,
  onChange,
}: {
  locale: string;
  layout: CanvasViewLayout;
  onChange: (layout: CanvasViewLayout) => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const options: { id: CanvasViewLayout; label: string; icon: typeof PanelLeft }[] = [
    { id: "editor", label: isZh ? "編輯" : "Editor", icon: PanelLeft },
    { id: "agent", label: isZh ? "助理" : "Agent", icon: Bot },
  ];

  return (
    <div
      role="group"
      aria-label={isZh ? "版面" : "View layout"}
      className="flex h-8 items-center rounded-[10px] border border-white/10 bg-white/5 p-0.5"
    >
      {options.map((option) => {
        const active = layout === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-semibold transition ${
              active
                ? "bg-[#c6f24b] text-[#11141b]"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
