import { GitBranch, Loader2, Play, RotateCcw } from "lucide-react";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";
import { CharacterOutfitPendingNotice } from "@/app/app/canvas/nodes/character-outfit-pending-notice";
import { characterOutfitPendingMessage } from "@/service/canvas/core/character-wardrobe";

export function ModelNodeCardRun(view: ModelNodeCardView) {
  const { id, onRunNode, onRunNodeWithDependents, isZh, isBusy, missingRequiredLabels, pendingOutfits, canRun, isRerun } =
    view;
  const missingTitle =
    missingRequiredLabels.length > 0
      ? `${isZh ? "缺少必要輸入：" : "Missing required: "}${missingRequiredLabels.join(", ")}`
      : pendingOutfits.length > 0
        ? characterOutfitPendingMessage(pendingOutfits, isZh)
        : undefined;
  const onlyLabel = isBusy
    ? isZh
      ? "執行中…"
      : "Running…"
    : isRerun
      ? isZh
        ? "只重新執行此節點"
        : "Re-run this node only"
      : isZh
        ? "只執行此節點"
        : "Run this node only";
  // Visible label stays one line on a ~300px card; title keeps the full action.
  const withDependentsLabel = isZh ? "執行此節點與下游" : "Run this and downstream";
  const withDependentsTitle = isZh
    ? "執行此節點和所有依賴它的節點"
    : "Run this node and every node that depends on it";

  return (
    <div className="flex flex-col gap-1.5">
      <CharacterOutfitPendingNotice pending={pendingOutfits} isZh={isZh} />
      <button
        type="button"
        disabled={!canRun}
        onClick={() => onRunNode(id)}
        title={missingTitle}
        className={`nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-center text-[12px] font-bold leading-tight transition ${
          !canRun
            ? "cursor-not-allowed bg-white/8 text-white/40"
            : isRerun
              ? "border border-sky-400/40 bg-sky-500/12 text-sky-200 hover:bg-sky-500/20"
              : "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.2)] hover:brightness-105"
        }`}
      >
        {isBusy ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : isRerun ? (
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
        )}
        <span>{onlyLabel}</span>
      </button>
      <button
        type="button"
        disabled={!canRun}
        onClick={() => onRunNodeWithDependents(id)}
        title={missingTitle ?? withDependentsTitle}
        className={`nodrag flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2 text-center text-[12px] font-bold leading-tight transition ${
          !canRun
            ? "cursor-not-allowed border-white/10 bg-white/5 text-white/35"
            : "border-sky-400/40 bg-sky-500/12 text-sky-200 hover:bg-sky-500/20"
        }`}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0" />
        <span>{withDependentsLabel}</span>
      </button>
    </div>
  );
}
