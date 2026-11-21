"use client";

// Temporary card while an Explainer storyboard is being planned; replaced by the expanded nodes.

import { AlertCircle, Loader2, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { readPlannerParams } from "@/service/canvas/explainer-planner";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  selected: boolean;
  disabled: boolean;
  onPlan: () => void;
  onRemove: () => void;
};

export function ExplainerPlanningCard({ data, isZh, selected, disabled, onPlan, onRemove }: Props) {
  const { planStatus, planError } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const failed = planStatus === "failed";
  const topic = (data.prompt ?? "").trim();

  return (
    <div
      className={`w-[280px] rounded-[16px] border border-dashed bg-[#12161f]/90 p-3.5 text-white shadow-[0_18px_42px_rgba(0,0,0,0.45)] ${
        selected ? "border-[#c6f24b]" : failed ? "border-rose-500/50" : "border-[#c6f24b]/40"
      }`}
    >
      <div className="flex items-center gap-2">
        {planning ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#c6f24b]" />
        ) : failed ? (
          <AlertCircle className="h-4 w-4 text-rose-400" />
        ) : (
          <Sparkles className="h-4 w-4 text-[#c6f24b]" />
        )}
        <span className="text-[12.5px] font-bold">
          {planning
            ? isZh
              ? "正在規劃解說分鏡…"
              : "Planning explainer storyboard…"
            : failed
              ? isZh
                ? "分鏡規劃失敗"
                : "Storyboard planning failed"
              : isZh
                ? "解說分鏡尚未規劃"
                : "Explainer not planned yet"}
        </span>
      </div>

      <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-white/60">
        {topic || (isZh ? "（使用連線的主題）" : "(Uses the connected topic)")}
      </p>

      {planning ? (
        <p className="mt-2 text-[10.5px] text-white/45">
          {isZh
            ? "約需 1–3 分鐘，完成後會換成每段的靜幀、影片、配音和拼接節點。"
            : "About 1–3 minutes. This card turns into per-clip still, video, voice, and concat nodes."}
        </p>
      ) : null}

      {failed && planError ? (
        <p className="mt-2 line-clamp-3 rounded-[8px] bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
          {planError}
        </p>
      ) : null}

      {!planning ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onPlan}
            className="nodrag inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#c6f24b] px-3 py-1.5 text-[11.5px] font-bold text-[#11141b] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {failed ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {failed ? (isZh ? "重試（免費）" : "Retry (free)") : isZh ? "規劃分鏡（免費）" : "Plan (free)"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            title={isZh ? "移除" : "Remove"}
            className="nodrag cursor-pointer rounded-[10px] border border-white/10 px-2 text-white/55 transition hover:bg-white/8 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
