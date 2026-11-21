"use client";

// Explainer planner controls: free plan button, planning state, script summary, re-plan.

import { useState } from "react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { readPlannerParams } from "@/service/canvas/explainer-planner";
import { ExplainerReplanDialog } from "@/app/app/canvas/nodes/explainer-replan-dialog";

type Props = {
  data: CanvasNodeData;
  isZh: boolean;
  disabled: boolean;
  missingLabels: string[];
  liveExpandedCount: number;
  onPlan: () => void;
};

export function ExplainerPlannerPanel({
  data,
  isZh,
  disabled,
  missingLabels,
  liveExpandedCount,
  onPlan,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { planStatus, planError, planSummary } = readPlannerParams({ data });
  const planning = planStatus === "planning";
  const canPlan = !disabled && !planning && missingLabels.length === 0;

  const handleClick = () => {
    if (liveExpandedCount > 0) setConfirmOpen(true);
    else onPlan();
  };

  return (
    <div className="space-y-2">
      {planStatus === "failed" && planError ? (
        <div className="flex items-start gap-1.5 rounded-[10px] border border-rose-500/35 bg-rose-500/10 p-2 text-[11px] text-rose-200">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          <span className="line-clamp-3">{planError}</span>
        </div>
      ) : null}

      {planSummary ? (
        <pre className="nodrag nowheel max-h-[140px] overflow-y-auto rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2 font-sans text-[10.5px] leading-relaxed whitespace-pre-wrap text-white/75">
          {planSummary}
        </pre>
      ) : null}

      <button
        type="button"
        disabled={!canPlan}
        onClick={handleClick}
        title={
          missingLabels.length > 0
            ? `${isZh ? "缺少必要輸入：" : "Missing required: "}${missingLabels.join(", ")}`
            : undefined
        }
        className={`nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-bold transition ${
          canPlan
            ? "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.2)] hover:brightness-105"
            : "cursor-not-allowed bg-white/8 text-white/40"
        }`}
      >
        {planning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{isZh ? "規劃中…" : "Planning…"}</span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {liveExpandedCount > 0
                ? isZh
                  ? "重新規劃（免費）"
                  : "Re-plan (free)"
                : isZh
                  ? "規劃分鏡（免費）"
                  : "Plan storyboard (free)"}
            </span>
          </>
        )}
      </button>

      <ExplainerReplanDialog
        open={confirmOpen}
        isZh={isZh}
        expandedCount={liveExpandedCount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onPlan();
        }}
      />
    </div>
  );
}
