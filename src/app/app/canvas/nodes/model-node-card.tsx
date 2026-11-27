"use client";

// Model node card: director cards return early; the generic card composes the sections below.

import { useMemo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { VIDEO_STYLE_TRANSFER_MODEL_ID } from "@/service/canvas/catalog/video-style-transfer";
import { isStyleId } from "@/model/style-id";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import { CHARACTER_BLUEPRINT_MODEL_ID } from "@/service/canvas/core/character-blueprint";
import { isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";
import { modelPromptVars, readConnectedPromptText } from "@/service/canvas/core/graph";
import { CharacterBlueprintNodeCard } from "@/app/app/canvas/nodes/character-blueprint-node-card";
import { pendingCharacterOutfitSources } from "@/service/canvas/core/character-wardrobe";
import { ExplainerPlanningCard } from "@/app/app/canvas/nodes/explainer-planning-card";
import { ExplainerDirectorCard } from "@/app/app/canvas/nodes/explainer-director-card";
import { TalkingHeadDirectorCard } from "@/app/app/canvas/nodes/talking-head-director-card";
import { SwapDirectorCard } from "@/app/app/canvas/nodes/swap-director-card";
import { TeleportDirectorCard } from "@/app/app/canvas/nodes/teleport-director-card";
import { isExplainerDirectorNode } from "@/service/canvas/directors/explainer-director";
import { isSwapDirectorNode, isTeleportDirectorNode } from "@/service/canvas/directors/scro-director";
import {
  OUTDATED_BADGE_CLASS,
  outdatedBadgeText,
} from "@/app/app/canvas/nodes/outdated-notice";
import {
  CATEGORY_LABELS,
  PORT_COLOR_MAP,
  useCanvasNodeActions,
} from "@/app/app/canvas/nodes/port-colors";
import "@/app/app/canvas/nodes/model-node-running.css";
import { ModelNodeCardFields } from "@/app/app/canvas/nodes/model-node-card-fields";
import { ModelNodeCardHeader } from "@/app/app/canvas/nodes/model-node-card-header";
import { ModelNodeCardPorts } from "@/app/app/canvas/nodes/model-node-card-ports";
import { ModelNodeCardPreview } from "@/app/app/canvas/nodes/model-node-card-preview";
import { ModelNodeCardRun } from "@/app/app/canvas/nodes/model-node-card-run";
import { StyleTransferNodeCard } from "@/app/app/canvas/nodes/style-transfer-node-card";
import { TextModelNodeCard } from "@/app/app/canvas/nodes/text-model-node-card";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";
import { ModelNodeExtraOutputs } from "@/app/app/canvas/nodes/model-node-extra-outputs";
import { STYLE_TRANSFER_MODEL_ID } from "@/service/canvas/core/style-transfer";


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
    onRunNodeWithDependents,
    onSwapModel,
    onOpenLightbox,
    onPlanExplainer,
    onBuildScroDirector,
    outdatedNodes,
  } = useCanvasNodeActions();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [promptEditorOpen, setPromptEditorOpen] = useState(false);

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
  // Undefined when no text wire is connected; empty string when the source has not run yet.
  const wiredPrompt = readConnectedPromptText(id, nodes, edges, catalog);

  if (data.modelId === CHARACTER_BLUEPRINT_MODEL_ID) {
    return <CharacterBlueprintNodeCard id={id} data={data} selected={selected} />;
  }

  if (isExplainerDirectorNode({ type: "model", data })) {
    return (
      <ExplainerDirectorCard
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        characterOptions={characterOptions}
        incomingHandles={[...incomingByHandle.keys()].filter((handle) => handle !== SETTINGS_HANDLE)}
        wiredPrompt={wiredPrompt}
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
        wiredPrompt={wiredPrompt}
        onUpdate={(patch) => onUpdateNodeData(id, patch)}
        onPlan={() => onPlanExplainer(id)}
        onRemove={() => onDeleteNode(id)}
      />
    );
  }

  if (isSwapDirectorNode({ type: "model", data }) || isTeleportDirectorNode({ type: "model", data })) {
    const videoWired = incomingByHandle.has("video");
    const videoSourceId = edges.find((edge) => edge.target === id && edge.targetHandle === "video")?.source;
    const sourceNode = videoSourceId ? nodes.find((node) => node.id === videoSourceId) : undefined;
    const swap = isSwapDirectorNode({ type: "model", data });
    return swap ? (
      <SwapDirectorCard
        data={data}
        isZh={isZh}
        selected={Boolean(selected)}
        disabled={isFlowRunning}
        videoWired={videoWired}
        referenceWired={incomingByHandle.has("refImages")}
        wiredPrompt={wiredPrompt}
        sourceNode={sourceNode}
        characterOptions={characterOptions}
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
        wiredPrompt={wiredPrompt}
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

  // Style transfer picks an image model in its own dialog, then runs that model's job.
  if (spec.id === STYLE_TRANSFER_MODEL_ID) {
    const status = data.status ?? "idle";
    const isBusy = status === "queued" || status === "running";
    return (
      <StyleTransferNodeCard
        id={id}
        data={data}
        selected={Boolean(selected)}
        spec={spec}
        catalog={catalog}
        locale={locale}
        projectTitle={projectTitle}
        isFlowRunning={isFlowRunning}
        incomingCount={incomingByHandle.get("image") ?? 0}
        outdated={isBusy ? undefined : outdatedNodes.get(id)}
        onUpdateNodeData={onUpdateNodeData}
        onDeleteNode={onDeleteNode}
        onRunNode={onRunNode}
        onOpenLightbox={onOpenLightbox}
      />
    );
  }

  // Director text style fills {{text_style}}. A Setting overrides a key only when it is wired.
  const promptWire = edges.find((e) => e.target === id && e.targetHandle === "prompt");
  const promptNode = promptWire ? nodes.find((n) => n.id === promptWire.source && n.type === "prompt") : undefined;
  const templateText = promptNode ? (promptNode.data.text ?? "") : (data.prompt ?? "");
  const templateVars = modelPromptVars(id, nodes, edges, catalog);

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
  if (spec.id === VIDEO_STYLE_TRANSFER_MODEL_ID) {
    const styleId = typeof toolParams.styleId === "string" ? toolParams.styleId : "";
    const videoModelId = typeof toolParams.videoModelId === "string" ? toolParams.videoModelId : "";
    if (!isStyleId(styleId)) missingRequiredLabels.push(isZh ? "風格" : "Style");
    if (!videoModelId.trim()) missingRequiredLabels.push(isZh ? "影片模型" : "Video model");
  }

  const pendingOutfits = pendingCharacterOutfitSources(id, nodes, edges);
  const canRun =
    !isBusy && !isFlowRunning && missingRequiredLabels.length === 0 && pendingOutfits.length === 0;
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

  const view: ModelNodeCardView = {
    id,
    data,
    selected: Boolean(selected),
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
    onRunNodeWithDependents,
    onSwapModel,
    onOpenLightbox,
    showAdvanced,
    setShowAdvanced,
    swapOpen,
    setSwapOpen,
    promptEditorOpen,
    setPromptEditorOpen,
    isZh,
    spec,
    displayName,
    incomingByHandle,
    promptPort,
    isPromptWired,
    isStartImageWired,
    isRefAudioWired,
    outputColor,
    status,
    isBusy,
    durationSeconds,
    activePreset,
    missingRequiredLabels,
    pendingOutfits,
    canRun,
    categoryLabel,
    outdated,
    isRerun,
    statusBadge,
    templateText,
    templateVars,
    toolParams,
    updateToolParam,
  };

  if (spec.category === "text") {
    return <TextModelNodeCard {...view} />;
  }

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
      <ModelNodeCardHeader {...view} />
      <ModelNodeCardPorts {...view} />
      <div className="space-y-2.5 p-3">
        <ModelNodeCardFields {...view} />
        <ModelNodeCardRun {...view} />
        <ModelNodeCardPreview {...view} />
      </div>
      {spec.extraOutputs?.length ? (
        <ModelNodeExtraOutputs spec={spec} isZh={isZh} />
      ) : (
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
      )}
    </div>
  );
}
