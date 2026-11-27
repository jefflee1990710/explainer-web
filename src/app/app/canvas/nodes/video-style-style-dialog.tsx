"use client";

// Dark dialog for picking the visual style applied to the source video.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search } from "lucide-react";
import { ComposedInput } from "@/app/app/canvas/nodes/composed-text-field";
import { videoStyleOptions } from "@/app/app/canvas/nodes/video-style-options";

type Props = {
  selectedId: string;
  isZh: boolean;
  onCancel: () => void;
  onSelect: (styleId: string) => void;
};

export function VideoStyleStyleDialog({ selectedId, isZh, onCancel, onSelect }: Props) {
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
    return videoStyleOptions(isZh).filter(
      (style) => !q || style.label.toLowerCase().includes(q) || style.id.includes(q),
    );
  }, [isZh, query]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? "選擇風格" : "Choose style"}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-[720px] max-w-full flex-col rounded-2xl border border-white/15 bg-[#10141c] p-5 text-white shadow-2xl"
      >
        <div className="text-sm font-semibold">{isZh ? "選擇風格" : "Choose style"}</div>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          {isZh
            ? "輸出會用這個畫風重畫輸入影片，動作和構圖保持不變。"
            : "The output redraws the input video in this look and keeps the action and framing."}
        </p>

        <label className="mt-3 flex items-center gap-2 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-white/40" />
          <ComposedInput
            autoFocus
            value={query}
            onValue={setQuery}
            placeholder={isZh ? "搜尋風格" : "Search styles"}
            className="w-full bg-transparent text-[12px] text-white/90 placeholder:text-white/30 focus:outline-none"
          />
        </label>

        <div className="nowheel mt-3 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {options.map((style) => {
            const active = picked === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setPicked(style.id)}
                onDoubleClick={() => onSelect(style.id)}
                className={`relative flex min-h-[72px] cursor-pointer flex-col items-start rounded-[12px] border p-3 text-left transition ${
                  active ? "border-[#c6f24b]/60 bg-[#c6f24b]/10" : "border-white/8 bg-white/3 hover:border-white/20"
                }`}
              >
                {active ? <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#c6f24b]" /> : null}
                <span className="pr-4 text-[12px] font-semibold leading-snug text-white/90">{style.label}</span>
              </button>
            );
          })}
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
            {isZh ? "使用這個風格" : "Use style"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
