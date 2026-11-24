"use client";

// Left rail of the canvas sidebar. Models, Tools, and Assets keep their categories
// open; picking one filters the list on the right.

import type { ReactNode } from "react";
import { ChevronLeft, Clapperboard, Film, FolderHeart, Sparkles } from "lucide-react";
import type { CanvasSidebarTab } from "@/app/app/canvas/canvas-sidebar-icons";
import { CATEGORY_LABELS } from "@/app/app/canvas/nodes/port-colors";
import type { CanvasModelCategory } from "@/service/canvas/model-catalog";

export type AssetNavSection = "characters" | "products" | "recent" | "outfit";

const ASSET_SECTIONS: { id: AssetNavSection; zh: string; en: string }[] = [
  { id: "characters", zh: "角色", en: "Characters" },
  { id: "products", zh: "產品", en: "Products" },
  { id: "recent", zh: "最近", en: "Recent" },
  { id: "outfit", zh: "穿搭", en: "Outfit" },
];

export function CanvasSidebarNav({
  isZh,
  tab,
  modelCount,
  modelCategories,
  toolCategories,
  activeCategory,
  assetSection,
  onSelectTab,
  onSelectCategory,
  onSelectAsset,
  onToggleCollapsed,
  collapseLabel,
}: {
  isZh: boolean;
  tab: CanvasSidebarTab;
  modelCount: number;
  modelCategories: readonly CanvasModelCategory[];
  toolCategories: readonly CanvasModelCategory[];
  activeCategory: CanvasModelCategory | null;
  assetSection: AssetNavSection | null;
  onSelectTab: (tab: CanvasSidebarTab) => void;
  onSelectCategory: (tab: "models" | "tools", category: CanvasModelCategory | null) => void;
  onSelectAsset: (section: AssetNavSection | null) => void;
  onToggleCollapsed?: () => void;
  collapseLabel: string;
}) {
  const parents: {
    id: CanvasSidebarTab;
    label: string;
    icon: ReactNode;
  }[] = [
    {
      id: "models",
      label: isZh ? `模型 (${modelCount})` : `Models (${modelCount})`,
      icon: <Sparkles className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      id: "directors",
      label: isZh ? "導演" : "Director",
      icon: <Clapperboard className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      id: "tools",
      label: isZh ? "工具" : "Tools",
      icon: <Film className="h-3.5 w-3.5 shrink-0" />,
    },
    {
      id: "assets",
      label: isZh ? "素材庫" : "Assets",
      icon: <FolderHeart className="h-3.5 w-3.5 shrink-0" />,
    },
  ];

  return (
    <nav
      aria-label={isZh ? "側欄分頁" : "Sidebar tabs"}
      className="flex w-[8.25rem] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-white/8 p-1.5"
    >
      {parents.map((item) => {
        const open = tab === item.id;
        const childActive =
          (item.id === "models" || item.id === "tools") && activeCategory !== null
            ? true
            : item.id === "assets" && assetSection !== null;
        return (
          <div key={item.id} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (item.id === "models" || item.id === "tools") onSelectCategory(item.id, null);
                else if (item.id === "assets") onSelectAsset(null);
                else onSelectTab(item.id);
              }}
              className={parentClass(open && !childActive, open)}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
            {item.id === "models" ? (
              <ChildGroup>
                {modelCategories.map((cat) => (
                  <ChildButton
                    key={cat}
                    label={isZh ? CATEGORY_LABELS[cat]["zh-Hant"] : CATEGORY_LABELS[cat].en}
                    active={open && activeCategory === cat}
                    onClick={() => onSelectCategory("models", cat)}
                  />
                ))}
              </ChildGroup>
            ) : null}
            {item.id === "tools" ? (
              <ChildGroup>
                {toolCategories.map((cat) => (
                  <ChildButton
                    key={cat}
                    label={isZh ? CATEGORY_LABELS[cat]["zh-Hant"] : CATEGORY_LABELS[cat].en}
                    active={open && activeCategory === cat}
                    onClick={() => onSelectCategory("tools", cat)}
                  />
                ))}
              </ChildGroup>
            ) : null}
            {item.id === "assets" ? (
              <ChildGroup>
                {ASSET_SECTIONS.map((section) => (
                  <ChildButton
                    key={section.id}
                    label={isZh ? section.zh : section.en}
                    active={open && assetSection === section.id}
                    onClick={() => onSelectAsset(section.id)}
                  />
                ))}
              </ChildGroup>
            ) : null}
          </div>
        );
      })}
      {onToggleCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapseLabel}
          aria-expanded
          title={collapseLabel}
          className="mt-auto flex h-7 w-full cursor-pointer items-center justify-center rounded-[8px] text-white/55 transition hover:bg-white/8 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}
    </nav>
  );
}

function parentClass(selected: boolean, open: boolean): string {
  const tone = selected || open ? "text-[#c6f24b]" : "text-white/60 hover:text-white";
  return `flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-semibold transition ${tone}`;
}

// Subcategories sit in a short column under the open kind, sharing one left rule.
function ChildGroup({ children }: { children: ReactNode }) {
  return (
    <div className="ml-3 flex flex-col gap-0.5 border-l border-white/10 py-0.5 pl-1.5">
      {children}
    </div>
  );
}

function ChildButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer truncate px-2 py-1 text-left text-[11px] font-semibold transition ${
        active ? "text-[#c6f24b]" : "text-white/75 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
