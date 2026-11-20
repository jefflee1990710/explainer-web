"use client";

// Collapsible left drawer for /app/canvas with two tabs:
// 1) Models (16 Mentalok + 10 OpenRouter, searchable, filterable, draggable or click-to-add)
// 2) Assets (Local upload + Scro Characters, Products, and Recent Canvas Outputs)

import { useMemo, useRef, useState } from "react";
import {
  Film,
  FolderHeart,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { formatUsd } from "@/service/billing/usd";
import type {
  CanvasModelCategory,
  CanvasModelSpec,
} from "@/service/canvas/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";
import type {
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
} from "@/service/canvas/projects";
import { CATEGORY_LABELS } from "@/app/app/canvas/nodes/port-colors";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";

export const CANVAS_DRAG_MODEL_MIME = "application/x-scro-canvas-model";
export const CANVAS_DRAG_ASSET_MIME = "application/x-scro-canvas-asset";

const CATEGORIES: Array<"all" | CanvasModelCategory> = [
  "all",
  "image",
  "video",
  "editing",
  "segmentation",
  "upscale",
];

export function CanvasSidebar({
  locale,
  models,
  assets,
  isUploading,
  isRefreshingModels,
  onAddModel,
  onAddAsset,
  onUploadFiles,
  onRefreshModels,
}: {
  locale: string;
  models: readonly CanvasModelSpec[];
  assets: CanvasLibraryAssetsResult;
  isUploading: boolean;
  isRefreshingModels: boolean;
  onAddModel: (modelId: string) => void;
  onAddAsset: (asset: CanvasLibraryAsset) => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onRefreshModels: () => void;
}) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [tab, setTab] = useState<"models" | "assets">("models");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | CanvasModelCategory>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return models.filter((spec) => {
      if (category !== "all" && spec.category !== category) return false;
      if (!q) return true;
      return (
        spec.name.toLowerCase().includes(q) ||
        spec.providerModelId.toLowerCase().includes(q) ||
        spec.provider.toLowerCase().includes(q) ||
        spec.category.toLowerCase().includes(q)
      );
    });
  }, [models, query, category]);

  return (
    <aside className="flex h-full w-[276px] shrink-0 flex-col border-r border-white/8 bg-[#0e121a]/95">
      {/* Top 2-tab switch */}
      <div className="grid grid-cols-2 gap-1 border-b border-white/8 p-2">
        <button
          type="button"
          onClick={() => setTab("models")}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] py-1.5 text-xs font-semibold transition ${
            tab === "models"
              ? "bg-[#c6f24b]/15 text-[#c6f24b] ring-1 ring-[#c6f24b]/35"
              : "text-white/60 hover:bg-white/6 hover:text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{isZh ? `模型 (${models.length})` : `Models (${models.length})`}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("assets")}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-[10px] py-1.5 text-xs font-semibold transition ${
            tab === "assets"
              ? "bg-[#c6f24b]/15 text-[#c6f24b] ring-1 ring-[#c6f24b]/35"
              : "text-white/60 hover:bg-white/6 hover:text-white"
          }`}
        >
          <FolderHeart className="h-3.5 w-3.5" />
          <span>{isZh ? "素材庫" : "Assets"}</span>
        </button>
      </div>

      {tab === "models" ? (
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
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const label =
                  cat === "all"
                    ? isZh
                      ? "全部"
                      : "All"
                    : isZh
                      ? CATEGORY_LABELS[cat]["zh-Hant"]
                      : CATEGORY_LABELS[cat].en;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
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

          {/* Model list */}
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {filteredModels.map((spec) => {
              const price = estimateCanvasModelCostUsd(spec);
              const catText = isZh
                ? CATEGORY_LABELS[spec.category]["zh-Hant"]
                : CATEGORY_LABELS[spec.category].en;
              return (
                <div
                  key={spec.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(CANVAS_DRAG_MODEL_MIME, spec.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAddModel(spec.id)}
                  className="group cursor-grab rounded-[12px] border border-white/8 bg-[#131823]/90 p-2.5 transition hover:border-[#c6f24b]/50 hover:bg-[#171d2a] active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <CanvasModelLogo
                        providerModelId={spec.providerModelId}
                        className="h-4 w-4"
                      />
                      <span className="truncate text-xs font-bold text-white/95">
                        {spec.name}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#c6f24b]/12 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#c6f24b]">
                      {formatUsd(price)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="rounded-full bg-white/6 px-1.5 py-0.5 text-white/60">
                        {catText}
                      </span>
                      {spec.runtimeStatus ? (
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            spec.runtimeStatus === "warm" ||
                            spec.runtimeStatus === "cached"
                              ? "bg-emerald-400"
                              : spec.runtimeStatus === "unavailable"
                                ? "bg-rose-400"
                                : "bg-amber-400"
                          }`}
                          title={spec.runtimeStatus}
                        />
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-white/35 transition group-hover:text-[#c6f24b]">
                      <Plus className="h-3 w-3" />
                      {isZh ? "加入" : "Add"}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredModels.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">
                {isZh ? "找不到符合的模型" : "No matching models"}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2.5">
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
            onAddAsset={onAddAsset}
            emptyText={isZh ? "尚無角色圖片" : "No character assets yet"}
          />
          <AssetSection
            title={isZh ? "我的產品 Products" : "Products"}
            items={assets.products}
            onAddAsset={onAddAsset}
            emptyText={isZh ? "尚無產品圖片" : "No product assets yet"}
          />
          <AssetSection
            title={isZh ? "最近畫布產出 Recent" : "Recent Outputs"}
            items={assets.recentOutputs}
            onAddAsset={onAddAsset}
            emptyText={isZh ? "尚無生成紀錄" : "No recent canvas outputs"}
          />
        </div>
      )}
    </aside>
  );
}

function AssetSection({
  title,
  items,
  emptyText,
  onAddAsset,
}: {
  title: string;
  items: readonly CanvasLibraryAsset[];
  emptyText: string;
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
              onClick={() => onAddAsset(asset)}
              className="group relative cursor-grab overflow-hidden rounded-[10px] border border-white/8 bg-[#131823] transition hover:border-[#c6f24b]/60 active:cursor-grabbing"
            >
              {asset.mediaKind === "video" ? (
                <div className="relative grid aspect-[4/5] w-full place-items-center bg-black/50 text-violet-300">
                  <Film className="h-5 w-5" />
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
