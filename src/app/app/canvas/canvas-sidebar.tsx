"use client";

// Left drawer for /app/canvas. It stays on screen as a full-width panel or an icon column:
// 1) Models (generators, edit, cutout, upscale)
// 2) Tools (Scro pipelines and FFmpeg)
// 3) Assets (library upload, or the Outfit tab: saved looks + system defaults)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Film,
  FolderHeart,
  Loader2,
  Music,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { CanvasAddButton } from "@/app/app/canvas/canvas-add-button";
import { CanvasAssetStudios } from "@/app/app/canvas/canvas-asset-studios";
import { CanvasOutfitTab } from "@/app/app/canvas/canvas-outfit-tab";
import { CanvasSidebarIcons } from "@/app/app/canvas/canvas-sidebar-icons";
import {
  CanvasPromptTool,
  canvasPromptToolVisible,
} from "@/app/app/canvas/canvas-prompt-tool";
import {
  CanvasSettingsTool,
  canvasSettingsToolVisible,
  HAND_ADDED_SETTINGS_KINDS,
  type HandAddedSettingsKind,
} from "@/app/app/canvas/canvas-settings-tool";
import type {
  CanvasModelCategory,
  CanvasModelSpec,
} from "@/service/canvas/model-catalog";
import type {
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
} from "@/service/canvas/projects";
import { canvasModelDisplayName } from "@/service/canvas/model-names";
import { CATEGORY_LABELS } from "@/app/app/canvas/nodes/port-colors";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";

export const CANVAS_DRAG_MODEL_MIME = "application/x-scro-canvas-model";
export const CANVAS_DRAG_ASSET_MIME = "application/x-scro-canvas-asset";

const SIDEBAR_WIDTH_KEY = "scro.canvasSidebar.width";
// Wide enough for "Models (999)" on one line, beside Tools, Assets, and the collapse button.
const SIDEBAR_MIN_WIDTH = 280;
const SIDEBAR_MAX_WIDTH = 520;
const SIDEBAR_DEFAULT_WIDTH = 276;

