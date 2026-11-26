"use client";

// Style transfer card. Clicking it opens the image-model dialog; Run uses that choice.

import { useState, type MouseEvent } from "react";
import { Handle, Position } from "@xyflow/react";
import { Download, Loader2, Maximize2, Play, RotateCcw, Trash2 } from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import type { OutdatedReason } from "@/service/canvas/core/stale-outputs";
import {
  STYLE_TRANSFER_IMAGE_MODEL_KEY,
  readStyleTransferModelId,
  styleTransferImageModels,
} from "@/service/canvas/core/style-transfer";
import { CanvasDownloadButton } from "@/app/app/canvas/canvas-download-button";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";
import {
  OutdatedBanner,
  OutdatedPreviewTag,
  PreviousResultTag,
  OUTDATED_BADGE_CLASS,
  outdatedBadgeText,
} from "@/app/app/canvas/nodes/outdated-notice";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import { StyleTransferModelDialog } from "@/app/app/canvas/nodes/style-transfer-model-dialog";
import "@/app/app/canvas/nodes/model-node-running.css";

type Props = {
  id: string;
  data: CanvasNodeData;
  selected: boolean;
  spec: CanvasModelSpec;
  catalog: readonly CanvasModelSpec[];
  locale: string;
  projectTitle: string;
  isFlowRunning: boolean;
  incomingCount: number;
  outdated?: OutdatedReason;
  onUpdateNodeData: (nodeId: string, patch: Partial<CanvasNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onRunNode: (nodeId: string) => void;
  onOpenLightbox: (item: { url: string; kind: "image"; title?: string }) => void;
};

export function StyleTransferNodeCard({
  id,
  data,
  selected,
  spec,
  catalog,
  locale,
  projectTitle,
  isFlowRunning,
  incomingCount,
  outdated,
  onUpdateNodeData,
  onDeleteNode,
  onRunNode,
  onOpenLightbox,
}: Props) {
  const [modelOpen, setModelOpen] = useState(false);
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const status = data.status ?? "idle";
  const isBusy = status === "queued" || status === "running";
  const displayName = canvasModelDisplayName(spec, locale);
  const selectedModelId = readStyleTransferModelId({ id, type: "model", position: { x: 0, y: 0 }, data });
  const chosen = selectedModelId
    ? styleTransferImageModels(catalog).find((item) => item.id === selectedModelId) ??
      findCanvasModel(selectedModelId, catalog)
    : undefined;
  const chosenOk = Boolean(chosen && styleTransferImageModels(catalog).some((item) => item.id === chosen.id));
  const imageWired = incomingCount > 0;
  const missing: string[] = [];
  if (!imageWired) missing.push(isZh ? "圖片" : "Image");
  if (!chosenOk) missing.push(isZh ? "圖片模型" : "Image model");
  const canRun = !isBusy && !isFlowRunning && missing.length === 0;
  const isRerun = status === "completed" && Boolean(data.outputUrl?.trim()) && !outdated;
  const outputColor = PORT_COLOR_MAP.image;
  const portLabel = isZh ? spec.inputs[0]?.labels["zh-Hant"] ?? "輸入圖片" : spec.inputs[0]?.labels.en ?? "Image";

  // Clicks on Run, delete, or a port stay on that control. Anywhere else opens the model dialog.
  function onCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, input, textarea, select, .react-flow__handle")) return;
    setModelOpen(true);
  }

  function chooseModel(modelId: string) {
    onUpdateNodeData(id, {
      toolParams: { ...(data.toolParams ?? {}), [STYLE_TRANSFER_IMAGE_MODEL_KEY]: modelId },
    });
    setModelOpen(false);
  }

  const statusBadge = outdated
    ? { text: outdatedBadgeText(isZh), cls: OUTDATED_BADGE_CLASS }
    : status === "running" || status === "queued"
      ? {
          text: isZh ? (status === "queued" ? "排隊中" : "生成中") : status === "queued" ? "Queued" : "Running",
          cls: "border-[#c6f24b]/40 bg-[#c6f24b]/15 text-[#c6f24b]",
        }
      : status === "completed"
        ? { text: isZh ? "完成" : "Done", cls: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300" }
        : status === "failed"
          ? { text: isZh ? "失敗" : "Failed", cls: "border-rose-400/40 bg-rose-500/15 text-rose-300" }
          : null;

  return (
    <div
      data-style-transfer-node
      onClick={onCardClick}
      className={`relative w-[312px] cursor-pointer rounded-[16px] border bg-[#12161f]/95 shadow-[0_18px_42px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all ${
        isBusy
          ? "canvas-model-running border-2"
          : status === "failed"
            ? `border-2 border-rose-500/80 ${selected ? "ring-2 ring-rose-500/30" : ""}`
            : selected
              ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/20"
              : "border-[#252c3b] hover:border-[#3a455c]"
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/7 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CanvasModelLogo providerModelId={spec.providerModelId} className="h-4 w-4" />
            <span className="truncate text-[12.5px] font-bold text-white">{displayName}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="rounded-full bg-white/7 px-1.5 py-0.5 text-white/70">
              {isZh ? "Scro 工具" : "Scro Tool"}
            </span>
            {statusBadge ? (
              <span className={`ml-auto rounded-full border px-1.5 py-0.5 font-semibold ${statusBadge.cls}`}>
                {statusBadge.text}
              </span>
            ) : null}
          </div>
        </div>
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

      <div className="border-b border-white/6 py-2">
        <div className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]">
          <Handle
            type="target"
            id="image"
            position={Position.Left}
            style={{
              width: 11,
              height: 11,
              backgroundColor: imageWired ? outputColor : "#12161f",
              border: `2px solid ${outputColor}`,
              left: -6,
            }}
          />
          <span className="flex items-center gap-1.5 text-white/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: outputColor }} />
            <span>{portLabel}</span>
            <span className="text-[9.5px] font-semibold text-amber-300/90">*</span>
          </span>
          <span className="text-[10px] text-white/45">
            {imageWired ? (isZh ? "已連" : "Wired") : isZh ? "未連接" : "Not connected"}
          </span>
        </div>
        <p className="px-3.5 pt-1 text-[10px] leading-snug text-white/40">
          {isZh ? "可接圖片、角色，或其他圖片節點" : "Connect an image, a character, or any image node"}
        </p>
      </div>

      <div className="space-y-2.5 p-3">
        <button
          type="button"
          data-style-transfer-choice={chosenOk ? chosen?.id : ""}
          onClick={() => setModelOpen(true)}
          className="nodrag flex w-full cursor-pointer items-center gap-2 rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-left transition hover:border-[#c6f24b]/50"
        >
          {chosen ? (
            <CanvasModelLogo providerModelId={chosen.providerModelId} className="h-5 w-5 shrink-0" />
          ) : (
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-dashed border-white/20 text-[10px] text-white/40">
              +
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] text-white/40">{isZh ? "圖片模型" : "Image model"}</span>
            <span className={`block truncate text-[12px] font-semibold ${chosenOk ? "text-white" : "text-amber-200"}`}>
              {chosenOk && chosen
                ? canvasModelDisplayName(chosen, locale)
                : isZh
                  ? "點擊選擇模型"
                  : "Click to choose a model"}
            </span>
          </span>
        </button>

        {outdated ? <OutdatedBanner reason={outdated} isZh={isZh} /> : null}
        {status === "failed" && data.lastError ? (
          <p className="line-clamp-3 text-[11px] leading-4 text-rose-300">{data.lastError}</p>
        ) : null}

        <button
          type="button"
          disabled={!canRun}
          onClick={() => onRunNode(id)}
          title={missing.length > 0 ? `${isZh ? "缺少：" : "Missing: "}${missing.join(", ")}` : undefined}
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

        {data.outputUrl ? (
          <div
            className={`relative overflow-hidden rounded-[10px] border bg-black/50 ${
              outdated ? "border-amber-400/40 opacity-70" : "border-white/10"
            }`}
          >
            {outdated ? <OutdatedPreviewTag isZh={isZh} /> : null}
            {isBusy ? <PreviousResultTag isZh={isZh} /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.outputUrl} alt={displayName} className="max-h-[200px] w-full object-cover" />
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenLightbox({ url: data.outputUrl!, kind: "image", title: displayName })}
                className="nodrag cursor-pointer rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
                title={isZh ? "放大預覽" : "Expand"}
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <CanvasDownloadButton
                url={data.outputUrl}
                project={projectTitle}
                title={displayName}
                kind="image"
                className="rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
              >
                <Download className="h-3 w-3" />
              </CanvasDownloadButton>
            </div>
          </div>
        ) : null}
      </div>

      <Handle
        type="source"
        id="output"
        position={Position.Right}
        style={{
          width: 13,
          height: 13,
          backgroundColor: outputColor,
          border: "2px solid #0b0e13",
        }}
      />

      {modelOpen ? (
        <StyleTransferModelDialog
          catalog={catalog}
          locale={locale}
          selectedModelId={chosenOk ? selectedModelId : undefined}
          onCancel={() => setModelOpen(false)}
          onSelect={chooseModel}
        />
      ) : null}
    </div>
  );
}
