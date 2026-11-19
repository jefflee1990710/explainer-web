"use client";

// All-in-one Model node card: typed input handles, inline prompt/params, live USD cost,
// single-node Run button, inline output preview, and downstream output handle.

import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { formatUsd } from "@/service/billing/usd";
import { findCanvasModel } from "@/service/canvas/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";
import {
  CATEGORY_LABELS,
  PORT_COLOR_MAP,
  useCanvasNodeActions,
} from "@/app/app/canvas/nodes/port-colors";

const ASPECT_OPTIONS = ["16:9", "9:16", "1:1", "3:4"] as const;
const RESOLUTION_OPTIONS = ["1k", "2k", "4k"] as const;

export function ModelNodeCard({
  id,
  data,
  selected,
}: NodeProps & { data: CanvasNodeData }) {
  const {
    catalog,
    edges,
    locale,
    isFlowRunning,
    onUpdateNodeData,
    onDeleteNode,
    onRunNode,
    onOpenLightbox,
  } = useCanvasNodeActions();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const spec = useMemo(
    () => (data.modelId ? findCanvasModel(data.modelId, catalog) : undefined),
    [catalog, data.modelId],
  );

  const incomingByHandle = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      if (edge.target === id && edge.targetHandle) {
        map.set(edge.targetHandle, (map.get(edge.targetHandle) ?? 0) + 1);
      }
    }
    return map;
  }, [edges, id]);

  if (!spec) {
    return (
      <div className="w-[280px] rounded-[16px] border border-rose-500/40 bg-[#18141c] p-3 text-xs text-rose-200">
        Unknown model: {data.modelId || "(none)"}
      </div>
    );
  }

  const promptPort = spec.inputs.find((p) => p.id === "prompt");
  const isPromptWired = (incomingByHandle.get("prompt") ?? 0) > 0;
  const outputColor = PORT_COLOR_MAP[spec.output.type];
  const status = data.status ?? "idle";
  const isBusy = status === "queued" || status === "running";

  const durationSeconds =
    data.durationSeconds ?? spec.defaultDurationSeconds ?? 5;
  const estimatedUsd = estimateCanvasModelCostUsd(spec, { durationSeconds });
  const activePreset =
    data.presetId && spec.presets.includes(data.presetId)
      ? data.presetId
      : spec.defaultPresetId;

  // Check if all required non-prompt ports are wired (prompt can come inline or wired).
  const missingRequiredLabels: string[] = [];
  for (const port of spec.inputs) {
    if (!port.required) continue;
    if (port.id === "prompt") {
      if (!isPromptWired && !(data.prompt || "").trim()) {
        missingRequiredLabels.push(isZh ? port.labels["zh-Hant"] : port.labels.en);
      }
      continue;
    }
    if ((incomingByHandle.get(port.id) ?? 0) === 0) {
      missingRequiredLabels.push(isZh ? port.labels["zh-Hant"] : port.labels.en);
    }
  }

  const canRun = !isBusy && !isFlowRunning && missingRequiredLabels.length === 0;
  const categoryLabel = isZh
    ? CATEGORY_LABELS[spec.category]["zh-Hant"]
    : CATEGORY_LABELS[spec.category].en;

  const statusBadge =
    status === "running" || status === "queued"
      ? {
          text: isZh
            ? status === "queued"
              ? "排隊中"
              : "生成中"
            : status === "queued"
              ? "Queued"
              : "Running",
          cls: "border-[#c6f24b]/40 bg-[#c6f24b]/15 text-[#c6f24b]",
        }
      : status === "completed"
        ? {
            text: isZh ? "完成" : "Done",
            cls: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
          }
        : status === "failed"
          ? {
              text: isZh ? "失敗" : "Failed",
              cls: "border-rose-400/40 bg-rose-500/15 text-rose-300",
            }
          : null;

  return (
    <div
      className={`relative w-[312px] rounded-[16px] border bg-[#12161f]/95 shadow-[0_18px_42px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all ${
        isBusy
          ? "border-[#c6f24b]/80 ring-2 ring-[#c6f24b]/25"
          : selected
            ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/20"
            : "border-[#252c3b] hover:border-[#3a455c]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-white/7 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#c6f24b]" />
            <span className="truncate text-[12.5px] font-bold text-white">
              {spec.name}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span
              className={`rounded-full px-1.5 py-0.5 font-semibold ${
                spec.provider === "mentalok"
                  ? "bg-sky-500/15 text-sky-300"
                  : "bg-violet-500/15 text-violet-300"
              }`}
            >
              {spec.provider === "mentalok" ? "Mentalok" : "OpenRouter"}
            </span>
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
        <button
          type="button"
          onClick={() => onDeleteNode(id)}
          title="Delete node"
          className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Typed input handle rows */}
      <div className="space-y-1 border-b border-white/6 py-2">
        {spec.inputs.map((port) => {
          const count = incomingByHandle.get(port.id) ?? 0;
          const color = PORT_COLOR_MAP[port.type];
          const label = isZh ? port.labels["zh-Hant"] : port.labels.en;
          return (
            <div
              key={port.id}
              className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]"
            >
              <Handle
                type="target"
                id={port.id}
                position={Position.Left}
                style={{
                  width: 11,
                  height: 11,
                  backgroundColor: count > 0 ? color : "#12161f",
                  border: `2px solid ${color}`,
                  left: -6,
                }}
              />
              <span className="flex items-center gap-1.5 text-white/80">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
                {port.required ? (
                  <span className="text-[9.5px] font-semibold text-amber-300/90">
                    *
                  </span>
                ) : null}
              </span>
              <span className="text-[10px] text-white/45">
                {port.multiple
                  ? `${count}/${port.maxConnections}`
                  : count > 0
                    ? isZh
                      ? "已連"
                      : "Wired"
                    : port.id === "prompt"
                      ? isZh
                        ? "下方輸入"
                        : "Inline"
                      : isZh
                        ? "選填"
                        : "Optional"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inline prompt & compact model parameters */}
      <div className="space-y-2.5 p-3">
        {promptPort ? (
          isPromptWired ? (
            <div className="rounded-[10px] border border-[#c6f24b]/30 bg-[#c6f24b]/8 px-2.5 py-1.5 text-[11px] text-[#c6f24b]">
              {isZh
                ? "已由外部 Prompt 節點提供提示詞"
                : "Prompt supplied by connected Prompt node"}
            </div>
          ) : (
            <textarea
              value={data.prompt ?? ""}
              onChange={(e) => onUpdateNodeData(id, { prompt: e.target.value })}
              rows={3}
              placeholder={
                isZh ? "描述你想生成的畫面或動作…" : "Describe what to generate…"
              }
              className="nodrag nowheel w-full resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-[11.5px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none"
            />
          )
        ) : null}

        {/* Provider-specific compact controls */}
        {spec.provider === "mentalok" ? (
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10.5px] font-medium text-white/55">
              Preset
            </label>
            <select
              value={activePreset}
              onChange={(e) => onUpdateNodeData(id, { presetId: e.target.value })}
              className="nodrag max-w-[205px] flex-1 cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
            >
              {spec.presets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {spec.supportsAspectRatio ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">
                  {isZh ? "比例" : "Ratio"}
                </label>
                <select
                  value={data.aspectRatio ?? "16:9"}
                  onChange={(e) =>
                    onUpdateNodeData(id, {
                      aspectRatio: e.target.value as CanvasNodeData["aspectRatio"],
                    })
                  }
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
                >
                  {ASPECT_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {spec.supportsResolution ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">
                  {isZh ? "解析度" : "Resolution"}
                </label>
                <select
                  value={data.resolution ?? "2k"}
                  onChange={(e) =>
                    onUpdateNodeData(id, {
                      resolution: e.target.value as CanvasNodeData["resolution"],
                    })
                  }
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
                >
                  {RESOLUTION_OPTIONS.map((res) => (
                    <option key={res} value={res}>
                      {res.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {spec.category === "video" ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">
                  {isZh ? "秒數" : "Duration"} ({durationSeconds}s)
                </label>
                <input
                  type="number"
                  min={spec.minDurationSeconds ?? 5}
                  max={spec.maxDurationSeconds ?? 15}
                  value={durationSeconds}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (Number.isFinite(parsed)) {
                      onUpdateNodeData(id, { durationSeconds: parsed });
                    }
                  }}
                  className="nodrag rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Collapsible Advanced options (Mentalok negativePrompt & seed) */}
        {spec.provider === "mentalok" && promptPort ? (
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="nodrag flex cursor-pointer items-center gap-1 text-[10.5px] text-white/45 transition hover:text-white/75"
            >
              {showAdvanced ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {isZh ? "進階參數（負向詞 / Seed）" : "Advanced (Negative / Seed)"}
            </button>
            {showAdvanced ? (
              <div className="mt-2 space-y-1.5 rounded-[10px] border border-white/6 bg-[#0b0e14]/70 p-2">
                <input
                  type="text"
                  value={data.negativePrompt ?? ""}
                  onChange={(e) =>
                    onUpdateNodeData(id, { negativePrompt: e.target.value })
                  }
                  placeholder="Negative prompt (optional)"
                  className="nodrag w-full rounded-[7px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/85 placeholder:text-white/30 focus:border-[#c6f24b]/50 focus:outline-none"
                />
                <input
                  type="number"
                  value={data.seed ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    onUpdateNodeData(id, {
                      seed: raw === "" ? undefined : Number(raw),
                    });
                  }}
                  placeholder="Seed (random if blank)"
                  className="nodrag w-full rounded-[7px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/85 placeholder:text-white/30 focus:border-[#c6f24b]/50 focus:outline-none"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Error banner */}
        {status === "failed" && data.lastError ? (
          <div className="flex items-start gap-1.5 rounded-[10px] border border-rose-500/35 bg-rose-500/10 p-2 text-[11px] text-rose-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span className="line-clamp-3">{data.lastError}</span>
          </div>
        ) : null}

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
            canRun
              ? "bg-[#c6f24b] text-[#11141b] shadow-[0_6px_18px_rgba(198,242,75,0.2)] hover:brightness-105"
              : "cursor-not-allowed bg-white/8 text-white/40"
          }`}
        >
          {isBusy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{isZh ? "執行中…" : "Running…"}</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>
                Run · {formatUsd(estimatedUsd)}
              </span>
            </>
          )}
        </button>

        {/* Inline Output Preview */}
        {data.outputUrl ? (
          <div className="relative overflow-hidden rounded-[10px] border border-white/10 bg-black/50">
            {(data.outputKind ?? spec.output.type) === "video" ? (
              <video
                src={data.outputUrl}
                controls
                playsInline
                className="nodrag max-h-[190px] w-full object-contain"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.outputUrl}
                alt={spec.name}
                className="max-h-[200px] w-full object-cover"
              />
            )}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onOpenLightbox({
                    url: data.outputUrl!,
                    kind: data.outputKind ?? spec.output.type,
                    title: spec.name,
                  })
                }
                className="nodrag cursor-pointer rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
                title={isZh ? "放大預覽" : "Expand"}
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <a
                href={data.outputUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="nodrag cursor-pointer rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
                title={isZh ? "下載檔案" : "Download"}
              >
                <Download className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* Right typed output handle */}
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
    </div>
  );
}
