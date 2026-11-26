"use client";

// Left drawer for /app/canvas. Tabs run down the left edge; the list fills the right.
// Collapsed, it becomes an icon column:
// 1) Models (generators, edit, cutout, upscale)
// 2) Director (Talking Head Director, Explainer, Scro Swap, Teleport)
// 3) Tools (Prompt, Setting, Life Photo, Poster, and FFmpeg)
// 4) Assets (library upload, or the Outfit tab: saved looks + system defaults)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film, Loader2, Music, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, Upload } from "lucide-react";
import { CanvasAddButton } from "@/app/app/canvas/canvas-add-button";
import { CanvasSessionRailName } from "@/app/app/canvas/canvas-session-rail-name";
import { CanvasAssetStudios } from "@/app/app/canvas/canvas-asset-studios";
import type { PublicCharacter } from "@/presentation/serialize";
import { CanvasOutfitTab } from "@/app/app/canvas/canvas-outfit-tab";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import { CanvasSidebarIcons, type CanvasSidebarTab } from "@/app/app/canvas/canvas-sidebar-icons";
import { CanvasSidebarNav, type AssetNavSection } from "@/app/app/canvas/canvas-sidebar-nav";
import {
  CanvasPromptTool,
  canvasPromptToolVisible,
} from "@/app/app/canvas/canvas-prompt-tool";
import {
  CanvasSettingsTool,
  canvasSettingsToolVisible,
} from "@/app/app/canvas/canvas-settings-tool";
import type {
  CanvasModelCategory,
  CanvasModelSpec,
} from "@/service/canvas/catalog/model-catalog";
import type {
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
} from "@/model/canvas-dto";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import { CATEGORY_LABELS } from "@/app/app/canvas/nodes/port-colors";
import { CanvasModelTile } from "@/app/app/canvas/canvas-model-tile";

export { CANVAS_DRAG_MODEL_MIME } from "@/app/app/canvas/canvas-model-tile";
export const CANVAS_DRAG_ASSET_MIME = "application/x-scro-canvas-asset";

const SIDEBAR_WIDTH_KEY = "scro.canvasSidebar.width";
const SIDEBAR_HIDDEN_KEY = "scro.canvasSidebar.hidden";
// The left rail holds the four tabs. The rest of the width is the list.
const SIDEBAR_MIN_WIDTH = 340;
const SIDEBAR_MAX_WIDTH = 520;
const SIDEBAR_DEFAULT_WIDTH = 340;

// Directed video tools. Life Photo and Poster stay on the Tools tab.
const DIRECTOR_MODEL_IDS = new Set([
  "scro:talking-head",
  "scro:explainer",
  "scro:swap",
  "scro:teleport",
]);

// Models hold generators plus edit, cutout, and upscale. Tools are the remaining Scro pipelines and FFmpeg.
const MODEL_CATEGORIES: CanvasModelCategory[] = [
  "image",
  "video",
  "audio",
  "editing",
  "segmentation",
  "upscale",
];
const TOOL_CATEGORIES: CanvasModelCategory[] = ["scro-tool", "ffmpeg"];
const TILE_GRID = "grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(5.25rem,1fr))]";

type SidebarSection = {
  key: string;
  label: string;
  models: readonly CanvasModelSpec[];
  showPrompt: boolean;
  showSetting: boolean;
};

// A typed query matches the display name, provider, model id, or category label.
function nodeMatchesQuery(spec: CanvasModelSpec, query: string, locale: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const labels = CATEGORY_LABELS[spec.category];
  if (
    spec.name.toLowerCase().includes(q) ||
    canvasModelDisplayName(spec, locale).toLowerCase().includes(q) ||
    spec.provider.toLowerCase().includes(q) ||
    spec.providerModelId.toLowerCase().includes(q) ||
    spec.category.toLowerCase().includes(q) ||
    labels["zh-Hant"].toLowerCase().includes(q) ||
    labels.en.toLowerCase().includes(q)
  ) {
    return true;
  }
  if (!DIRECTOR_MODEL_IDS.has(spec.id)) return false;
  if ("導演".includes(q)) return true;
  return q.length >= 3 && "director".includes(q);
}

