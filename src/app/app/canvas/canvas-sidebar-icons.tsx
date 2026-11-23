"use client";

// Icon-only left drawer. Models, Tools, and Assets stay visible; the name shows on hover.

import { ChevronRight, Film, FolderHeart, Sparkles } from "lucide-react";
import { CanvasHoverHint } from "@/app/app/canvas/canvas-hover-hint";

const TILE =
  "grid h-10 w-10 cursor-pointer place-items-center rounded-[10px] border border-white/8 bg-[#131823] text-white/70 transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] hover:text-white";

export function CanvasSidebarIcons({
  locale,
  tab,
  modelCount,
  onTab,
  onExpand,
}: {
  locale: string;
  tab: "models" | "tools" | "assets";
  modelCount: number;
  onTab: (tab: "models" | "tools" | "assets") => void;
  onExpand: () => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const expandLabel = isZh ? "完整寬度" : "Full width";
  const tabs = [
    {
      id: "models" as const,
      label: isZh ? `模型 (${modelCount})` : `Models (${modelCount})`,
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: "tools" as const,
      label: isZh ? "工具" : "Tools",
      icon: <Film className="h-4 w-4" />,
    },
    {
      id: "assets" as const,
      label: isZh ? "素材庫" : "Assets",
      icon: <FolderHeart className="h-4 w-4" />,
    },
  ];

  return (
    <aside
      data-canvas-drawer="icons"
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-white/8 bg-[#0e121a]/95 py-2"
    >
      <CanvasHoverHint label={expandLabel}>
        <button
          type="button"
          onClick={onExpand}
          aria-label={expandLabel}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] bg-[#c6f24b]/15 text-[#c6f24b] transition hover:bg-[#c6f24b]/25"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </CanvasHoverHint>
      {tabs.map((item) => {
        const active = tab === item.id;
        return (
          <CanvasHoverHint key={item.id} label={item.label}>
            <button
              type="button"
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => onTab(item.id)}
              className={`${TILE} ${
                active ? "border-[#c6f24b]/50 bg-[#c6f24b]/15 text-[#c6f24b]" : ""
              }`}
            >
              {item.icon}
            </button>
          </CanvasHoverHint>
        );
      })}
    </aside>
  );
}
