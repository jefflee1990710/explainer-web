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
import type { CanvasNodeData, CanvasViewport } from "@/model/canvas";
import { refreshCanvasModelsAction, generateCanvasCharacterOutfitAction } from "@/presentation/actions/canvas";
import { refreshCharacterAction } from "@/presentation/actions/characters";
import { notifyCreditsChanged } from "@/presentation/components/app/billing/credits-changed";
import { useI18n } from "@/presentation/components/i18n-provider";
import { BLUEPRINT_COST_USD } from "@/service/production-plan";
import type { PublicCharacter } from "@/presentation/serialize";
import { type CanvasModelSpec, findCanvasModel } from "@/service/canvas/model-catalog";
import {
  addContextRef,
  contextMenuChoices,
  removeContextRef,
  type CanvasAgentContextRef,
  type ContextMenuChoice,
} from "@/service/canvas-agent/context-block";
import { dropExpandedPlanners, isExplainerPlannerNode } from "@/service/canvas/explainer-planner";
import { withoutDirectorCharacterEdges } from "@/service/canvas/explainer-director";
import { isScroDirectorNode } from "@/service/canvas/scro-director";
import { ScroGroupDialogs } from "@/app/app/canvas/scro-group-dialogs";
import { CanvasGroupActionsContext } from "@/app/app/canvas/groups/group-actions-context";
import { GroupFrameNodeCard } from "@/app/app/canvas/groups/group-frame-node";
import { type DisplayNode, GROUP_FRAME_TYPE, groupIdFromFrameId } from "@/app/app/canvas/groups/group-frames";
import { GroupSelectionBar } from "@/app/app/canvas/groups/group-selection-bar";
import { PlanLockProvider, withPlanLock } from "@/app/app/canvas/nodes/director-plan-lock";
import { directorPlanningLocks } from "@/service/canvas/director-plan-lock";
import { ReplanBeforeRunDialog, type ReplanBeforeRunItem } from "@/app/app/canvas/replan-before-run-dialog";
import { CanvasNodeMenu } from "@/app/app/canvas/canvas-node-menu";
import { useCanvasGroups } from "@/app/app/canvas/groups/use-canvas-groups";
import type {
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
} from "@/model/canvas-dto";
import type { CanvasFolderDto } from "@/model/canvas-dto";
import type { CanvasAgentMessageDto } from "@/model/canvas-agent";
import { CanvasAgentDock } from "@/app/app/canvas/agent/canvas-agent-dock";
import { CanvasLightbox } from "@/app/app/canvas/canvas-lightbox";
import { CANVAS_DRAG_ASSET_MIME, CANVAS_DRAG_MODEL_MIME, CanvasSidebar } from "@/app/app/canvas/canvas-sidebar";
import { CANVAS_DRAG_PROMPT_MIME } from "@/app/app/canvas/canvas-prompt-tool";
import { CanvasFitViewButton } from "@/app/app/canvas/canvas-fit-view-button";
import { CanvasTopbar, type SaveStatus } from "@/app/app/canvas/canvas-topbar";
import { useCanvasFlow } from "@/app/app/canvas/workspace/use-canvas-flow";
import { useCanvasJobs } from "@/app/app/canvas/workspace/use-canvas-jobs";
import { useCanvasLibrary } from "@/app/app/canvas/workspace/use-canvas-library";
import { useCanvasAgentReplay } from "@/app/app/canvas/workspace/use-canvas-agent-replay";
import { useCanvasDirectors } from "@/app/app/canvas/workspace/use-canvas-directors";
import { useCanvasDocument } from "@/app/app/canvas/workspace/use-canvas-document";
import { FAILED_EDGE_STROKE, JOB_POLL_INTERVAL_MS } from "@/app/app/canvas/workspace/canvas-timing";
import {
  toDomainEdges,
  toDomainNodes,
  toFlowEdges,
  toFlowNodes,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";
import { CanvasSwitchOverlay } from "@/app/app/canvas/canvas-switch-overlay";
import { CharacterNodeCard } from "@/app/app/canvas/nodes/character-node-card";
import { SettingsNodeCard } from "@/app/app/canvas/nodes/settings-node-card";
import { CANVAS_DRAG_SETTINGS_MIME } from "@/app/app/canvas/canvas-settings-tool";
import { withoutModelSettingsEdges } from "@/service/canvas/settings/registry";
import { outdatedNodeReasons } from "@/service/canvas/stale-outputs";
import { MediaNodeCard } from "@/app/app/canvas/nodes/media-node-card";
import { ModelNodeCard } from "@/app/app/canvas/nodes/model-node-card";
import { type CanvasLightboxItem, CanvasNodeActionsContext } from "@/app/app/canvas/nodes/port-colors";
import { PromptNodeCard } from "@/app/app/canvas/nodes/prompt-node-card";
import { characterOutfitEditInstruction, outfitWiresFromGraph } from "@/service/canvas/character-node";

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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
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

  // A character created from the Assets icons joins the sidebar list immediately.
  const onCharacterCreated = useCallback(
    (character: PublicCharacter) => {
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
    [initialCreditLimitUsd],
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

  // Deletes the frame and every member node, plus wires that touch them.
  const canvasGroups = groupsApi.groups;
  const ungroupById = groupsApi.ungroup;
  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      if (planLockRef.current.groupIds.has(groupId)) return;
      const group = canvasGroups.find((g) => g.id === groupId);
      if (!group) return;
      const members = new Set(group.memberIds);
      markStale(
        edgesRef.current
          .filter((e) => members.has(e.source) && !members.has(e.target))
          .map((e) => e.target),
      );
      setNodes((prev) => prev.filter((n) => !members.has(n.id)));
      setEdges((prev) => prev.filter((e) => !members.has(e.source) && !members.has(e.target)));
      ungroupById(groupId);
    },
    [canvasGroups, ungroupById, markStale, setNodes, setEdges],
  );

  const groupContextValue = useMemo(
    () => ({
      isZh,
      isFlowRunning,
      onRename: groupsApi.renameGroup,
      onColor: groupsApi.recolorGroup,
      onToggleCollapse: groupsApi.toggleCollapse,
      onRun: handleRunGroup,
      onUngroup: (groupId: string) => {
        if (planLockRef.current.groupIds.has(groupId)) return;
        ungroupById(groupId);
      },
      onDelete: handleDeleteGroup,
    }),
    [
      isZh,
      isFlowRunning,
      groupsApi.renameGroup,
      groupsApi.recolorGroup,
      groupsApi.toggleCollapse,
      ungroupById,
      handleRunGroup,
      handleDeleteGroup,
    ],
  );

  const { groupSelection, ungroupSelection } = groupsApi;
  // A Director that is still planning keeps its frame and rows together.
  const selectionHitsPlanning = useMemo(() => {
    if (planLocks.groupIds.size === 0) return false;
    const selected = new Set(groupsApi.selectedIds);
    return groupsApi.groups.some(
      (group) => planLocks.groupIds.has(group.id) && group.memberIds.some((id) => selected.has(id)),
    );
  }, [planLocks.groupIds, groupsApi.groups, groupsApi.selectedIds]);
  const groupSelectedNodes = useCallback(() => {
    if (selectionHitsPlanning) return false;
    return groupSelection(isZh ? "群組" : "Group");
  }, [groupSelection, isZh, selectionHitsPlanning]);
  const ungroupSelectedNodes = useCallback(() => {
    if (selectionHitsPlanning) return false;
    return ungroupSelection();
  }, [selectionHitsPlanning, ungroupSelection]);
  const { selectionInGroup, selectionIsOneGroup } = useMemo(() => {
    const selected = new Set(groupsApi.selectedIds);
    return {
      selectionInGroup: groupsApi.groups.some((g) => g.memberIds.some((id) => selected.has(id))),
      // Selection already matches one group exactly, so grouping again would do nothing.
      selectionIsOneGroup: groupsApi.groups.some(
        (g) => g.memberIds.length === selected.size && g.memberIds.every((id) => selected.has(id)),
      ),
    };
  }, [groupsApi.groups, groupsApi.selectedIds]);

  // Cmd/Ctrl+G groups the selection; Shift+Cmd/Ctrl+G ungroups it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "g") return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, [contenteditable='true']")) return;
      const handled = event.shiftKey ? ungroupSelectedNodes() : groupSelectedNodes();
      if (handled) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [groupSelectedNodes, ungroupSelectedNodes]);

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

  // Drag & drop onto canvas pane (supports local files, sidebar models, sidebar Scro assets).
  const handlePaneDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (event.dataTransfer.types.includes("Files")) {
      setIsDraggingFile(true);
    }
  }, []);

  const handlePaneDragLeave = useCallback((event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) return;
    setIsDraggingFile(false);
  }, []);

  const handlePaneDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDraggingFile(false);
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const modelId = event.dataTransfer.getData(CANVAS_DRAG_MODEL_MIME);
      if (modelId) {
        addModelNodeAt(modelId, position);
        return;
      }

      if (event.dataTransfer.getData(CANVAS_DRAG_PROMPT_MIME) === "prompt") {
        addPromptNode(position);
        return;
      }

      if (event.dataTransfer.getData(CANVAS_DRAG_SETTINGS_MIME)) {
        addSettingsNode(position);
        return;
      }

      const rawAsset = event.dataTransfer.getData(CANVAS_DRAG_ASSET_MIME);
      if (rawAsset) {
        try {
          const parsed = JSON.parse(rawAsset) as CanvasLibraryAsset;
          addAssetNodeAt(parsed, position);
        } catch {
          // ignore malformed drag payload
        }
        return;
      }

      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        void uploadAndPlaceFiles(event.dataTransfer.files, position);
      }
    },
    [reactFlow, addModelNodeAt, addPromptNode, addSettingsNode, addAssetNodeAt, uploadAndPlaceFiles],
  );

  const onGenerateOutfit = useCallback(
    async (nodeId: string) => {
      const node = nodesRef.current.find((item) => item.id === nodeId);
      const characterId = node?.data.characterId;
      if (!node || node.type !== "character" || !characterId) {
        toast.error(isZh ? "這個角色節點缺少角色資料" : "This character node is missing its character");
        return;
      }
      const wires = outfitWiresFromGraph(
        nodeId,
        toDomainNodes(nodesRef.current),
        toDomainEdges(edgesRef.current),
      );
      const instruction = characterOutfitEditInstruction(wires);
      if (!instruction) {
        toast.error(isZh ? "先把穿搭接到角色節點" : "Connect an outfit to the character first");
        return;
      }
      setNodes((prev) =>
        prev.map((item) =>
          item.id === nodeId
            ? { ...item, data: { ...item.data, status: "queued", lastError: undefined } }
            : item,
        ),
      );
      const updateDefaultOutfit = node.data.toolParams?.updateDefaultOutfit === true;
      const result = await generateCanvasCharacterOutfitAction({
        characterId,
        instruction,
        updateDefaultOutfit,
      });
      if (!result.ok) {
        setNodes((prev) =>
          prev.map((item) =>
            item.id === nodeId
              ? { ...item, data: { ...item.data, status: "failed", lastError: result.error } }
              : item,
          ),
        );
        toast.error(result.error);
        return;
      }
      setNodes((prev) =>
        prev.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                data: {
                  ...item.data,
                  status: "running",
                  lastCostUsd: result.chargedUsd,
                  toolParams: {
                    ...(item.data.toolParams ?? {}),
                    versionId: result.versionId,
                  },
                },
              }
            : item,
        ),
      );
      scheduleAutosave();
      toast.success(isZh ? "已開始生成新造型" : "Outfit generation started");
    },
    [isZh, scheduleAutosave, setNodes],
  );

  const outfitWatchKey = useMemo(
    () =>
      nodes
        .filter(
          (node) =>
            node.type === "character" &&
            (node.data.status === "queued" || node.data.status === "running"),
        )
        .map((node) => node.id)
        .join(","),
    [nodes],
  );

  // Follow the character blueprint job and paint the new outfit onto the node.
  useEffect(() => {
    if (!outfitWatchKey) return;
    let alive = true;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
      const pending = nodesRef.current.filter(
        (node) =>
          node.type === "character" &&
          (node.data.status === "queued" || node.data.status === "running") &&
          node.data.characterId &&
          typeof node.data.toolParams?.versionId === "string",
      );
      const byCharacter = new Map<string, FlowNode[]>();
      for (const node of pending) {
        const characterId = node.data.characterId ?? "";
        const list = byCharacter.get(characterId) ?? [];
        list.push(node);
        byCharacter.set(characterId, list);
      }

      for (const [characterId, group] of byCharacter) {
        const result = await refreshCharacterAction(characterId);
        if (!alive || !result.ok) continue;
        const updates = new Map<string, Partial<CanvasNodeData>>();
        for (const node of group) {
          const versionId = String(node.data.toolParams?.versionId ?? "");
          const version = result.character.versions.find((item) => item.id === versionId);
          if (!version) continue;
          if (version.status === "failed") {
            updates.set(node.id, {
              status: "failed",
              lastError: version.error || (isZh ? "生成造型失敗" : "Outfit generation failed"),
            });
            continue;
          }
          const url = version.blueprintUrl || version.portraitUrl || version.profileUrl;
          if (version.status !== "completed" || !url) {
            updates.set(node.id, { status: "running" });
            continue;
          }
          updates.set(node.id, {
            status: "completed",
            outputUrl: url,
            outputKind: "image",
            lastError: undefined,
          });
        }
        if (updates.size === 0) continue;
        setNodes((prev) =>
          prev.map((node) => {
            const patch = updates.get(node.id);
            if (!patch) return node;
            return { ...node, data: { ...node.data, ...patch } };
          }),
        );
        scheduleAutosave();
      }
      } finally {
        inFlight = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => {
      void tick();
    }, JOB_POLL_INTERVAL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [outfitWatchKey, isZh, scheduleAutosave, setNodes]);

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
      onOpenLightbox: setLightbox,
      onPlanExplainer,
      onBuildScroDirector: handleBuildScroDirector,
      outdatedNodes,
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
      onPlanExplainer,
      handleBuildScroDirector,
      outdatedNodes,
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
            className="relative min-h-0 min-w-0 flex-1"
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

            <GroupSelectionBar
              isZh={isZh}
              selectedCount={groupsApi.selectedIds.length}
              canGroup={groupsApi.selectedIds.length >= 2 && !selectionIsOneGroup && !selectionHitsPlanning}
              canUngroup={selectionInGroup && !selectionHitsPlanning}
              onGroup={groupSelectedNodes}
              onUngroup={ungroupSelectedNodes}
            />

            {/* Empty canvas onboarding overlay */}
            {domainNodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-[#12161f]/90 p-6 text-center shadow-2xl backdrop-blur-md">
                  <h2 className="text-base font-bold text-white">
                    {isZh ? "開始打造你的 AI 生成工作流" : "Build Your AI Visual Workflow"}
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                    {isZh
                      ? "把電腦上的圖片／影片直接拖到畫布、從左側點擊或拖入模型，連線後即可單節點或一鍵 Run Flow 生成。"
                      : "Drop local images/videos onto the canvas, click or drag a model from the left panel, wire ports together, and click Run."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate("talking-head")}
                      className="cursor-pointer rounded-[10px] bg-[#c6f24b] px-3.5 py-2 text-xs font-bold text-[#11141b] transition hover:brightness-105"
                    >
                      {isZh ? "套用：口播導演" : "Try: Talking Head Director"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate("explainer")}
                      className="cursor-pointer rounded-[10px] border border-white/12 bg-white/6 px-3.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/12"
                    >
                      {isZh ? "套用：Explainer 解說片" : "Try: AI Explainer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate("text-image-video")}
                      className="cursor-pointer rounded-[10px] border border-white/12 bg-white/6 px-3.5 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/12"
                    >
                      {isZh ? "套用：文生圖 → 圖生影片" : "Try: Text → Image → Video"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

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
