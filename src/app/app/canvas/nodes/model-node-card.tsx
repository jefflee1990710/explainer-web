"use client";

// All-in-one Model node card: typed input handles, inline prompt/params,
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
  Pencil,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { CanvasNodeData } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/model-names";
import { canSwapModel } from "@/service/canvas/model-swap";
import { isExplainerPlannerNode } from "@/service/canvas/explainer-planner";
import { canWireSettings } from "@/service/canvas/settings/registry";
import { SETTING_COLOR } from "@/app/app/canvas/nodes/settings-node-card";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import { wiredSettingsVars } from "@/service/canvas/graph";
import { PromptVarsHint } from "@/app/app/canvas/nodes/prompt-vars-hint";
import { CanvasDownloadButton } from "@/app/app/canvas/canvas-download-button";
import { ConcatVideoOrder } from "@/app/app/canvas/nodes/concat-video-order";
import { ModelSwapDialog } from "@/app/app/canvas/nodes/model-swap-dialog";
import { ExplainerPlanningCard } from "@/app/app/canvas/nodes/explainer-planning-card";
import { ExplainerDirectorCard } from "@/app/app/canvas/nodes/explainer-director-card";
import { TalkingHeadDirectorCard } from "@/app/app/canvas/nodes/talking-head-director-card";
import { SwapDirectorCard } from "@/app/app/canvas/nodes/swap-director-card";
import { TeleportDirectorCard } from "@/app/app/canvas/nodes/teleport-director-card";
import { SwapLightLookField } from "@/app/app/canvas/nodes/swap-light-look-field";
import { isExplainerDirectorNode, wiredDirectorCharacter } from "@/service/canvas/explainer-director";
import { isSwapDirectorNode, isTeleportDirectorNode } from "@/service/canvas/scro-director";
import {
  OUTDATED_BADGE_CLASS,
  OutdatedBanner,
  OutdatedPreviewTag,
  outdatedBadgeText,
} from "@/app/app/canvas/nodes/outdated-notice";
import {
  CATEGORY_LABELS,
  PORT_COLOR_MAP,
  useCanvasNodeActions,
} from "@/app/app/canvas/nodes/port-colors";
import { CanvasModelLogo } from "@/app/app/canvas/model-logo";
import "@/app/app/canvas/nodes/model-node-running.css";

const ASPECT_OPTIONS = ["16:9", "9:16", "1:1", "3:4"] as const;
const RESOLUTION_OPTIONS = ["1k", "2k", "4k"] as const;

