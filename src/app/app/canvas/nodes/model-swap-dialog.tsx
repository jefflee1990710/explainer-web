"use client";

// Model node: pick another model of the same kind (video for video, image for image).

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";
import type { CanvasModelSpec } from "@/service/canvas/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/model-names";
import { swapCandidates } from "@/service/canvas/model-swap";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";

type Props = {
  current: CanvasModelSpec;
  catalog: readonly CanvasModelSpec[];
  // Input handles that currently have a wire, so each option can say which ones it would drop.
  wiredHandles: readonly string[];
  locale: string;
  onCancel: () => void;
  onSelect: (modelId: string) => void;
};

export function ModelSwapDialog({ current, catalog, wiredHandles, locale, onCancel, onSelect }: Props) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return swapCandidates(current, catalog).filter(
      (spec) =>
        !q ||
        canvasModelDisplayName(spec, locale).toLowerCase().includes(q) ||
        spec.providerModelId.toLowerCase().includes(q),
    );
  }, [current, catalog, query, locale]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-[860px] max-w-full flex-col rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{isZh ? "更換模型" : "Change model"}</div>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {isZh
            ? `目前是 ${canvasModelDisplayName(current, locale)}。換成同類型的模型，能沿用的連線會保留。`
            : `Currently ${canvasModelDisplayName(current, locale)}. Pick a model of the same kind; wires it accepts are kept.`}
        </p>

        <label className="mt-3 flex items-center gap-2 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-white/40" />
          <ComposedInput
            autoFocus
            value={query}
            onValue={setQuery}
            placeholder={isZh ? "搜尋模型" : "Search models"}
            className="w-full bg-transparent text-[12px] text-white/90 placeholder:text-white/30 focus:outline-none"
          />
        </label>

        <div className="nowheel mt-3 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {options.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-white/45">
              {isZh ? "沒有其他同類型的模型" : "No other models of this kind"}
            </div>
          ) : (
            options.map((spec) => {
              const inputIds = new Set(spec.inputs.map((p) => p.id));
              const dropped = current.inputs.filter((p) => wiredHandles.includes(p.id) && !inputIds.has(p.id));
              const active = picked === spec.id;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => setPicked(spec.id)}
                  onDoubleClick={() => onSelect(spec.id)}
                  className={`relative flex min-h-[104px] cursor-pointer flex-col items-start gap-2 rounded-[12px] border p-3 text-left transition ${
                    active ? "border-[#c6f24b]/60 bg-[#c6f24b]/10" : "border-white/8 bg-white/3 hover:border-white/20"
                  }`}
                >
                  {active ? <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#c6f24b]" /> : null}
                  <CanvasModelLogo providerModelId={spec.providerModelId} className="h-7 w-7 shrink-0" />
                  <span className="line-clamp-2 pr-4 text-[12px] font-semibold leading-snug text-white/90">
                    {canvasModelDisplayName(spec, locale)}
                  </span>
                  {dropped.length > 0 ? (
                    <span className="mt-auto line-clamp-2 text-[10.5px] leading-snug text-amber-300/80">
                      {isZh ? "會移除連線：" : "Drops wires: "}
                      {dropped.map((p) => (isZh ? p.labels["zh-Hant"] : p.labels.en)).join(", ")}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            {isZh ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={!picked}
            onClick={() => picked && onSelect(picked)}
            className="cursor-pointer rounded-lg bg-[#c6f24b] px-3 py-1.5 text-xs font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isZh ? "更換" : "Change"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
