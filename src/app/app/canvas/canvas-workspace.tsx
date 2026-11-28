"use client";

// Main interactive node canvas workspace (/app/canvas) powered by @xyflow/react.
// Handles local/library drag-and-drop, typed connection guardrails, 800ms debounced
// MongoDB auto-save, 3s active-job polling, live USD balance updates, and multi-wave Run Flow.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import type { CanvasViewport } from "@/model/canvas";
import { refreshCanvasModelsAction } from "@/presentation/actions/canvas";
import { notifyCreditsChanged } from "@/presentation/components/app/billing/credits-changed";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BLUEPRINT_COST_USD } from "@/service/production-plan";
import type { PublicCharacter } from "@/presentation/serialize";
import { type CanvasModelSpec, findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import {
  addContextRef,
  contextMenuChoices,
  removeContextRef,
  type CanvasAgentContextRef,
  type ContextMenuChoice,
} from "@/service/canvas-agent/context-block";
import { dropExpandedPlanners, isExplainerPlannerNode } from "@/service/canvas/directors/explainer-planner";
import { withoutDirectorCharacterEdges } from "@/service/canvas/directors/explainer-director";
import { isScroDirectorNode } from "@/service/canvas/directors/scro-director";
import { ScroGroupDialogs } from "@/app/app/canvas/scro-group-dialogs";
import { CanvasGroupActionsContext } from "@/app/app/canvas/groups/group-actions-context";
import { GroupFrameNodeCard } from "@/app/app/canvas/groups/group-frame-node";
import { type DisplayNode, GROUP_FRAME_TYPE, groupIdFromFrameId } from "@/app/app/canvas/groups/group-frames";
import { GroupSelectionBar } from "@/app/app/canvas/groups/group-selection-bar";
import { PlanLockProvider, withPlanLock } from "@/app/app/canvas/nodes/director-plan-lock";
import { directorPlanningLocks } from "@/service/canvas/directors/director-plan-lock";
import { ReplanBeforeRunDialog, type ReplanBeforeRunItem } from "@/app/app/canvas/replan-before-run-dialog";
import { CanvasNodeMenu } from "@/app/app/canvas/canvas-node-menu";
import { useCanvasGroups } from "@/app/app/canvas/groups/use-canvas-groups";
import { useSwapDirectorGroupSync } from "@/app/app/canvas/groups/use-swap-director-groups";
import type {
  CanvasLibraryAssetsResult,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
} from "@/model/canvas-dto";
import type { CanvasFolderDto } from "@/model/canvas-dto";
import type { CanvasAgentMessageDto } from "@/model/canvas-agent";
import { CanvasAgentDock } from "@/app/app/canvas/agent/canvas-agent-dock";
import { SequenceTimelineDrawer } from "@/app/app/canvas/timeline/sequence-timeline-drawer";
import { useSequenceTimeline } from "@/app/app/canvas/timeline/use-sequence-timeline";
import { CanvasLightbox } from "@/app/app/canvas/canvas-lightbox";
import { CanvasSidebar } from "@/app/app/canvas/canvas-sidebar";
import { CanvasFitViewButton } from "@/app/app/canvas/canvas-fit-view-button";
import { CanvasMultiSelectMenu } from "@/app/app/canvas/canvas-multi-select-menu";
import { CanvasSelectionBox } from "@/app/app/canvas/canvas-selection-box";
import { CANVAS_DEFAULT_EDGE_OPTIONS, CANVAS_EDGE_TYPES } from "@/app/app/canvas/canvas-edge-delete-button";
import { useCanvasModifierSelection } from "@/app/app/canvas/use-canvas-modifier-selection";
import "@/app/app/canvas/canvas-multi-select.css";
import { CanvasTopbar, type SaveStatus } from "@/app/app/canvas/canvas-topbar";
import { useCanvasFlow } from "@/app/app/canvas/workspace/use-canvas-flow";
import { useCanvasJobs } from "@/app/app/canvas/workspace/use-canvas-jobs";
import { useCanvasLibrary } from "@/app/app/canvas/workspace/use-canvas-library";
import { useCanvasAgentReplay } from "@/app/app/canvas/workspace/use-canvas-agent-replay";
import { useCanvasDirectors } from "@/app/app/canvas/workspace/use-canvas-directors";
import { useCanvasDocument } from "@/app/app/canvas/workspace/use-canvas-document";
import { useCanvasCharacterBlueprint } from "@/app/app/canvas/workspace/use-canvas-character-blueprint";
import { useCanvasOutfits } from "@/app/app/canvas/workspace/use-canvas-outfits";
import { useCanvasProxies } from "@/app/app/canvas/workspace/use-canvas-proxies";
import { useCanvasPaneDrop } from "@/app/app/canvas/workspace/use-canvas-pane-drop";
import { useCanvasGroupActions } from "@/app/app/canvas/groups/use-canvas-group-actions";
import { FAILED_EDGE_STROKE } from "@/app/app/canvas/workspace/canvas-timing";
import {
  toDomainEdges,
  toDomainNodes,
  toFlowEdges,
  toFlowNodes,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";
import { CanvasEmptyWelcome } from "@/app/app/canvas/canvas-empty-welcome";
import { CanvasSwitchOverlay } from "@/app/app/canvas/canvas-switch-overlay";
import { CharacterNodeCard } from "@/app/app/canvas/nodes/character-node-card";
import { SettingsNodeCard } from "@/app/app/canvas/nodes/settings-node-card";
import { withoutModelSettingsEdges } from "@/service/canvas/core/settings/registry";
import { outdatedNodeReasons } from "@/service/canvas/core/stale-outputs";
import { MediaNodeCard } from "@/app/app/canvas/nodes/media-node-card";
import { ModelNodeCard } from "@/app/app/canvas/nodes/model-node-card";
import { type CanvasLightboxItem, CanvasNodeActionsContext } from "@/app/app/canvas/nodes/port-colors";
import { PromptNodeCard } from "@/app/app/canvas/nodes/prompt-node-card";

const NODE_TYPES = {
  media: withPlanLock(MediaNodeCard),
  prompt: withPlanLock(PromptNodeCard),
  model: withPlanLock(ModelNodeCard),
  character: withPlanLock(CharacterNodeCard),
  settings: withPlanLock(SettingsNodeCard),
  [GROUP_FRAME_TYPE]: GroupFrameNodeCard,
} as const;


export function CanvasWorkspace(props: {
  initialProject: CanvasProjectDto;
  initialProjects: CanvasProjectSummaryDto[];
  initialModels: CanvasModelSpec[];
  initialAssets: CanvasLibraryAssetsResult;
  initialCreditUsd: number;
  initialCreditLimitUsd: number;
  initialAgentMessages: CanvasAgentMessageDto[];
}) {
  return (
    <ReactFlowProvider>
      <CanvasWorkspaceInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasWorkspaceInner({
  initialProject,
  initialProjects,
  initialModels,
  initialAssets,
  initialCreditUsd,
  initialCreditLimitUsd,
  initialAgentMessages,
}: {
  initialProject: CanvasProjectDto;
  initialProjects: CanvasProjectSummaryDto[];
  initialModels: CanvasModelSpec[];
  initialAssets: CanvasLibraryAssetsResult;
  initialCreditUsd: number;
  initialCreditLimitUsd: number;
  initialAgentMessages: CanvasAgentMessageDto[];
}) {
  const { locale } = useI18n();
  const router = useRouter();
  const isZh = locale === "zh-Hant" || locale === "zh-Hans";
  const reactFlow = useReactFlow<DisplayNode, Edge>();

  const [projects, setProjects] = useState<CanvasProjectSummaryDto[]>(initialProjects);
  const [folders, setFolders] = useState<CanvasFolderDto[]>([]);
  const activeProjectId = initialProject.id;
  const [activeTitle, setActiveTitle] = useState(initialProject.title);
  const [models, setModels] = useState<CanvasModelSpec[]>(initialModels);
  const modelsRef = useRef(models);
  const [assets, setAssets] = useState<CanvasLibraryAssetsResult>(initialAssets);
  const [creditUsd, setCreditUsd] = useState(initialCreditUsd);
  const [contextRefs, setContextRefs] = useState<CanvasAgentContextRef[]>([]);
  const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  // True while another canvas is opening, until this workspace unmounts.
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [lightbox, setLightbox] = useState<CanvasLightboxItem | null>(null);
  const [initialGraph] = useState(() => {
    const dropped = dropExpandedPlanners(initialProject);
    const edges = withoutModelSettingsEdges(
      dropped.nodes,
      withoutDirectorCharacterEdges(dropped.nodes, dropped.edges),
    ).edges;
    return { ...dropped, edges };
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(
    toFlowNodes(initialGraph.nodes),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    toFlowEdges(initialGraph.edges, initialGraph.nodes, initialModels),
  );
  // Refs hold latest graph state so async Run Flow waves and autosave never read stale closures.
  const nodesRef = useRef<FlowNode[]>(nodes);
  const edgesRef = useRef<Edge[]>(edges);
  const jobOutputRef = useRef(new Map<string, RememberedJobOutput>());
  const viewportRef = useRef<CanvasViewport>(initialProject.viewport);
  const activeProjectIdRef = useRef(activeProjectId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Groups mark the canvas dirty before scheduleAutosave exists below, so they call it through a ref.
  const autosaveRef = useRef<() => void>(() => {});
  const requestAutosave = useCallback(() => autosaveRef.current(), []);
  const groupsApi = useCanvasGroups({
    initialGroups: initialProject.groups ?? [],
    nodes,
    setNodes,
    scheduleAutosave: requestAutosave,
  });
  const { snapshotGroups, splitNodeChanges, addGroup, updateGroups, resetGroups } = groupsApi;

  useEffect(() => {
    modelsRef.current = models;
  }, [models]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  const domainNodes = useMemo(() => toDomainNodes(nodes), [nodes]);
  const domainEdges = useMemo(() => toDomainEdges(edges), [edges]);
  // Wires leaving a failed node render red; the saved edge style is left untouched.
  const displayEdges = useMemo(() => {
    const failed = new Set(nodes.filter((n) => n.data.status === "failed").map((n) => n.id));
    if (failed.size === 0) return edges;
    return edges.map((e) =>
      failed.has(e.source)
        ? { ...e, style: { ...e.style, stroke: FAILED_EDGE_STROKE } }
        : e,
    );
  }, [nodes, edges]);
  // Nodes whose preview is an old version, shown with a "needs regenerating" badge.
  const outdatedNodes = useMemo(() => outdatedNodeReasons(domainNodes, domainEdges), [domainNodes, domainEdges]);
  // Rows a Director is still building cannot be edited, moved, run, or rewired.
  const planLocks = useMemo(
    () => directorPlanningLocks(nodes, groupsApi.groups),
    [nodes, groupsApi.groups],
  );
  const planLockRef = useRef(planLocks);
  useEffect(() => {
    planLockRef.current = planLocks;
  }, [planLocks]);
  // A Run whose Director changed waits on this confirm; confirmed runs wait for the Replan by Director id.
  const [replanRun, setReplanRun] = useState<{
    nodeId: string;
    directorId: string;
    nodeLabel: string;
    affected: ReplanBeforeRunItem[];
  } | null>(null);
  const runAfterReplanRef = useRef(new Map<string, string>());
  const [replannedRunId, setReplannedRunId] = useState<string | null>(null);
  const flowNodes = useMemo(() => {
    if (planLocks.nodeIds.size === 0 && planLocks.groupIds.size === 0) return groupsApi.displayNodes;
    return groupsApi.displayNodes.map((node) => {
      if (node.type === GROUP_FRAME_TYPE) {
        if (!planLocks.groupIds.has(node.data.group.id)) return node;
        return { ...node, draggable: false, data: { ...node.data, planLocked: true } };
      }
      if (!planLocks.nodeIds.has(node.id)) return node;
      return { ...node, draggable: false, connectable: false, deletable: false };
    });
  }, [groupsApi.displayNodes, planLocks]);
  const flowEdges = useMemo(() => {
    if (planLocks.nodeIds.size === 0) return displayEdges;
    return displayEdges.map((edge) =>
      planLocks.nodeIds.has(edge.source) || planLocks.nodeIds.has(edge.target)
        ? { ...edge, deletable: false, reconnectable: false }
        : edge,
    );
  }, [displayEdges, planLocks]);

  // A new library character shows up in the Assets list without waiting for a reload.
  const rememberCharacter = useCallback((character: PublicCharacter) => {
    const version = character.versions[0];
    const url =
      character.previewUrl ||
      version?.portraitUrl ||
      version?.referenceImageUrl ||
      version?.blueprintUrl ||
      null;
    setAssets((prev) => {
      const option = {
        id: character.id,
        name: character.name,
        ...(url ? { previewUrl: url } : {}),
        ...(version?.portraitUrl ? { portraitUrl: version.portraitUrl } : {}),
        ...(version?.profileUrl ? { fullBodyUrl: version.profileUrl } : {}),
      };
      const characters = url
        ? [
            {
              id: character.id,
              source: "character" as const,
              name: character.name,
              mediaKind: "image" as const,
              url,
              thumbnailUrl: url,
              createdAt: character.createdAt,
            },
            ...prev.characters.filter((item) => item.id !== character.id),
          ]
        : prev.characters;
      return {
        ...prev,
        characters,
        characterOptions: [
          option,
          ...(prev.characterOptions ?? []).filter((item) => item.id !== character.id),
        ],
      };
    });
  }, []);

  // A character created from the Assets icons joins the sidebar list immediately.
  const onCharacterCreated = useCallback(
    (character: PublicCharacter) => {
      rememberCharacter(character);
      setCreditUsd((current) => {
        const next = Math.max(0, current - BLUEPRINT_COST_USD);
        notifyCreditsChanged({
          creditUsd: next,
          creditLimitUsd: initialCreditLimitUsd,
          subscribed: initialCreditLimitUsd > 0,
        });
        return next;
      });
    },
    [initialCreditLimitUsd, rememberCharacter],
  );

  const syncWallet = useCallback(
    (nextCreditUsd?: number) => {
      if (typeof nextCreditUsd !== "number" || !Number.isFinite(nextCreditUsd)) return;
      setCreditUsd(nextCreditUsd);
      notifyCreditsChanged({
        creditUsd: nextCreditUsd,
        creditLimitUsd: initialCreditLimitUsd,
        subscribed: initialCreditLimitUsd > 0,
      });
    },
    [initialCreditLimitUsd],
  );

  const {
    isFlowRunning,
    flowWaveProgress,
    setIsFlowRunning,
    setFlowWaveProgress,
    setFlowSettled,
    setRunFailureIds,
    flowStatus,
    handleRunFlow,
    handleRunGroup,
    handleStopFlow,
  } = useCanvasFlow({
    initialFlowRun: initialProject.activeFlowRun,
    nodes,
    models,
    locale,
    isZh,
    setNodes,
    setEdges,
    setSaveStatus,
    syncWallet,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    activeProjectIdRef,
    saveTimerRef,
    planLockRef,
    groups: groupsApi.groups,
  });

  const {
    scheduleAutosave,
    applyPendingGroupLayout,
    pendingGroupLayoutRef,
    handleNodesChange,
    handleEdgesChange,
    markStale,
    onUpdateNodeData,
    onDeleteNode,
    onSwapModel,
    onReorderTargetEdges,
    isValidConnection,
    handleConnect,
    getCenterPosition,
    placeScroGroup,
    addModelNodeAt,
    addAssetNodeAt,
    addSettingsNode,
    addPromptNode,
    uploadAndPlaceFiles,
    scroDialog,
    setScroDialog,
  } = useCanvasDocument({
    models,
    isZh,
    setNodes,
    setEdges,
    setProjects,
    setSaveStatus,
    saveStatus,
    setIsUploading,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    activeProjectIdRef,
    saveTimerRef,
    autosaveRef,
    planLockRef,
    reactFlow,
    snapshotGroups,
    addGroup,
    splitNodeChanges,
    onNodesChange,
    onEdgesChange,
  });

  useSwapDirectorGroupSync({
    nodes: domainNodes,
    edges: domainEdges,
    snapshotGroups,
    updateGroups,
  });

  const { onRunNode } = useCanvasJobs({
    nodes,
    isFlowRunning,
    isZh,
    setNodes,
    setEdges,
    setSaveStatus,
    setIsFlowRunning,
    setFlowSettled,
    setRunFailureIds,
    setFlowWaveProgress,
    syncWallet,
    scheduleAutosave,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    activeProjectIdRef,
    saveTimerRef,
    planLockRef,
  });

  const {
    onPlanExplainer,
    requestRunNode,
    cancelReplanRun,
    confirmReplanRun,
    closeScroDialog,
    insertScroGroup,
    canvasMedia,
    handleBuildScroDirector,
    startDirectorPlan,
  } = useCanvasDirectors({
    nodes,
    models,
    isZh,
    setNodes,
    setEdges,
    scheduleAutosave,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    activeProjectIdRef,
    planLockRef,
    onRunNode,
    replanRun,
    setReplanRun,
    runAfterReplanRef,
    setReplannedRunId,
    placeScroGroup,
    applyPendingGroupLayout,
    snapshotGroups,
    updateGroups,
    addGroup,
    scroDialog,
    setScroDialog,
    pendingGroupLayoutRef,
  });

  const {
    groupContextValue,
    selectionHitsPlanning,
    groupSelectedNodes,
    ungroupSelectedNodes,
    selectionInGroup,
    selectionIsOneGroup,
  } = useCanvasGroupActions({
    groupsApi,
    planLocks,
    planLockRef,
    isZh,
    isFlowRunning,
    handleRunGroup,
    markStale,
    setNodes,
    setEdges,
    edgesRef,
  });

  const {
    handleSelectProject,
    handleCreateProject,
    handleRenameProject,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveProject,
    handleDeleteProject,
    handleApplyTemplate,
  } = useCanvasLibrary({
    isZh,
    router,
    reactFlow,
    projects,
    setProjects,
    setFolders,
    setIsSwitchingProject,
    setIsCreatingProject,
    setActiveTitle,
    setNodes,
    setEdges,
    activeProjectIdRef,
    nodesRef,
    models,
    scheduleAutosave,
    getCenterPosition,
  });

  const { getAgentGraph, applyAgentOps, undoAgentTurn } = useCanvasAgentReplay({
    models,
    reactFlow,
    setNodes,
    setEdges,
    scheduleAutosave,
    nodesRef,
    edgesRef,
    jobOutputRef,
    viewportRef,
    saveTimerRef,
    snapshotGroups,
    updateGroups,
    resetGroups,
    startDirectorPlan,
  });

  const handleRefreshModels = useCallback(async () => {
    setIsRefreshingModels(true);
    try {
      const res = await refreshCanvasModelsAction();
      setModels(res.models);
      toast.success(isZh ? "已更新最新模型狀態與定價" : "Model prices & status refreshed");
    } catch {
      toast.error(isZh ? "更新模型清單失敗" : "Failed to refresh models");
    } finally {
      setIsRefreshingModels(false);
    }
  }, [isZh]);

  // Runnable model nodes. Planner and Swap / Teleport director cards never run in a flow.
  const flowModelCount = useMemo(() => {
    let count = 0;
    for (const node of nodes) {
      if (node.type !== "model" || !node.data.modelId) continue;
      const domain = { type: "model" as const, data: node.data };
      if (isExplainerPlannerNode(domain) || isScroDirectorNode(domain)) continue;
      if (!findCanvasModel(node.data.modelId, models)) continue;
      count += 1;
    }
    return count;
  }, [nodes, models]);

  const { isDraggingFile, handlePaneDragOver, handlePaneDragLeave, handlePaneDrop } = useCanvasPaneDrop({
    reactFlow,
    addModelNodeAt,
    addPromptNode,
    addSettingsNode,
    addAssetNodeAt,
    uploadAndPlaceFiles,
  });

  const { timelineNodeId, openTimeline, closeTimeline, convertConcat, setDirectorClipJoin } = useSequenceTimeline({
    models,
    isZh,
    setNodes,
    setEdges,
    nodesRef,
    edgesRef,
    snapshotGroups,
    updateGroups,
    scheduleAutosave,
  });

  const paneRootRef = useRef<HTMLDivElement>(null);
  const hiddenIds = useMemo(
    () => new Set(groupsApi.groups.filter((group) => group.collapsed).flatMap((group) => group.memberIds)),
    [groupsApi.groups],
  );
  const selectionKey = groupsApi.selectedIds.slice().sort().join("\0");
  const multiSelect = useCanvasModifierSelection({
    containerRef: paneRootRef,
    nodesRef,
    setNodes,
    screenToFlowPosition: (point) => reactFlow.screenToFlowPosition(point),
    getZoom: () => reactFlow.getViewport().zoom,
    lockedIds: planLocks.nodeIds,
    hiddenIds,
    selectionKey,
    selectedCount: groupsApi.selectedIds.length,
    onMoveEnd: scheduleAutosave,
  });
  const deleteSelectedNodes = useCallback(() => {
    const locked = planLockRef.current.nodeIds;
    for (const id of groupsApi.selectedIds) {
      if (!locked.has(id)) onDeleteNode(id);
    }
  }, [groupsApi.selectedIds, onDeleteNode]);
  const movableSelectionCount = groupsApi.selectedIds.filter((id) => !planLocks.nodeIds.has(id)).length;

  const { onGenerateOutfit } = useCanvasOutfits({ nodes, isZh, setNodes, scheduleAutosave, nodesRef, edgesRef });
  useCanvasProxies({ canvasId: activeProjectId, nodes, setNodes });
  const { onSaveCharacterBlueprint } = useCanvasCharacterBlueprint({
    isZh,
    models,
    setNodes,
    scheduleAutosave,
    nodesRef,
    edgesRef,
    onSaved: rememberCharacter,
  });

  // Runs the node a confirmed Replan was waiting for, after the new plan and unlocked rows render.
  useEffect(() => {
    if (!replannedRunId) return;
    setReplannedRunId(null);
    if (nodesRef.current.some((n) => n.id === replannedRunId)) void onRunNode(replannedRunId);
  }, [replannedRunId, onRunNode]);

  const nodeContextValue = useMemo(
    () => ({
      catalog: models,
      nodes: domainNodes,
      edges: domainEdges,
      characterOptions: assets.characterOptions ?? [],
      locale,
      projectTitle: activeTitle,
      isFlowRunning,
      onUpdateNodeData,
      onDeleteNode,
      onRunNode: requestRunNode,
      onSwapModel,
      onReorderTargetEdges,
      onGenerateOutfit,
      onSaveCharacterBlueprint,
      onOpenLightbox: setLightbox,
      onPlanExplainer,
      onBuildScroDirector: handleBuildScroDirector,
      outdatedNodes,
      onOpenTimeline: openTimeline,
      onConvertConcat: convertConcat,
      onSetDirectorClipJoin: setDirectorClipJoin,
    }),
    [
      models,
      domainNodes,
      domainEdges,
      assets.characterOptions,
      locale,
      activeTitle,
      isFlowRunning,
      onUpdateNodeData,
      onDeleteNode,
      requestRunNode,
      onSwapModel,
      onReorderTargetEdges,
      onGenerateOutfit,
      onSaveCharacterBlueprint,
      onPlanExplainer,
      handleBuildScroDirector,
      outdatedNodes,
      openTimeline,
      convertConcat,
      setDirectorClipJoin,
    ],
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0b0e13] text-white">
      {isSwitchingProject || isCreatingProject ? <CanvasSwitchOverlay isZh={isZh} /> : null}
      <CanvasTopbar
        locale={locale}
        projects={projects}
        folders={folders}
        activeProjectId={activeProjectId}
        activeTitle={activeTitle}
        saveStatus={saveStatus}
        creditUsd={creditUsd}
        flowModelCount={flowModelCount}
        isFlowRunning={isFlowRunning}
        flowWaveProgress={flowWaveProgress}
        flowStatus={flowStatus}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onMoveProject={handleMoveProject}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onRunFlow={handleRunFlow}
        onStopFlow={handleStopFlow}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CanvasSidebar
          locale={locale}
          models={models}
          assets={assets}
          isUploading={isUploading}
          isRefreshingModels={isRefreshingModels}
          onAddModel={(id) => addModelNodeAt(id)}
          onAddAsset={(asset) => addAssetNodeAt(asset)}
          onAddPromptNode={() => addPromptNode()}
          onAddSettingsNode={() => addSettingsNode()}
          onUploadFiles={(files) => void uploadAndPlaceFiles(files)}
          onRefreshModels={() => void handleRefreshModels()}
          creditUsd={creditUsd}
          subscribed={initialCreditLimitUsd > 0}
          onCharacterCreated={onCharacterCreated}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-row">
          <div
            ref={paneRootRef}
            className={`relative min-h-0 min-w-0 flex-1${multiSelect.moveArmed ? " scro-move-selection" : ""}`}
            onDragOver={handlePaneDragOver}
            onDragLeave={handlePaneDragLeave}
            onDrop={handlePaneDrop}
          >
            <CanvasNodeActionsContext.Provider value={nodeContextValue}>
              <PlanLockProvider ids={planLocks.nodeIds}>
              <CanvasGroupActionsContext.Provider value={groupContextValue}>
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={NODE_TYPES}
                  // Nodes stay selectable. A selected connection keeps its stroke and shows a delete button.
                  edgeTypes={CANVAS_EDGE_TYPES}
                  defaultEdgeOptions={CANVAS_DEFAULT_EDGE_OPTIONS}
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
                  onNodeContextMenu={(event, flowNode) => {
                    event.preventDefault();
                    setNodeMenu({ x: event.clientX, y: event.clientY, nodeId: flowNode.id });
                  }}
                  onConnect={handleConnect}
                  isValidConnection={isValidConnection}
                  defaultViewport={initialProject.viewport}
                  onMoveEnd={(_event, viewport) => {
                    viewportRef.current = viewport;
                    scheduleAutosave();
                  }}
                  deleteKeyCode={["Backspace", "Delete"]}
                  // Left-drag pans. Command (Mac) or Control (Windows) on the pane draws a selection box.
                  selectionOnDrag={false}
                  panOnDrag={multiSelect.moveArmed ? [1] : true}
                  // Mac trackpad: two fingers moving together pan the canvas. Pinch arrives as ctrl+wheel and zooms.
                  panOnScroll
                  panOnScrollSpeed={1}
                  zoomOnScroll={false}
                  zoomOnPinch
                  fitView={initialProject.nodes.length > 0 && initialProject.viewport.x === 0 && initialProject.viewport.y === 0}
                  className="dark"
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={22}
                    size={1.2}
                    color="#262e3e"
                  />
                  <Controls className="!border-white/10 !bg-[#12161f]/90" />
                  <Panel position="bottom-right" className="!m-3">
                    <CanvasFitViewButton isZh={isZh} />
                  </Panel>
                  <MiniMap
                    nodeColor={(n) =>
                      n.type === GROUP_FRAME_TYPE
                        ? "transparent"
                        : n.type === "media"
                          ? "#38bdf8"
                          : n.type === "prompt" || n.type === "character"
                            ? "#c6f24b"
                            : "#a78bfa"
                    }
                    maskColor="rgba(11, 14, 19, 0.72)"
                    className="!bottom-16 !right-3 !rounded-xl !border !border-white/10 !bg-[#12161f]/90"
                  />
                </ReactFlow>
                {timelineNodeId ? <SequenceTimelineDrawer nodeId={timelineNodeId} onClose={closeTimeline} /> : null}
              </CanvasGroupActionsContext.Provider>
              </PlanLockProvider>
            </CanvasNodeActionsContext.Provider>

            {nodeMenu ? (
              <CanvasNodeMenu
                x={nodeMenu.x}
                y={nodeMenu.y}
                isZh={isZh}
                choices={contextMenuChoices({
                  frame: groupIdFromFrameId(nodeMenu.nodeId) !== null,
                  groupId:
                    groupIdFromFrameId(nodeMenu.nodeId) ??
                    groupsApi.groups.find((group) => group.memberIds.includes(nodeMenu.nodeId))?.id ??
                    null,
                })}
                onPick={(choice: ContextMenuChoice) => {
                  const ref: CanvasAgentContextRef =
                    choice.kind === "group"
                      ? { kind: "group", id: choice.groupId }
                      : { kind: "node", id: nodeMenu.nodeId };
                  setContextRefs((prev) => addContextRef(prev, ref));
                  setNodeMenu(null);
                }}
                onClose={() => setNodeMenu(null)}
              />
            ) : null}

            {multiSelect.selectionBox ? <CanvasSelectionBox box={multiSelect.selectionBox} /> : null}
            {groupsApi.selectedIds.length >= 2 ? (
              <CanvasMultiSelectMenu
                isZh={isZh}
                count={groupsApi.selectedIds.length}
                moveArmed={multiSelect.moveArmed}
                canDelete={movableSelectionCount > 0}
                canMove={movableSelectionCount > 0}
                onDelete={deleteSelectedNodes}
                onToggleMove={multiSelect.toggleMove}
                onMoveStart={multiSelect.beginMove}
                onMoveBy={multiSelect.updateMove}
                onMoveEnd={multiSelect.endMove}
              />
            ) : null}

            <GroupSelectionBar
              isZh={isZh}
              selectedCount={groupsApi.selectedIds.length}
              canGroup={groupsApi.selectedIds.length >= 2 && !selectionIsOneGroup && !selectionHitsPlanning}
              canUngroup={selectionInGroup && !selectionHitsPlanning}
              onGroup={groupSelectedNodes}
              onUngroup={ungroupSelectedNodes}
            />

            {/* Live nodes, not the saved graph: upload placeholders are on screen but not saved. */}
            <CanvasEmptyWelcome
              nodeCount={nodes.length}
              isZh={isZh}
              onApplyTemplate={handleApplyTemplate}
            />

            <ScroGroupDialogs
              state={scroDialog}
              isZh={isZh}
              assets={assets}
              canvasMedia={canvasMedia}
              onCancel={closeScroDialog}
              onGroup={insertScroGroup}
            />

            {/* Local file drop overlay */}
            {isDraggingFile ? (
              <div className="pointer-events-none absolute inset-4 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#c6f24b] bg-[#c6f24b]/10 backdrop-blur-xs">
                <div className="rounded-xl bg-[#0e121a]/95 px-5 py-3 text-sm font-bold text-[#c6f24b] shadow-xl">
                  {isZh
                    ? "放開即可上傳並建立媒體節點"
                    : "Drop file to upload & create Media node"}
                </div>
              </div>
            ) : null}
          </div>

          <CanvasAgentDock
            locale={locale}
            canvasId={activeProjectId}
            lockSide
            side="right"
            initialMessages={initialAgentMessages}
            getGraph={getAgentGraph}
            contextRefs={contextRefs}
            contextNodes={domainNodes}
            contextGroups={groupsApi.groups}
            onRemoveContext={(ref) => setContextRefs((prev) => removeContextRef(prev, ref))}
            onContextConsumed={() => setContextRefs([])}
            onApplyOps={applyAgentOps}
            onUndo={undoAgentTurn}
            onSideChange={() => {}}
          />
        </div>
      </div>

      <CanvasLightbox
        item={lightbox}
        projectTitle={activeTitle}
        onClose={() => setLightbox(null)}
      />
      {replanRun ? (
        <ReplanBeforeRunDialog
          isZh={isZh}
          nodeLabel={replanRun.nodeLabel}
          affected={replanRun.affected}
          onCancel={cancelReplanRun}
          onConfirm={confirmReplanRun}
        />
      ) : null}
    </div>
  );
}
