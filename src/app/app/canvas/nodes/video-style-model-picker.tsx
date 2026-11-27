"use client";

// Picks the video model that will restyle the connected clip. Same layout as the model swap dialog.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import { videoStyleTransferModelChoices } from "@/service/canvas/catalog/video-style-transfer";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";

type Props = {
  catalog: readonly CanvasModelSpec[];
  selectedId: string;
  locale: string;
  onCancel: () => void;
  onSelect: (modelId: string) => void;
};

export function VideoStyleModelPicker({ catalog, selectedId, locale, onCancel, onSelect }: Props) {
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(selectedId);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videoStyleTransferModelChoices(catalog).filter(
      (spec) =>
        !q ||
        canvasModelDisplayName(spec, locale).toLowerCase().includes(q) ||
        spec.providerModelId.toLowerCase().includes(q),
    );
  }, [catalog, locale, query]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? "選擇影片模型" : "Choose video model"}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-[860px] max-w-full flex-col rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{isZh ? "選擇影片模型" : "Choose video model"}</div>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {isZh
            ? "Run 會把輸入影片和所選風格交給這個模型的現有影片任務。"
            : "Run sends the input video and the chosen style through this model's existing video job."}
        </p>

        <label className="mt-3 flex items-center gap-2 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-white/40" />
          <ComposedInput
            autoFocus
            value={query}
            onValue={setQuery}
            placeholder={isZh ? "搜尋影片模型" : "Search video models"}
            className="w-full bg-transparent text-[12px] text-white/90 placeholder:text-white/30 focus:outline-none"
          />
        </label>

        <div className="nowheel mt-3 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
          {options.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-white/45">
              {isZh ? "沒有可用的影片模型" : "No video models available"}
            </div>
          ) : (
            options.map((spec) => {
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
            {isZh ? "使用這個模型" : "Use model"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
