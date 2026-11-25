"use client";

// Assets → Outfit sub-tab: search the user's looks and every system default piece.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CanvasOutfitTile } from "@/app/app/canvas/canvas-outfit-list";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import type { CanvasLibraryAsset } from "@/service/canvas/projects";
import {
  listSystemDefaultOutfits,
  systemOutfitAsset,
  systemOutfitFallbackName,
  systemOutfitMatches,
  type OutfitPartFilter,
  type SystemOutfitRecord,
} from "@/service/canvas/system-outfits";
import { useI18n } from "@/presentation/components/i18n-provider";

const PAGE_SIZE = 48;

const PARTS: { id: OutfitPartFilter; zh: string; en: string }[] = [
  { id: "all", zh: "全部", en: "All" },
  { id: "hair", zh: "髮型", en: "Hair" },
  { id: "top", zh: "上衣", en: "Top" },
  { id: "pants", zh: "褲子", en: "Pants" },
  { id: "shoes", zh: "鞋子", en: "Shoes" },
  { id: "accessory", zh: "配件", en: "Accessory" },
];

function outfitName(t: (key: string) => string, row: SystemOutfitRecord): string {
  const key = `characters.look.options.${row.part}.${row.optionId}`;
  const label = t(key);
  return label === key ? systemOutfitFallbackName(row) : label;
}

function userOutfitMatches(asset: CanvasLibraryAsset, query: string, part: OutfitPartFilter): boolean {
  if (part !== "all" && asset.outfitPart !== part) return false;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${asset.name}\n${asset.outfitPrompt ?? ""}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function CanvasOutfitTab({
  isZh,
  userOutfits,
  dense = false,
  pickedKey,
  addLabel,
  onSelect,
  onAddAsset,
}: {
  isZh: boolean;
  userOutfits: readonly CanvasLibraryAsset[];
  // Wide sidebar: four columns, each card about half the two-column size.
  dense?: boolean;
  pickedKey: string | null;
  addLabel: string;
  onSelect: (assetId: string) => void;
  onAddAsset: (asset: CanvasLibraryAsset) => void;
}) {
  const { t } = useI18n();
  const catalog = useMemo(() => listSystemDefaultOutfits(), []);
  const [query, setQuery] = useState("");
  const [part, setPart] = useState<OutfitPartFilter>("all");
  const filterKey = `${part}|${query}`;

  const named = useMemo(
    () =>
      catalog.map((row) => {
        const name = outfitName(t, row);
        return { row, name, asset: systemOutfitAsset(row, name) };
      }),
    [catalog, t],
  );
  const mine = useMemo(
    () => userOutfits.filter((asset) => userOutfitMatches(asset, query, part)),
    [userOutfits, query, part],
  );
  const system = useMemo(
    () => named.filter((item) => systemOutfitMatches(item.row, item.name, query, part)),
    [named, query, part],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-white/6 p-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
          <ComposedInput
            type="search"
            value={query}
            onValue={setQuery}
            placeholder={isZh ? "搜尋穿搭…" : "Search outfits…"}
            className="h-8 w-full rounded-[9px] border border-white/10 bg-[#090c12] pr-2.5 pl-8 text-xs text-white placeholder:text-white/35 focus:border-[#c6f24b]/50 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {PARTS.map((item) => {
            const active = part === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPart(item.id)}
                className={`cursor-pointer rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition ${
                  active
                    ? "bg-[#c6f24b] text-[#11141b]"
                    : "bg-white/6 text-white/60 hover:bg-white/12 hover:text-white"
                }`}
              >
                {isZh ? item.zh : item.en}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {mine.length === 0 && system.length === 0 ? (
          <p className="rounded-[10px] border border-white/6 bg-white/2 px-2.5 py-3 text-center text-[11px] text-white/35">
            {isZh ? "找不到符合的穿搭" : "No matching outfits"}
          </p>
        ) : null}

        {mine.length > 0 ? (
          <section>
            <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-white/50">
              {isZh ? "我的穿搭" : "My outfits"}
            </h3>
            <div className={dense ? "grid grid-cols-4 gap-1" : "grid grid-cols-2 gap-1.5"}>
              {mine.map((asset) => (
                <CanvasOutfitTile
                  key={asset.id}
                  isZh={isZh}
                  asset={asset}
                  dense={dense}
                  selected={pickedKey === `outfit:${asset.id}`}
                  addLabel={addLabel}
                  onSelect={() => onSelect(asset.id)}
                  onAddAsset={onAddAsset}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className={mine.length > 0 ? "mt-4" : ""}>
          <h3 className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-white/50">
            {isZh ? `系統預設 (${system.length})` : `System defaults (${system.length})`}
          </h3>
          {system.length === 0 ? null : (
            <SystemOutfitGrid
              key={filterKey}
              isZh={isZh}
              dense={dense}
              pickedKey={pickedKey}
              addLabel={addLabel}
              onSelect={onSelect}
              items={system}
              onAddAsset={onAddAsset}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function SystemOutfitGrid({
  isZh,
  dense,
  pickedKey,
  addLabel,
  onSelect,
  items,
  onAddAsset,
}: {
  isZh: boolean;
  dense: boolean;
  pickedKey: string | null;
  addLabel: string;
  onSelect: (assetId: string) => void;
  items: readonly { asset: CanvasLibraryAsset }[];
  onAddAsset: (asset: CanvasLibraryAsset) => void;
}) {
  const [count, setCount] = useState(PAGE_SIZE);
  const visible = items.slice(0, count);
  return (
    <>
      <div className={dense ? "grid grid-cols-4 gap-1" : "grid grid-cols-2 gap-1.5"}>
        {visible.map((item) => (
          <CanvasOutfitTile
            key={item.asset.id}
            isZh={isZh}
            asset={item.asset}
            dense={dense}
            selected={pickedKey === `outfit:${item.asset.id}`}
            addLabel={addLabel}
            onSelect={() => onSelect(item.asset.id)}
            onAddAsset={onAddAsset}
          />
        ))}
      </div>
      {visible.length < items.length ? (
        <button
          type="button"
          onClick={() => setCount((current) => current + PAGE_SIZE)}
          className="mt-2 w-full cursor-pointer rounded-[10px] border border-white/10 bg-white/5 py-2 text-[11px] font-semibold text-white/70 transition hover:border-[#c6f24b]/50 hover:text-white"
        >
          {isZh
            ? `顯示更多（${visible.length} / ${items.length}）`
            : `Show more (${visible.length} / ${items.length})`}
        </button>
      ) : null}
    </>
  );
}
