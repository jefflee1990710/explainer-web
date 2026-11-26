import {
  Pencil,
  Trash2,
} from "lucide-react";
import { canSwapModel } from "@/service/canvas/core/model-swap";
import { ModelSwapDialog } from "@/app/app/canvas/nodes/model-swap-dialog";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";

export function ModelNodeCardHeader(view: ModelNodeCardView) {
  const { id, catalog, locale, isFlowRunning, onDeleteNode, onSwapModel, swapOpen, setSwapOpen, isZh, spec, displayName, incomingByHandle, isBusy, categoryLabel, statusBadge } = view;
  return (
    <>
<div className="flex items-start justify-between gap-2 border-b border-white/7 px-3.5 py-2.5">
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-1.5">
      <CanvasModelLogo
        providerModelId={spec.providerModelId}
        className="h-4 w-4"
      />
      <span className="truncate text-[12.5px] font-bold text-white">
        {displayName}
      </span>
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
      <span className="rounded-full bg-white/7 px-1.5 py-0.5 text-white/70">
        {categoryLabel}
      </span>
      {spec.runtimeStatus ? (
        <span className="inline-flex items-center gap-1 text-white/55">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              spec.runtimeStatus === "warm" || spec.runtimeStatus === "cached"
                ? "bg-emerald-400"
                : spec.runtimeStatus === "unavailable"
                  ? "bg-rose-400"
                  : "bg-amber-400"
            }`}
          />
          {spec.runtimeStatus}
        </span>
      ) : null}
      {statusBadge ? (
        <span
          className={`ml-auto rounded-full border px-1.5 py-0.5 font-semibold ${statusBadge.cls}`}
        >
          {statusBadge.text}
        </span>
      ) : null}
    </div>
  </div>
  <div className="flex shrink-0 items-center gap-0.5">
    {canSwapModel(spec) ? (
      <button
        type="button"
        disabled={isBusy || isFlowRunning}
        onClick={() => setSwapOpen(true)}
        title={isZh ? "更換模型" : "Change model"}
        className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    ) : null}
    <button
      type="button"
      disabled={isBusy}
      onClick={() => onDeleteNode(id)}
      title={isBusy ? (isZh ? "執行中無法刪除" : "Cannot delete while running") : "Delete node"}
      className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
</div>
{swapOpen ? (
  <ModelSwapDialog
    current={spec}
    catalog={catalog}
    wiredHandles={[...incomingByHandle.keys()]}
    locale={locale}
    onCancel={() => setSwapOpen(false)}
    onSelect={(modelId) => {
      setSwapOpen(false);
      onSwapModel(id, modelId);
    }}
  />
) : null}
    </>
  );
}