// Models hold generators plus edit, cutout, and upscale. Tools are Scro pipelines and FFmpeg.
const MODEL_CATEGORIES: CanvasModelCategory[] = [
  "image",
  "video",
  "audio",
  "editing",
  "segmentation",
  "upscale",
];
const TOOL_CATEGORIES: CanvasModelCategory[] = ["scro-tool", "ffmpeg"];

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
  onAddSettingsNode: (kind: HandAddedSettingsKind) => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onRefreshModels: () => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [tab, setTab] = useState<"models" | "tools" | "assets">("models");
  const [assetPane, setAssetPane] = useState<"library" | "outfit">("library");
  const [query, setQuery] = useState("");
  // null shows every group of the current tab. There is no "All" chip.
  const [category, setCategory] = useState<CanvasModelCategory | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  // First click selects a tile. Add to Canvas is the second click.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const addLabel = isZh ? "加入畫布" : "Add to Canvas";

  // Saved width is read after mount so server and client HTML match.
  useEffect(() => {
    const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(saved) && saved >= SIDEBAR_MIN_WIDTH) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
      setWidth(Math.min(SIDEBAR_MAX_WIDTH, saved));
    }
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
  const tabCategories = tab === "tools" ? TOOL_CATEGORIES : MODEL_CATEGORIES;
  const listedModels = useMemo(
    () => availableModels.filter((spec) => tabCategories.includes(spec.category)),
    [availableModels, tabCategories],
  );
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
  const promptToolVisible = canvasPromptToolVisible(query, activeCategory !== null);
  const settingsTools = HAND_ADDED_SETTINGS_KINDS.filter((kind) =>
    canvasSettingsToolVisible(kind, query, activeCategory !== null),
  );

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

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r border-white/8 bg-[#0e121a]/95"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        onPointerDown={startResize}
        className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize hover:bg-[#c6f24b]/30"
      />
      {/* Models include image, video, audio, edit, cutout, and upscale. Tools are Scro and FFmpeg. */}
      <div className="flex items-center gap-1 border-b border-white/8 p-2">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => {
            setTab("models");
            setCategory(null);
          }}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-[11px] font-semibold transition ${
            tab === "models"
              ? "bg-[#c6f24b]/15 text-[#c6f24b] ring-1 ring-[#c6f24b]/35"
              : "text-white/60 hover:bg-white/6 hover:text-white"
          }`}
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          <span className="whitespace-nowrap">{isZh ? `模型 (${modelCount})` : `Models (${modelCount})`}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("tools");
            setCategory(null);
          }}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-[11px] font-semibold transition ${
            tab === "tools"
              ? "bg-[#c6f24b]/15 text-[#c6f24b] ring-1 ring-[#c6f24b]/35"
              : "text-white/60 hover:bg-white/6 hover:text-white"
          }`}
        >
          <Film className="h-3 w-3 shrink-0" />
          <span className="whitespace-nowrap">{isZh ? "工具" : "Tools"}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("assets")}
          className={`flex cursor-pointer items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-[11px] font-semibold transition ${
            tab === "assets"
              ? "bg-[#c6f24b]/15 text-[#c6f24b] ring-1 ring-[#c6f24b]/35"
              : "text-white/60 hover:bg-white/6 hover:text-white"
          }`}
        >
          <FolderHeart className="h-3 w-3 shrink-0" />
          <span className="whitespace-nowrap">{isZh ? "素材庫" : "Assets"}</span>
        </button>
        </div>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapseLabel}
            aria-expanded
            title={collapseLabel}
            className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-white/55 transition hover:bg-white/8 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {tab !== "assets" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Search & Refresh */}
          <div className="space-y-2 border-b border-white/6 p-2.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isZh ? "搜尋模型或供應商…" : "Search models…"}
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
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshingModels ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1">
              {visibleCategories.map((cat) => {
                const active = activeCategory === cat;
                const label = isZh ? CATEGORY_LABELS[cat]["zh-Hant"] : CATEGORY_LABELS[cat].en;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(active ? null : cat)}
                    className={`cursor-pointer rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition ${
                      active
                        ? "bg-[#c6f24b] text-[#11141b]"
                        : "bg-white/6 text-white/60 hover:bg-white/12 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model list, grouped by kind when showing everything */}
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {tab === "tools" && (promptToolVisible || settingsTools.length > 0) ? (
              <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(5.25rem,1fr))]">
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
                {settingsTools.map((kind) => (
                  <CanvasSettingsTool
                    key={kind}
                    isZh={isZh}
                    kind={kind}
                    selected={pickedKey === `settings:${kind}`}
                    addLabel={addLabel}
                    onSelect={() => setPickedKey(`settings:${kind}`)}
                    onAdd={(next) => {
                      onAddSettingsNode(next);
                      setPickedKey(null);
                    }}
                  />
                ))}
              </div>
            ) : null}
            {(activeCategory
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
                <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(5.25rem,1fr))]">
                  {section.models.map((spec) => (
                    <div
                      key={spec.id}
                      draggable
                      title={canvasModelDisplayName(spec, locale)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(CANVAS_DRAG_MODEL_MIME, spec.id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      data-canvas-pick=""
                      onClick={() => setPickedKey(`model:${spec.id}`)}
                      className={`group relative flex cursor-grab flex-col items-center gap-1.5 rounded-[10px] border bg-[#131823]/90 px-1 py-2 text-center transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing ${
                        pickedKey === `model:${spec.id}` ? "border-[#c6f24b]" : "border-white/8"
                      }`}
                    >
                      {pickedKey === `model:${spec.id}` ? (
                        <CanvasAddButton
                          label={addLabel}
                          onAdd={() => {
                            onAddModel(spec.id);
                            setPickedKey(null);
                          }}
                        />
                      ) : null}
                      <span className="grid h-8 w-8 place-items-center">
                        <CanvasModelLogo
                          providerModelId={spec.providerModelId}
                          className="h-7 w-7"
                        />
                      </span>
                      <span className="line-clamp-2 w-full text-[10px] leading-3 font-semibold text-white/90">
                        {canvasModelDisplayName(spec, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredModels.length === 0 &&
            !(tab === "tools" && (promptToolVisible || settingsTools.length > 0)) ? (
              <p className="py-6 text-center text-xs text-white/40">
                {isZh ? "找不到符合的模型" : "No matching models"}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex gap-1 border-b border-white/6 px-2.5 py-2">
            {(
              [
                { id: "library" as const, zh: "素材", en: "Library" },
                { id: "outfit" as const, zh: "穿搭", en: "Outfit" },
              ]
            ).map((pane) => {
              const active = assetPane === pane.id;
              return (
                <button
                  key={pane.id}
                  type="button"
                  onClick={() => setAssetPane(pane.id)}
                  className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-[#c6f24b] text-[#11141b]"
                      : "bg-white/6 text-white/60 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  {isZh ? pane.zh : pane.en}
                </button>
              );
            })}
          </div>
          {assetPane === "outfit" ? (
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
          <CanvasAssetStudios isZh={isZh} />
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

          {/* Scro Library sections */}
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
        </div>
          )}
        </div>
      )}
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