export function CanvasSidebar({
  locale,
  collapsed = false,
  models,
  assets,
  isUploading,
  isRefreshingModels,
  onToggleCollapsed,
  onAddModel,
  onAddAsset,
  onAddPromptNode,
  onAddSettingsNode,
  onUploadFiles,
  onRefreshModels,
  creditUsd,
  subscribed,
  onCharacterCreated,
}: {
  locale: string;
  collapsed?: boolean;
  models: readonly CanvasModelSpec[];
  assets: CanvasLibraryAssetsResult;
  isUploading: boolean;
  isRefreshingModels: boolean;
  onToggleCollapsed?: () => void;
  onAddModel: (modelId: string) => void;
  onAddAsset: (asset: CanvasLibraryAsset) => void;
  onAddPromptNode: () => void;
  onAddSettingsNode: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onRefreshModels: () => void;
  creditUsd: number;
  subscribed: boolean;
  onCharacterCreated: (character: PublicCharacter) => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [tab, setTab] = useState<CanvasSidebarTab>("models");
  // null shows every Assets section. A value shows only that smaller category.
  const [assetSection, setAssetSection] = useState<AssetNavSection | null>(null);
  const [query, setQuery] = useState("");
  // null shows every group of the current tab. There is no "All" chip.
  const [category, setCategory] = useState<CanvasModelCategory | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [nodesHidden, setNodesHidden] = useState(false);
  const [motionReady, setMotionReady] = useState(false);
  const [resizing, setResizing] = useState(false);
  // First click selects a tile. Add to Canvas is the second click.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const addLabel = isZh ? "加入畫布" : "Add to Canvas";

  // Saved width and hide state are read after mount so server and client HTML match.
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    const savedHidden = window.localStorage.getItem(SIDEBAR_HIDDEN_KEY) === "1";
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    if (Number.isFinite(saved) && saved >= SIDEBAR_MIN_WIDTH) {
      setWidth(Math.min(SIDEBAR_MAX_WIDTH, saved));
    }
    if (savedHidden) setNodesHidden(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const frame = window.requestAnimationFrame(() => setMotionReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // A click outside a tile clears the selection so the overlay does not stay up.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-canvas-pick]")) return;
      setPickedKey(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Drag the right edge to resize the panel, same idea as the chat dock's top edge.
  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      setResizing(true);
      const startX = event.clientX;
      const startWidth = width;
      let latest = startWidth;
      const onMove = (move: PointerEvent) => {
        latest = Math.min(
          SIDEBAR_MAX_WIDTH,
          Math.max(SIDEBAR_MIN_WIDTH, startWidth + (move.clientX - startX)),
        );
        setWidth(latest);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setResizing(false);
        window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(latest)));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width],
  );

  // OpenRouter models lead each group. Mentalok only fills categories that have no
  // OpenRouter model (image edit, SAM cutout, upscale), so older graphs still run.
  const availableModels = useMemo(() => {
    const providerRank: Record<string, number> = {
      scro: 0,
      ffmpeg: 1,
      google: 2,
      openrouter: 2,
      minimax: 2,
      mentalok: 3,
    };
    const openRouterCategories = new Set(
      models.filter((spec) => spec.provider === "openrouter").map((spec) => spec.category),
    );
    return models
      .filter((spec) => !spec.hiddenInSidebar)
      .filter((spec) => spec.provider !== "mentalok" || !openRouterCategories.has(spec.category))
      .sort((a, b) => (providerRank[a.provider] ?? 9) - (providerRank[b.provider] ?? 9));
  }, [models]);
  const tabCategories = tab === "models" ? MODEL_CATEGORIES : TOOL_CATEGORIES;
  const listedModels = useMemo(() => {
    if (tab === "directors") {
      return availableModels.filter((spec) => DIRECTOR_MODEL_IDS.has(spec.id));
    }
    return availableModels.filter(
      (spec) =>
        tabCategories.includes(spec.category) &&
        (tab !== "tools" || !DIRECTOR_MODEL_IDS.has(spec.id)),
    );
  }, [availableModels, tab, tabCategories]);
  const modelCount = useMemo(
    () => availableModels.filter((spec) => MODEL_CATEGORIES.includes(spec.category)).length,
    [availableModels],
  );
  const visibleCategories = useMemo(() => {
    const present = new Set(listedModels.map((spec) => spec.category));
    return tabCategories.filter((cat) => present.has(cat));
  }, [listedModels, tabCategories]);

  // A chip from the other tab does not apply here, so the groups show instead.
  const activeCategory = category && visibleCategories.includes(category) ? category : null;
  const searching = query.trim().length > 0;
  const promptToolVisible = canvasPromptToolVisible(query, activeCategory !== null);
  const settingsToolVisible = canvasSettingsToolVisible(query, activeCategory !== null);
  // A query ignores the open tab and groups every matching node under its category.
  const searchSections = useMemo((): SidebarSection[] | null => {
    if (!searching) return null;
    const sections: SidebarSection[] = [];
    const directors = availableModels.filter(
      (spec) => DIRECTOR_MODEL_IDS.has(spec.id) && nodeMatchesQuery(spec, query, locale),
    );
    if (directors.length > 0) {
      sections.push({
        key: "directors",
        label: isZh ? "導演" : "Director",
        models: directors,
        showPrompt: false,
        showSetting: false,
      });
    }
    for (const cat of [...MODEL_CATEGORIES, ...TOOL_CATEGORIES]) {
      const models = availableModels.filter(
        (spec) =>
          spec.category === cat &&
          !DIRECTOR_MODEL_IDS.has(spec.id) &&
          nodeMatchesQuery(spec, query, locale),
      );
      const showPrompt = cat === "scro-tool" && canvasPromptToolVisible(query, false);
      const showSetting = cat === "scro-tool" && canvasSettingsToolVisible(query, false);
      if (models.length === 0 && !showPrompt && !showSetting) continue;
      sections.push({
        key: cat,
        label: isZh ? CATEGORY_LABELS[cat]["zh-Hant"] : CATEGORY_LABELS[cat].en,
        models,
        showPrompt,
        showSetting,
      });
    }
    return sections;
  }, [searching, availableModels, query, locale, isZh]);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listedModels.filter((spec) => {
      if (activeCategory && spec.category !== activeCategory) return false;
      if (!q) return true;
      return (
        spec.name.toLowerCase().includes(q) ||
        canvasModelDisplayName(spec, locale).toLowerCase().includes(q) ||
        spec.providerModelId.toLowerCase().includes(q) ||
        spec.category.toLowerCase().includes(q)
      );
    });
  }, [listedModels, query, activeCategory, locale]);

  const collapseLabel = isZh ? "只顯示圖示" : "Icons only";
  const hideNodesLabel = isZh ? "隱藏節點" : "Hide nodes";
  const showNodesLabel = isZh ? "顯示節點" : "Show nodes";
  const toggleNodes = () => {
    setNodesHidden((prev) => {
      window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, prev ? "0" : "1");
      return !prev;
    });
  };

  if (collapsed) {
    return (
      <CanvasSidebarIcons
        locale={locale}
        tab={tab}
        modelCount={modelCount}
        onTab={(next) => {
          setTab(next);
          setCategory(null);
          onToggleCollapsed?.();
        }}
        onExpand={() => onToggleCollapsed?.()}
      />
    );
  }

  const slide = motionReady && !resizing;

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col overflow-hidden border-r border-white/8 bg-[#0e121a]/95 ${slide ? "transition-[width] duration-300 ease-out motion-reduce:transition-none" : ""}`}
      style={{ width: nodesHidden ? 40 : width }}
    >
      <div
        className={`absolute inset-y-0 left-0 z-20 flex w-10 flex-col items-center bg-[#0e121a]/95 py-2 ${slide ? "transition-opacity duration-200 ease-out motion-reduce:transition-none" : ""} ${nodesHidden ? "opacity-100 delay-100" : "pointer-events-none opacity-0 delay-0"}`}
        aria-hidden={!nodesHidden}
        inert={nodesHidden ? undefined : true}
      >
        <button
          type="button"
          onClick={toggleNodes}
          aria-label={showNodesLabel}
          title={showNodesLabel}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/5 text-white/70 transition hover:border-white/20 hover:text-white"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <CanvasSessionRailName name={isZh ? "工具箱" : "Toolbox"} />
      </div>
      <div
        className={`flex h-full shrink-0 flex-col ${nodesHidden ? "pointer-events-none" : ""}`}
        style={{ width }}
        inert={nodesHidden ? true : undefined}
      >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onPointerDown={startResize}
        className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize hover:bg-[#c6f24b]/30"
      />
      {/* Search sits above the nav column and the tile column, and matches every node. */}
      <div className="border-b border-white/6 p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <ComposedInput
              type="text"
              value={query}
              onValue={setQuery}
              placeholder={isZh ? "搜尋節點…" : "Search nodes…"}
              className="h-8 w-full rounded-[9px] border border-white/10 bg-[#090c12] pr-2.5 pl-8 text-xs text-white placeholder:text-white/35 focus:border-[#c6f24b]/50 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onRefreshModels}
            disabled={isRefreshingModels}
            title={isZh ? "重新同步模型狀態與定價" : "Refresh live prices"}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/5 text-white/65 transition hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingModels ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={toggleNodes}
            aria-label={hideNodesLabel}
            title={hideNodesLabel}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-white/10 bg-white/5 text-white/65 transition hover:border-white/20 hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-row">
      {/* Kinds run down the left, with every category open. */}
      <CanvasSidebarNav
        isZh={isZh}
        tab={tab}
        modelCount={modelCount}
        modelCategories={MODEL_CATEGORIES.filter((cat) =>
          availableModels.some((spec) => spec.category === cat),
        )}
        toolCategories={TOOL_CATEGORIES.filter((cat) =>
          availableModels.some(
            (spec) => spec.category === cat && !DIRECTOR_MODEL_IDS.has(spec.id),
          ),
        )}
        activeCategory={tab === "models" || tab === "tools" ? activeCategory : null}
        assetSection={tab === "assets" ? assetSection : null}
        onSelectTab={(next) => {
          setTab(next);
          setCategory(null);
          setAssetSection(null);
        }}
        onSelectCategory={(next, cat) => {
          setTab(next);
          setCategory(cat);
          setAssetSection(null);
        }}
        onSelectAsset={(section) => {
          setTab("assets");
          setCategory(null);
          setAssetSection(section);
        }}
        onToggleCollapsed={onToggleCollapsed}
        collapseLabel={collapseLabel}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {searchSections ? (
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
          {searchSections.map((section) => (
            <div key={section.key} className="space-y-1.5">
              <p className="px-1 pt-2 text-[10px] font-bold tracking-wide text-white/40 uppercase first:pt-0">
                {section.label}
              </p>
              <div className={TILE_GRID}>
                {section.showPrompt ? (
                  <CanvasPromptTool
                    isZh={isZh}
                    selected={pickedKey === "prompt"}
                    addLabel={addLabel}
                    onSelect={() => setPickedKey("prompt")}
                    onAdd={() => {
                      onAddPromptNode();
                      setPickedKey(null);
                    }}
                  />
                ) : null}
                {section.showSetting ? (
                  <CanvasSettingsTool
                    isZh={isZh}
                    selected={pickedKey === "setting"}
                    addLabel={addLabel}
                    onSelect={() => setPickedKey("setting")}
                    onAdd={() => {
                      onAddSettingsNode();
                      setPickedKey(null);
                    }}
                  />
                ) : null}
                {section.models.map((spec) => (
                  <CanvasModelTile
                    key={spec.id}
                    spec={spec}
                    locale={locale}
                    selected={pickedKey === `model:${spec.id}`}
                    addLabel={addLabel}
                    onSelect={() => setPickedKey(`model:${spec.id}`)}
                    onAdd={() => {
                      onAddModel(spec.id);
                      setPickedKey(null);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          {searchSections.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/40">
              {isZh ? "找不到符合的節點" : "No matching nodes"}
            </p>
          ) : null}
        </div>
      ) : tab !== "assets" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Model list, grouped by kind when showing everything */}
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {tab === "tools" && (promptToolVisible || settingsToolVisible) ? (
              <div className={TILE_GRID}>
                {promptToolVisible ? (
                  <CanvasPromptTool
                    isZh={isZh}
                    selected={pickedKey === "prompt"}
                    addLabel={addLabel}
                    onSelect={() => setPickedKey("prompt")}
                    onAdd={() => {
                      onAddPromptNode();
                      setPickedKey(null);
                    }}
                  />
                ) : null}
                {settingsToolVisible ? (
                  <CanvasSettingsTool
                    isZh={isZh}
                    selected={pickedKey === "setting"}
                    addLabel={addLabel}
                    onSelect={() => setPickedKey("setting")}
                    onAdd={() => {
                      onAddSettingsNode();
                      setPickedKey(null);
                    }}
                  />
                ) : null}
              </div>
            ) : null}
            {(tab === "directors" || activeCategory
              ? [{ label: "", models: filteredModels }]
              : visibleCategories.map((cat) => ({
                  label: isZh ? CATEGORY_LABELS[cat]["zh-Hant"] : CATEGORY_LABELS[cat].en,
                  models: filteredModels.filter((spec) => spec.category === cat),
                }))
            ).map((section) => section.models.length === 0 ? null : (
              <div key={section.label || "flat"} className="space-y-1.5">
                {section.label ? (
                  <p className="px-1 pt-2 text-[10px] font-bold tracking-wide text-white/40 uppercase first:pt-0">
                    {section.label}
                  </p>
                ) : null}
                <div className={TILE_GRID}>
                  {section.models.map((spec) => (
                    <CanvasModelTile
                      key={spec.id}
                      spec={spec}
                      locale={locale}
                      selected={pickedKey === `model:${spec.id}`}
                      addLabel={addLabel}
                      onSelect={() => setPickedKey(`model:${spec.id}`)}
                      onAdd={() => {
                        onAddModel(spec.id);
                        setPickedKey(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            {filteredModels.length === 0 &&
            !(tab === "tools" && (promptToolVisible || settingsToolVisible)) ? (
              <p className="py-6 text-center text-xs text-white/40">
                {tab === "directors"
                  ? isZh
                    ? "找不到符合的導演"
                    : "No matching directors"
                  : isZh
                    ? "找不到符合的模型"
                    : "No matching models"}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {assetSection === "outfit" ? (
            <CanvasOutfitTab
              isZh={isZh}
              userOutfits={assets.outfits ?? []}
              dense={width >= 400}
              pickedKey={pickedKey}
              addLabel={addLabel}
              onSelect={(assetId) => setPickedKey(`outfit:${assetId}`)}
              onAddAsset={(asset) => {
                onAddAsset(asset);
                setPickedKey(null);
              }}
            />
          ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5">
          <CanvasAssetStudios
            isZh={isZh}
            creditUsd={creditUsd}
            subscribed={subscribed}
            onCreated={onCharacterCreated}
          />
          {/* Local file upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/mp4,audio/ogg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(e.target.files);
                e.target.value = "";
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-[#c6f24b]/40 bg-[#c6f24b]/6 px-3 py-4 text-center transition hover:border-[#c6f24b]/75 hover:bg-[#c6f24b]/10 disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#c6f24b]" />
            ) : (
              <Upload className="h-5 w-5 text-[#c6f24b]" />
            )}
            <span className="text-xs font-semibold text-white">
              {isUploading
                ? isZh
                  ? "上傳中…"
                  : "Uploading…"
                : isZh
                  ? "上傳圖片 / 影片 / 音訊"
                  : "Upload Image / Video / Audio"}
            </span>
            <span className="text-[10.5px] text-white/45">
              {isZh
                ? "也可直接把檔案拖放到畫布任何位置（≤15MB）"
                : "Or drop files anywhere on the canvas (≤15MB)"}
            </span>
          </button>

          {/* Scro Library sections. A left-rail category shows only that section. */}
          {assetSection === null || assetSection === "characters" ? (
          <AssetSection
            title={isZh ? "我的角色 Characters" : "Characters"}
            items={assets.characters}
            pickedKey={pickedKey}
            addLabel={addLabel}
            onSelect={(assetId) => setPickedKey(`asset:${assetId}`)}
            onAddAsset={(asset) => {
              onAddAsset(asset);
              setPickedKey(null);
            }}
            emptyText={isZh ? "尚無角色圖片" : "No character assets yet"}
          />
          ) : null}
          {assetSection === null || assetSection === "products" ? (
          <AssetSection
            title={isZh ? "我的產品 Products" : "Products"}
            items={assets.products}
            pickedKey={pickedKey}
            addLabel={addLabel}
            onSelect={(assetId) => setPickedKey(`asset:${assetId}`)}
            onAddAsset={(asset) => {
              onAddAsset(asset);
              setPickedKey(null);
            }}
            emptyText={isZh ? "尚無產品圖片" : "No product assets yet"}
          />
          ) : null}
          {assetSection === null || assetSection === "recent" ? (
          <AssetSection
            title={isZh ? "最近畫布產出 Recent" : "Recent Outputs"}
            items={assets.recentOutputs}
            pickedKey={pickedKey}
            addLabel={addLabel}
            onSelect={(assetId) => setPickedKey(`asset:${assetId}`)}
            onAddAsset={(asset) => {
              onAddAsset(asset);
              setPickedKey(null);
            }}
            emptyText={isZh ? "尚無生成紀錄" : "No recent canvas outputs"}
          />
          ) : null}
        </div>
          )}
        </div>
      )}
      </div>
      </div>
      </div>
    </aside>
  );
}

function AssetSection({
  title,
  items,
  emptyText,
  pickedKey,
  addLabel,
  onSelect,
  onAddAsset,
}: {
  title: string;
  items: readonly CanvasLibraryAsset[];
  emptyText: string;
  pickedKey: string | null;
  addLabel: string;
  onSelect: (assetId: string) => void;
  onAddAsset: (asset: CanvasLibraryAsset) => void;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-white/50">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="rounded-[10px] border border-white/6 bg-white/2 px-2.5 py-3 text-center text-[11px] text-white/35">
          {emptyText}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  CANVAS_DRAG_ASSET_MIME,
                  JSON.stringify(asset),
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              data-canvas-pick=""
              onClick={() => onSelect(asset.id)}
              className={`group relative cursor-grab overflow-hidden rounded-[10px] border bg-[#131823] transition hover:border-[#c6f24b]/60 active:cursor-grabbing ${
                pickedKey === `asset:${asset.id}` ? "border-[#c6f24b]" : "border-white/8"
              }`}
            >
              {pickedKey === `asset:${asset.id}` ? (
                <CanvasAddButton label={addLabel} onAdd={() => onAddAsset(asset)} />
              ) : null}
              {asset.mediaKind === "video" ? (
                <div className="relative grid aspect-[4/5] w-full place-items-center bg-black/50 text-violet-300">
                  <Film className="h-5 w-5" />
                </div>
              ) : asset.mediaKind === "audio" ? (
                <div className="relative grid aspect-[4/5] w-full place-items-center bg-amber-500/10 text-amber-300">
                  <Music className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#10141c]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div className="truncate bg-[#0c0f16]/90 px-1.5 py-1 text-[10px] font-medium text-white/80">
                {asset.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
