import {
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";

export function ModelNodeCardRun(view: ModelNodeCardView) {
  const { id, onRunNode, isZh, isBusy, missingRequiredLabels, canRun, isRerun } = view;
  return (
    <>
  {/* Single-node Run CTA */}
  <button
      type="button"
      disabled={!canRun}
      onClick={() => onRunNode(id)}
      title={
        missingRequiredLabels.length > 0
          ? `${isZh ? "缺少必要輸入：" : "Missing required: "}${missingRequiredLabels.join(", ")}`
          : undefined
      }
      className={`nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-bold transition ${
        !canRun
          ? "cursor-not-allowed bg-white/8 text-white/40"
          : isRerun
            ? "border border-sky-400/40 bg-sky-500/12 text-sky-200 hover:bg-sky-500/20"
            : "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.2)] hover:brightness-105"
      }`}
    >
      {isBusy ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{isZh ? "執行中…" : "Running…"}</span>
        </>
      ) : isRerun ? (
        <>
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Re-run</span>
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Run</span>
        </>
      )}
    </button>
    </>
  );
}