export function ModelNodeCard({
  id,
  data,
  selected,
}: NodeProps & { data: CanvasNodeData }) {
  const {
    catalog,
    nodes,
    edges,
    characterOptions,
    locale,
    projectTitle,
    isFlowRunning,
    onUpdateNodeData,
    onDeleteNode,
    onRunNode,
    onSwapModel,
    onOpenLightbox,
    onPlanExplainer,
    onBuildScroDirector,
    outdatedNodes,
  } = useCanvasNodeActions();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const spec = useMemo(
    () => (data.modelId ? findCanvasModel(data.modelId, catalog) : undefined),
    [catalog, data.modelId],
  );
  const displayName = spec ? canvasModelDisplayName(spec, locale) : "";

  const incomingByHandle = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      if (edge.target === id && edge.targetHandle) {
        map.set(edge.targetHandle, (map.get(edge.targetHandle) ?? 0) + 1);
      }
    }
    return map;
  }, [edges, id]);

  if (isExplainerDirectorNode({ type: "model", data })) {
    return (
      <ExplainerDirectorCard
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        characterOptions={characterOptions}
        incomingHandles={[...incomingByHandle.keys()]}
        hasSetting={incomingByHandle.has(SETTINGS_HANDLE)}
        wiredCharacter={wiredDirectorCharacter(id, nodes, edges)}
        onUpdate={(patch) => onUpdateNodeData(id, patch)}
        onPlan={() => onPlanExplainer(id)}
        onRemove={() => onDeleteNode(id)}
      />
    );
  }

  // Talking Head settings stay on the card. Plan is pressed there; nothing pops up on drop.
  if (data.modelId === "scro:talking-head" && data.toolParams?.plannerMode === true) {
    return (
      <TalkingHeadDirectorCard
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        characterOptions={characterOptions}
        wiredCharacter={wiredDirectorCharacter(id, nodes, edges)}
        onUpdate={(patch) => onUpdateNodeData(id, patch)}
        onPlan={() => onPlanExplainer(id)}
        onRemove={() => onDeleteNode(id)}
      />
    );
  }

  if (isSwapDirectorNode({ type: "model", data }) || isTeleportDirectorNode({ type: "model", data })) {
    const videoWired = incomingByHandle.has("video");
    const swap = isSwapDirectorNode({ type: "model", data });
    return swap ? (
      <SwapDirectorCard
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        videoWired={videoWired}
        referenceWired={incomingByHandle.has("refImages")}
        onUpdate={(patch) => onUpdateNodeData(id, patch)}
        onBuild={() => onBuildScroDirector(id)}
        onRemove={() => onDeleteNode(id)}
      />
    ) : (
      <TeleportDirectorCard
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        videoWired={videoWired}
        sceneWired={incomingByHandle.has("image")}
        onUpdate={(patch) => onUpdateNodeData(id, patch)}
        onBuild={() => onBuildScroDirector(id)}
        onRemove={() => onDeleteNode(id)}
      />
    );
  }

  if (isExplainerPlannerNode({ type: "model", data })) {
    return (
      <>
        {/* Invisible anchors keep wires into older planner nodes rendering */}
        {[...incomingByHandle.keys()].map((handle) => (
          <Handle
            key={handle}
            type="target"
            id={handle}
            position={Position.Left}
            isConnectable={false}
            style={{ opacity: 0 }}
          />
        ))}
        <ExplainerPlanningCard
          data={data}
          isZh={isZh}
          selected={Boolean(selected)}
          disabled={isFlowRunning}
          onPlan={() => onPlanExplainer(id)}
          onRemove={() => onDeleteNode(id)}
        />
      </>
    );
  }

  if (!spec) {
    return (
      <div className="w-[280px] rounded-[16px] border border-rose-500/40 bg-[#18141c] p-3 text-xs text-rose-200">
        Unknown model: {data.modelId || "(none)"}
      </div>
    );
  }

  // `{{key}}` text and the vars that fill it: a wired Prompt node's Setting, then this node's own.
  const promptWire = edges.find((e) => e.target === id && e.targetHandle === "prompt");
  const promptNode = promptWire ? nodes.find((n) => n.id === promptWire.source && n.type === "prompt") : undefined;
  const templateText = promptNode ? (promptNode.data.text ?? "") : (data.prompt ?? "");
  const templateVars = {
    ...(promptNode ? wiredSettingsVars(promptNode.id, nodes, edges) : {}),
    ...wiredSettingsVars(id, nodes, edges),
  };
  const settingsEdge = edges.find((e) => e.target === id && e.targetHandle === SETTINGS_HANDLE);
  const settingsWired = Boolean(settingsEdge && nodes.some((n) => n.id === settingsEdge.source));
  const settingsColor = settingsWired ? SETTING_COLOR : undefined;

  const toolParams = data.toolParams ?? {};
  const updateToolParam = (key: string, value: unknown) => {
    onUpdateNodeData(id, {
      toolParams: { ...(data.toolParams ?? {}), [key]: value },
    });
  };

  const promptPort = spec.inputs.find((p) => p.id === "prompt");
  const isPromptWired = (incomingByHandle.get("prompt") ?? 0) > 0;
  const isStartImageWired = (incomingByHandle.get("startImage") ?? 0) > 0;
  const isRefAudioWired = (incomingByHandle.get("refAudio") ?? 0) > 0;
  const outputColor = PORT_COLOR_MAP[spec.output.type];
  const status = data.status ?? "idle";
  const isBusy = status === "queued" || status === "running";

  const durationPresetSec =
    toolParams.durationPreset === "15s"
      ? 15
      : toolParams.durationPreset === "45s"
        ? 45
        : toolParams.durationPreset === "60s"
          ? 60
          : toolParams.durationPreset === "30s"
            ? 30
            : undefined;
  const durationSeconds =
    data.durationSeconds ?? durationPresetSec ?? spec.defaultDurationSeconds ?? 5;
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
  if (spec.id === "scro:talking-head") {
    if (!isStartImageWired && !String(toolParams.characterId ?? "").trim()) {
      missingRequiredLabels.push(isZh ? "角色或起始圖" : "Character or Start Image");
    }
    if (!isRefAudioWired && !isPromptWired && !(data.prompt || "").trim()) {
      missingRequiredLabels.push(isZh ? "講稿或音訊" : "Script or Audio");
    }
  }
  if (spec.id === "scro:life" && !String(toolParams.characterId ?? "").trim()) {
    missingRequiredLabels.push(isZh ? "角色" : "Character");
  }

  const canRun = !isBusy && !isFlowRunning && missingRequiredLabels.length === 0;
  const categoryLabel = isZh
    ? CATEGORY_LABELS[spec.category]["zh-Hant"]
    : CATEGORY_LABELS[spec.category].en;

  // Old preview after an upstream change; hidden while a new run is in progress.
  const outdated = isBusy ? undefined : outdatedNodes.get(id);
  // Finished and current: running again is optional, so the button reads Re-run.
  const isRerun = status === "completed" && Boolean(data.outputUrl?.trim()) && !outdated;

  const statusBadge = outdated
    ? { text: outdatedBadgeText(isZh), cls: OUTDATED_BADGE_CLASS }
    : status === "running" || status === "queued"
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
          ? "canvas-model-running border-2"
          : status === "failed"
            ? `border-2 border-rose-500/80 ${selected ? "ring-2 ring-rose-500/30" : ""}`
            : selected
              ? "border-[#c6f24b] ring-2 ring-[#c6f24b]/20"
              : "border-[#252c3b] hover:border-[#3a455c]"
      }`}
    >
      {/* Header */}
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
            onClick={() => onDeleteNode(id)}
            title="Delete node"
            className="nodrag cursor-pointer rounded-md p-1 text-white/40 transition hover:bg-white/8 hover:text-rose-400"
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
        {/* Setting wire: fills `{{key}}` in this node's prompt. */}
        {canWireSettings({ id, type: "model", data }) ? (
          <div className="relative flex items-center justify-between px-3.5 py-0.5 text-[11px]">
            <Handle
              type="target"
              id={SETTINGS_HANDLE}
              position={Position.Left}
              style={{
                width: 11,
                height: 11,
                backgroundColor: settingsColor ?? "#0b0e13",
                border: `2px solid ${settingsColor ?? "#64748b"}`,
                left: -6,
              }}
            />
            <span className="flex items-center gap-1.5 text-white/80">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: settingsColor ?? "#64748b" }}
              />
              <span>{isZh ? "設定" : "Setting"}</span>
            </span>
            <span className="text-[10px] text-white/45">
              {settingsWired ? (isZh ? "已連" : "Wired") : isZh ? "選填" : "Optional"}
            </span>
          </div>
        ) : null}
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
              className="nodrag disabled:cursor-not-allowed disabled:opacity-50 nowheel w-full resize-none rounded-[10px] border border-white/10 bg-[#0b0e14] px-2.5 py-2 text-[11.5px] leading-relaxed text-white/90 placeholder:text-white/30 focus:border-[#c6f24b]/60 focus:outline-none"
            />
          )
        ) : null}
        {promptPort ? (
          <PromptVarsHint isZh={isZh} text={templateText} vars={templateVars} missingBlocksRun />
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
                  className="nodrag disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
                >
                  {(spec.provider === "google"
                    ? ASPECT_OPTIONS.filter((ratio) => spec.presets.includes(ratio))
                    : ASPECT_OPTIONS
                  ).map((r) => (
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

            {spec.category === "video" ||
            spec.id === "scro:talking-head" ||
            spec.id === "scro:swap" ||
            spec.id === "scro:teleport" ||
            spec.id === "scro:swap-render" ||
            spec.id === "scro:teleport-render" ? (
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
                  className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[8px] border border-white/10 bg-[#0b0e14] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Scro Tool & FFmpeg Node Controls */}
        {spec.provider === "scro" &&
        spec.id !== "scro:explainer-frame" &&
        spec.id !== "scro:director-frame" &&
        spec.id !== "scro:teleport-render" ? (
          <div className="space-y-2 rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2">
            {(spec.id === "scro:talking-head" ||
              spec.id === "scro:explainer" ||
              spec.id === "scro:swap" ||
              spec.id === "scro:life" ||
              spec.id === "scro:poster" ||
              spec.id === "scro:tts") && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">
                  {isZh ? "角色 Character" : "Character"}
                </label>
                <select
                  value={String(toolParams.characterId ?? "")}
                  onChange={(e) => updateToolParam("characterId", e.target.value || undefined)}
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90 focus:border-[#c6f24b]/60 focus:outline-none"
                >
                  <option value="">{isZh ? "（不指定 / 使用連線圖片）" : "(None / Use wired image)"}</option>
                  {characterOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(spec.id === "scro:talking-head" ||
              spec.id === "scro:explainer" ||
              spec.id === "scro:tts") && (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/50">
                    {isZh ? "語言" : "Language"}
                  </label>
                  <select
                    value={String(toolParams.language ?? "yue")}
                    onChange={(e) => updateToolParam("language", e.target.value)}
                    className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  >
                    <option value="yue">廣東話 (yue)</option>
                    <option value="zh">國語 (zh)</option>
                    <option value="en">English (en)</option>
                  </select>
                </div>

                {spec.id === "scro:tts" ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/50">
                      {isZh ? "預設聲線" : "Voice"}
                    </label>
                    <select
                      value={String(toolParams.voicePreset ?? "cathy")}
                      onChange={(e) => updateToolParam("voicePreset", e.target.value)}
                      className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                    >
                      <option value="cathy">Cathy (粵語女)</option>
                      <option value="alan">Alan (粵語男)</option>
                      <option value="una">Una (國語女)</option>
                      <option value="yu">Yu (國語男)</option>
                      <option value="bella">Bella (EN Female)</option>
                      <option value="brian">Brian (EN Male)</option>
                    </select>
                  </div>
                ) : spec.id === "scro:explainer" ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/50">
                      {isZh ? "片長預設" : "Target"}
                    </label>
                    <select
                      value={String(toolParams.durationPreset ?? "30s")}
                      onChange={(e) => {
                        const preset = e.target.value;
                        const secs =
                          preset === "15s" ? 15 : preset === "45s" ? 45 : preset === "60s" ? 60 : 30;
                        onUpdateNodeData(id, {
                          durationSeconds: secs,
                          toolParams: { ...toolParams, durationPreset: preset },
                        });
                      }}
                      className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                    >
                      <option value="15s">15s</option>
                      <option value="30s">30s</option>
                      <option value="45s">45s</option>
                      <option value="60s">60s</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-white/50">
                      {isZh ? "取景" : "Framing"}
                    </label>
                    <select
                      value={String(toolParams.framing ?? "collarbone-close")}
                      onChange={(e) => updateToolParam("framing", e.target.value)}
                      className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                    >
                      <option value="collarbone-close">{isZh ? "鎖骨特寫" : "Close"}</option>
                      <option value="waist-up">{isZh ? "半身" : "Waist-up"}</option>
                      <option value="handheld-selfie">{isZh ? "手持自拍" : "Selfie"}</option>
                      <option value="full-body">{isZh ? "全身" : "Full body"}</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {spec.id === "scro:tts" ? (
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-white/50">
                  {isZh ? "語速" : "Speed"} ({Number(toolParams.ttsSpeed ?? 1).toFixed(2)}x)
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={1.5}
                  step={0.05}
                  value={Number(toolParams.ttsSpeed ?? 1)}
                  onChange={(e) => updateToolParam("ttsSpeed", Number(e.target.value))}
                  className="nodrag w-28 accent-[#c6f24b]"
                />
              </div>
            ) : null}

            {spec.id === "scro:explainer" ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">
                  {isZh ? "解說風格" : "Director Style"}
                </label>
                <select
                  value={String(toolParams.skillSlug ?? "cartoon-explainer-video-director")}
                  onChange={(e) => updateToolParam("skillSlug", e.target.value)}
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                >
                  <option value="cartoon-explainer-video-director">白板手繪解說 (Whiteboard)</option>
                  <option value="paper-cutout-explainer-video-director">剪紙拼貼解說 (Paper Cutout)</option>
                  <option value="papercraft-diorama-director">3D 摺紙微縮 (Papercraft)</option>
                </select>
              </div>
            ) : null}

            {spec.id === "scro:swap" || spec.id === "scro:swap-render" ? (
              <div className="space-y-1.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/50">
                    {isZh ? "換角模式" : "Swap Mode"}
                  </label>
                  <select
                    value={String(toolParams.swapMode ?? "character")}
                    onChange={(e) => updateToolParam("swapMode", e.target.value)}
                    className="nodrag disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  >
                    <option value="character">{isZh ? "角色替換 (Character)" : "Character Swap"}</option>
                    <option value="object">{isZh ? "物件／穿搭替換 (Object)" : "Object / Outfit"}</option>
                    <option value="relight">{isZh ? "電影打光 (Relight)" : "Relight Video"}</option>
                    {spec.id === "scro:swap" ? (
                      <option value="colorfix">{isZh ? "H3 Soft 調色" : "H3 Soft Color Fix"}</option>
                    ) : null}
                  </select>
                </div>
                {toolParams.swapMode === "object" ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={String(toolParams.objectTarget ?? "")}
                      onChange={(e) => updateToolParam("objectTarget", e.target.value)}
                      placeholder={isZh ? "目標物 (e.g. jacket)" : "Target (e.g. jacket)"}
                      className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                    />
                    <select
                      value={String(toolParams.objectEditMode ?? "change")}
                      onChange={(e) => updateToolParam("objectEditMode", e.target.value)}
                      className="nodrag disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                    >
                      <option value="change">Change</option>
                      <option value="add">Add</option>
                      <option value="remove">Remove</option>
                    </select>
                  </div>
                ) : null}
                {toolParams.swapMode === "relight" ? (
                  <SwapLightLookField
                    isZh={isZh}
                    value={typeof toolParams.lightLookId === "string" ? toolParams.lightLookId : undefined}
                    onChange={(lightLookId) => updateToolParam("lightLookId", lightLookId)}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {spec.provider === "ffmpeg" ? (
          <div className="space-y-2 rounded-[10px] border border-white/8 bg-[#0b0e14]/80 p-2">
            {spec.id === "ffmpeg:concat" ? (
              <>
                <ConcatVideoOrder nodeId={id} isZh={isZh} />
                <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">
                  {isZh ? "轉場方式" : "Transition"}
                </label>
                <select
                  value={String(toolParams.ffmpegTransition ?? "pad-200ms")}
                  onChange={(e) => updateToolParam("ffmpegTransition", e.target.value)}
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                >
                  <option value="pad-200ms">{isZh ? "定格銜接 (200ms Pad)" : "Pad 200ms"}</option>
                  <option value="cut">{isZh ? "硬切 (Hard Cut)" : "Hard Cut"}</option>
                  <option value="fade">{isZh ? "淡入淡出 (Crossfade)" : "Crossfade"}</option>
                </select>
                </div>
              </>
            ) : null}

            {spec.id === "ffmpeg:audio-mux" ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/50">
                    {isZh ? "混音模式" : "Mix Mode"}
                  </label>
                  <select
                    value={String(toolParams.ffmpegMixMode ?? "replace")}
                    onChange={(e) => updateToolParam("ffmpegMixMode", e.target.value)}
                    className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  >
                    <option value="replace">{isZh ? "替換音軌" : "Replace"}</option>
                    <option value="mix-ducking">{isZh ? "壓低原聲混音" : "Mix + Duck"}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-white/50">
                    {isZh ? "音量" : "Gain"} ({Number(toolParams.ffmpegAudioGainDb ?? 0)}dB)
                  </label>
                  <input
                    type="number"
                    min={-24}
                    max={12}
                    value={Number(toolParams.ffmpegAudioGainDb ?? 0)}
                    onChange={(e) => updateToolParam("ffmpegAudioGainDb", Number(e.target.value))}
                    className="nodrag rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  />
                </div>
              </div>
            ) : null}

            {spec.id === "ffmpeg:trim-speed" ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={Number(toolParams.ffmpegStartSec ?? 0)}
                    onChange={(e) => updateToolParam("ffmpegStartSec", Number(e.target.value))}
                    placeholder="Start s"
                    className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={toolParams.ffmpegEndSec !== undefined ? Number(toolParams.ffmpegEndSec) : ""}
                    onChange={(e) =>
                      updateToolParam(
                        "ffmpegEndSec",
                        e.target.value === "" ? undefined : Number(e.target.value),
                      )
                    }
                    placeholder="End s"
                    className="nodrag disabled:cursor-not-allowed disabled:opacity-50 rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  />
                  <input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={Number(toolParams.ffmpegSpeed ?? 1)}
                    onChange={(e) => updateToolParam("ffmpegSpeed", Number(e.target.value))}
                    placeholder="Speed"
                    className="nodrag rounded-[7px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/70">
                  <input
                    type="checkbox"
                    checked={Boolean(toolParams.ffmpegTrimSilence)}
                    onChange={(e) => updateToolParam("ffmpegTrimSilence", e.target.checked)}
                    className="nodrag accent-[#c6f24b]"
                  />
                  {isZh ? "自動裁走頭尾靜音" : "Trim leading/trailing silence"}
                </label>
              </div>
            ) : null}

            {spec.id === "ffmpeg:transform" ? (
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={String(toolParams.ffmpegCropMode ?? "center-crop")}
                  onChange={(e) => updateToolParam("ffmpegCropMode", e.target.value)}
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                >
                  <option value="center-crop">{isZh ? "置中裁切" : "Center Crop"}</option>
                  <option value="fit-pad">{isZh ? "等比留黑邊" : "Fit Pad"}</option>
                </select>
                <select
                  value={String(toolParams.ffmpegColorGrade ?? "none")}
                  onChange={(e) => updateToolParam("ffmpegColorGrade", e.target.value)}
                  className="nodrag cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
                >
                  <option value="none">{isZh ? "原色" : "Original Color"}</option>
                  <option value="h3-soft">H3 Soft</option>
                </select>
              </div>
            ) : null}

            {spec.id === "ffmpeg:color-grade" ? (
              <select
                value={String(toolParams.gradeLook ?? "jutsu")}
                onChange={(e) => updateToolParam("gradeLook", e.target.value)}
                className="nodrag disabled:cursor-not-allowed disabled:opacity-50 w-full cursor-pointer rounded-[8px] border border-white/10 bg-[#12161f] px-2 py-1 text-[11px] text-white/90"
              >
                <option value="jutsu">{isZh ? "H3 Soft（換角／換場）" : "H3 Soft (Swap / Teleport)"}</option>
                <option value="talking-head">{isZh ? "口播膠片質感" : "Talking head sensor texture"}</option>
                <option value="talking-head-selfie">
                  {isZh ? "口播自拍手機質感" : "Talking head selfie texture"}
                </option>
              </select>
            ) : null}
          </div>
        ) : null}

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

        {outdated ? <OutdatedBanner reason={outdated} isZh={isZh} /> : null}

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

        {/* Inline Output Preview */}
        {data.outputUrl ? (
          <div
            className={`relative overflow-hidden rounded-[10px] border bg-black/50 ${
              outdated ? "border-amber-400/40 opacity-70" : "border-white/10"
            }`}
          >
            {outdated ? <OutdatedPreviewTag isZh={isZh} /> : null}
            {(data.outputKind ?? spec.output.type) === "video" ? (
              <video
                src={data.outputUrl}
                controls
                playsInline
                className="nodrag max-h-[190px] w-full object-contain"
              />
            ) : (data.outputKind ?? spec.output.type) === "audio" ? (
              <div className="bg-amber-500/8 p-2.5 pr-16">
                <audio src={data.outputUrl} controls className="nodrag h-8 w-full" />
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.outputUrl}
                alt={displayName}
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
                    title: displayName,
                  })
                }
                className="nodrag cursor-pointer rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
                title={isZh ? "放大預覽" : "Expand"}
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <CanvasDownloadButton
                url={data.outputUrl}
                project={projectTitle}
                title={displayName}
                kind={
                  (data.outputKind ?? spec.output.type) === "audio"
                    ? "audio"
                    : (data.outputKind ?? spec.output.type) === "video"
                      ? "video"
                      : "image"
                }
                className="rounded-md bg-black/70 p-1.5 text-white/90 transition hover:bg-black"
              >
                <Download className="h-3 w-3" />
              </CanvasDownloadButton>
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
