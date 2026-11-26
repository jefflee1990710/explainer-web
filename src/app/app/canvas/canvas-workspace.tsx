"use client";

// Main interactive node canvas workspace (/app/canvas) powered by @xyflow/react.
// Handles local/library drag-and-drop, typed connection guardrails, 800ms debounced
// MongoDB auto-save, 3s active-job polling, live USD balance updates, and multi-wave Run Flow.

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  EdgeChangeset,
  NodeChangeset,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import type {
  CanvasEdge,
  CanvasGroup,
  CanvasNode,
  CanvasNodeData,
  CanvasNodeStatus,
  CanvasNodeType,
  CanvasOutputKind,
  CanvasViewport,
} from "@/model/canvas";
import {
  createCanvasFolderAction,
  createCanvasProjectAction,
  deleteCanvasFolderAction,
  deleteCanvasProjectAction,
  listCanvasFoldersAction,
  moveCanvasToFolderAction,
  renameCanvasFolderAction,
  pollCanvasFlowAction,
  pollCanvasJobsAction,
  refreshCanvasModelsAction,
  renameCanvasProjectAction,
  runCanvasFlowAction,
  generateCanvasCharacterOutfitAction,
  runCanvasNodeAction,
  saveCanvasProjectAction,
  stopCanvasFlowAction,
  uploadCanvasMediaAction,
} from "@/presentation/actions/canvas";
import {
  refreshCharacterAction,
} from "@/presentation/actions/characters";
import { notifyCreditsChanged } from "@/presentation/components/app/billing/credits-changed";
import { useI18n } from "@/presentation/components/i18n-provider";
import { formatUsd } from "@/service/billing/usd";
import {
  computeExecutionWaves,
  getNodeOutputPortType,
  reorderTargetHandleEdges,
  validateEdgeConnection,
} from "@/service/canvas/graph";
import {
  type CanvasModelSpec,
  findCanvasModel,
} from "@/service/canvas/model-catalog";
import {
  addContextRef,
  contextMenuChoices,
  removeContextRef,
  type CanvasAgentContextRef,
  type ContextMenuChoice,
} from "@/service/canvas-agent/context-block";
import {
  dropExpandedPlanners,
  isExplainerPlannerNode,
  readPlannerParams,
} from "@/service/canvas/explainer-planner";
import { replacePlannerWithExpansion } from "@/service/canvas/explainer-expand";
import {
  directorChangedTargets,
  isPlanDirectorNode,
  readDirectorPlan,
  withoutDirectorCharacterEdges,
} from "@/service/canvas/explainer-director";
import {
  applyDirectorBuild,
  directorRevealSteps,
  mergeDirectorRows,
  syncDirectorReplanRows,
} from "@/service/canvas/explainer-director-apply";
import { renderDurationForTrim } from "@/service/canvas/scro-groups/section-sync";
import type { CanvasExplainerPlanState } from "@/service/canvas/explainer-plan";
import {
  layoutExplainerGroup,
  shiftGroupClearOf,
  type LayoutSize,
} from "@/service/canvas/explainer-layout";
import { layoutGroupByDepth } from "@/service/canvas/group-layout";
import type { ScroGroup } from "@/service/canvas/scro-groups/builder";
import { defaultGroupColor, defaultGroupTitle, withGroup } from "@/service/canvas/groups";
import {
  buildSwapDirectorGroup,
  buildTeleportDirectorGroup,
  isScroDirectorNode,
  isSwapDirectorNode,
  readExpandedNodeIds,
  scroDirectorBuildMessage,
} from "@/service/canvas/scro-director";
import {
  SCRO_DIALOG_TOOL_BY_MODEL,
  ScroGroupDialogs,
  type ScroDialogState,
  type ScroDialogTool,
} from "@/app/app/canvas/scro-group-dialogs";
import { CanvasGroupActionsContext } from "@/app/app/canvas/groups/group-actions-context";
import { GroupFrameNodeCard } from "@/app/app/canvas/groups/group-frame-node";
import {
  type CanvasFlowNode,
  type DisplayNode,
  GROUP_FRAME_TYPE,
  groupIdFromFrameId,
} from "@/app/app/canvas/groups/group-frames";
import { GroupSelectionBar } from "@/app/app/canvas/groups/group-selection-bar";
import { PlanLockProvider, withPlanLock } from "@/app/app/canvas/nodes/director-plan-lock";
import { directorPlanningLocks } from "@/service/canvas/director-plan-lock";
import { replanBeforeRun } from "@/service/canvas/director-replan-run";
import { ReplanBeforeRunDialog, type ReplanBeforeRunItem } from "@/app/app/canvas/replan-before-run-dialog";
import { CanvasNodeMenu } from "@/app/app/canvas/canvas-node-menu";
import { useCanvasGroups } from "@/app/app/canvas/groups/use-canvas-groups";
import type { CanvasMediaItem } from "@/app/app/canvas/scro-group-options";
import {
  getCanvasExplainerPlanAction,
  startCanvasExplainerPlanAction,
} from "@/presentation/actions/canvas-explainer";
import type {
  CanvasJobDto,
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
} from "@/service/canvas/projects";
import type { CanvasFolderDto } from "@/service/canvas/folder-library";
import {
  type CanvasStarterTemplateId,
  instantiateCanvasTemplate,
} from "@/service/canvas/templates";
import type { CanvasAgentMessageDto } from "@/service/canvas-agent/history";
import { applyCanvasAgentOp } from "@/service/canvas-agent/apply-ops";
import type { CanvasAgentGraph, CanvasAgentOp } from "@/service/canvas-agent/types";
import {
  CanvasAgentDock,
  type CanvasAgentGraphSnapshot,
} from "@/app/app/canvas/agent/canvas-agent-dock";
import { CanvasLightbox } from "@/app/app/canvas/canvas-lightbox";
import {
  CANVAS_DRAG_ASSET_MIME,
  CANVAS_DRAG_MODEL_MIME,
  CanvasSidebar,
} from "@/app/app/canvas/canvas-sidebar";
import { CANVAS_DRAG_PROMPT_MIME } from "@/app/app/canvas/canvas-prompt-tool";
import { CanvasFitViewButton } from "@/app/app/canvas/canvas-fit-view-button";
import { CanvasTopbar, type SaveStatus } from "@/app/app/canvas/canvas-topbar";
import { CanvasSwitchOverlay } from "@/app/app/canvas/canvas-switch-overlay";
import { CharacterNodeCard } from "@/app/app/canvas/nodes/character-node-card";
import { SETTING_COLOR, SettingsNodeCard } from "@/app/app/canvas/nodes/settings-node-card";
import { CANVAS_DRAG_SETTINGS_MIME } from "@/app/app/canvas/canvas-settings-tool";
import { settingsStaleTargets } from "@/service/canvas/settings/apply";
import { withoutModelSettingsEdges } from "@/service/canvas/settings/registry";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import {
  isGenerationInputPatch,
  markStaleOutputs,
  outdatedNodeReasons,
} from "@/service/canvas/stale-outputs";
import { swapNodeModel } from "@/service/canvas/model-swap";
import { MediaNodeCard } from "@/app/app/canvas/nodes/media-node-card";
import { ModelNodeCard } from "@/app/app/canvas/nodes/model-node-card";
import {
  type CanvasLightboxItem,
  CanvasNodeActionsContext,
  PORT_COLOR_MAP,
} from "@/app/app/canvas/nodes/port-colors";
import { PromptNodeCard } from "@/app/app/canvas/nodes/prompt-node-card";
import {
  characterOutfitEditInstruction,
  characterOutfitPort,
  findCharacterNodeAt,
  libraryAssetNodeDraft,
  outfitHandleForPart,
  outfitWiresFromGraph,
} from "@/service/canvas/character-node";

// Settings wires take the settings kind's color instead of a port color.
function settingsStroke(node: CanvasNode | undefined): string | undefined {
  return node?.type === "settings" ? SETTING_COLOR : undefined;
}

const NODE_TYPES = {
  media: withPlanLock(MediaNodeCard),
  prompt: withPlanLock(PromptNodeCard),
  model: withPlanLock(ModelNodeCard),
  character: withPlanLock(CharacterNodeCard),
  settings: withPlanLock(SettingsNodeCard),
  [GROUP_FRAME_TYPE]: GroupFrameNodeCard,
} as const;

const AUTOSAVE_DEBOUNCE_MS = 800;
const JOB_POLL_INTERVAL_MS = 3_000;
// Gap between Director rows appearing while a plan builds them.
const DIRECTOR_REVEAL_STEP_MS = 120;

// The rows, wires, and frame a Director plan places on the canvas.
type ExpandedDirectorRows = Pick<
  Extract<CanvasExplainerPlanState, { status: "ready" }>,
  "nodes" | "edges" | "group"
>;
const FAILED_EDGE_STROKE = "#f43f5e";
// Pause between agent ops so the user can watch the graph being built.
const AGENT_OP_STEP_MS = 90;

type FlowNode = CanvasFlowNode;

// A dropped Talking Head is the planning card itself. Script and framing stay on the node.
function talkingHeadDirectorNode(position: { x: number; y: number }, prompt = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:talking-head",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: {
        plannerMode: true,
        language: "yue",
        framing: "collarbone-close",
      },
    },
  };
}

// A dropped Swap or Teleport is the director card. Build expands the rows; the card stays.
function swapDirectorNode(position: { x: number; y: number }, prompt = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:swap",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: { directorMode: true, swapMode: "character", sectionStart: 0, sectionLength: 6 },
    },
  };
}

function teleportDirectorNode(position: { x: number; y: number }, prompt = "", sceneText = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:teleport",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: { directorMode: true, sectionStart: 0, sectionLength: 6, sceneText },
    },
  };
}

// A dropped Explainer is the Director card itself. Settings stay on the node; Plan is pressed there.
function explainerDirectorNode(position: { x: number; y: number }, prompt = ""): FlowNode {
  return {
    id: `model-${crypto.randomUUID().slice(0, 8)}`,
    type: "model",
    position,
    data: {
      modelId: "scro:explainer",
      aspectRatio: "9:16",
      prompt,
      status: "idle",
      toolParams: {
        plannerMode: true,
        skillSlug: "cartoon-explainer-video-director",
        language: "yue",
        durationPreset: "30s",
        textStyleId: "handwritten",
        presenterPosition: "auto",
      },
    },
  };
}

// Job results remembered before React paints, so the next flow wave can save them.
type RememberedJobOutput = {
  status: CanvasNodeStatus;
  lastJobId: string;
  lastCostUsd?: number;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  lastError?: string;
};

function withRememberedJobOutputs(
  nodes: readonly FlowNode[],
  remembered: ReadonlyMap<string, RememberedJobOutput>,
): FlowNode[] {
  if (remembered.size === 0) return [...nodes];
  return nodes.map((node) => {
    const job = remembered.get(node.id);
    if (!job) return node;
    return {
      ...node,
      data: {
        ...node.data,
        status: job.status,
        lastJobId: job.lastJobId,
        ...(job.lastCostUsd !== undefined ? { lastCostUsd: job.lastCostUsd } : {}),
        ...(job.outputUrl ? { outputUrl: job.outputUrl } : {}),
        ...(job.outputKind ? { outputKind: job.outputKind } : {}),
        lastError: job.status === "failed" ? job.lastError : undefined,
      },
    };
  });
}

function toFlowNodes(nodes: readonly CanvasNode[]): FlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: { ...n.data },
  }));
}

function toDomainNodes(nodes: readonly FlowNode[]): CanvasNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.type ?? "model") as CanvasNodeType,
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    data: { ...n.data },
  }));
}

function toFlowEdges(
  edges: readonly CanvasEdge[],
  nodes: readonly CanvasNode[],
  catalog: readonly CanvasModelSpec[],
): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((e) => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    const portType = src ? getNodeOutputPortType(src, catalog, e.sourceHandle) : null;
    const stroke = settingsStroke(src) ?? (portType ? PORT_COLOR_MAP[portType] : "#c6f24b");
    const isTargetRunning =
      tgt?.type === "model" &&
      (tgt.data.status === "queued" || tgt.data.status === "running");

    return {
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
      animated: isTargetRunning,
      style: { stroke, strokeWidth: 2 },
    };
  });
}

function toDomainEdges(edges: readonly Edge[]): CanvasEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle || "output",
    target: e.target,
    targetHandle: e.targetHandle || "prompt",
  }));
}

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
  const [assets] = useState<CanvasLibraryAssetsResult>(initialAssets);
  const [creditUsd, setCreditUsd] = useState(initialCreditUsd);
  const [contextRefs, setContextRefs] = useState<CanvasAgentContextRef[]>([]);
  const [nodeMenu, setNodeMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // True while the library dialog is opening or creating another canvas.
  const [isSwitchingProject, startSwitchTransition] = useTransition();
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [lightbox, setLightbox] = useState<CanvasLightboxItem | null>(null);
  const [isFlowRunning, setIsFlowRunning] = useState(
    initialProject.activeFlowRun?.status === "running",
  );
  const [flowWaveProgress, setFlowWaveProgress] = useState<{
    current: number;
    total: number;
  } | null>(
    initialProject.activeFlowRun?.status === "running"
      ? {
          current: initialProject.activeFlowRun.currentWave,
          total: initialProject.activeFlowRun.totalWaves,
        }
      : null,
  );

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
  const flowAbortRef = useRef(false);
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

  const flushSaveNow = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveStatus("saving");
    try {
      const currentNodes = toDomainNodes(
        withRememberedJobOutputs(nodesRef.current, jobOutputRef.current),
      );
      const currentEdges = toDomainEdges(edgesRef.current);
      const res = await saveCanvasProjectAction(activeProjectIdRef.current, {
        nodes: currentNodes,
        edges: currentEdges,
        groups: snapshotGroups(currentNodes),
        viewport: viewportRef.current,
      });
      if (!res.ok) {
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
      setProjects((prev) =>
        prev.map((p) =>
          p.id === res.project.id
            ? {
                ...p,
                title: res.project.title,
                thumbnailUrl: res.project.thumbnailUrl,
                nodeCount: res.project.nodes.length,
                updatedAt: res.project.updatedAt,
              }
            : p,
        ),
      );
    } catch {
      setSaveStatus("error");
    }
  }, [snapshotGroups]);

  const scheduleAutosave = useCallback(() => {
    setSaveStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSaveNow();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [flushSaveNow]);
  useEffect(() => {
    autosaveRef.current = scheduleAutosave;
  }, [scheduleAutosave]);

  // A Setting used to land on model nodes. Drop those wires once the canvas is open.
  useEffect(() => {
    setEdges((prev) => {
      const stripped = withoutModelSettingsEdges(nodesRef.current, prev);
      if (!stripped.dropped) return prev;
      queueMicrotask(() => autosaveRef.current());
      return stripped.edges;
    });
  }, [setEdges]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // A freshly added node group waiting for React Flow to measure its cards.
  // Explainer keeps its row layout; every other group uses the depth columns.
  const pendingGroupLayoutRef = useRef<{
    ids: Set<string>;
    edges: { source: string; target: string }[];
    origin: { x: number; y: number };
    layout: "explainer" | "depth";
  } | null>(null);

  // Re-lays out the group with real card sizes and moves it clear of other nodes.
  const applyPendingGroupLayout = useCallback(() => {
    const pending = pendingGroupLayoutRef.current;
    if (!pending) return;
    const live = reactFlow.getNodes();
    const sizes = new Map<string, LayoutSize>();
    for (const node of live) {
      if (!pending.ids.has(node.id)) continue;
      const width = node.measured?.width;
      const height = node.measured?.height;
      if (!width || !height) return;
      sizes.set(node.id, { width, height });
    }
    pendingGroupLayoutRef.current = null;
    if (sizes.size === 0) return;
    const sizeOf = (id: string) => sizes.get(id) ?? { width: 312, height: 400 };
    const obstacles = live
      .filter((n) => !pending.ids.has(n.id) && n.type !== GROUP_FRAME_TYPE)
      .map((n) => ({
        x: n.position.x,
        y: n.position.y,
        width: n.measured?.width ?? 312,
        height: n.measured?.height ?? 400,
      }));
    const layoutInput = {
      nodeIds: [...sizes.keys()],
      edges: pending.edges,
      origin: pending.origin,
      sizeOf,
    };
    const positions = shiftGroupClearOf(
      pending.layout === "explainer"
        ? layoutExplainerGroup(layoutInput)
        : layoutGroupByDepth(layoutInput),
      sizeOf,
      obstacles,
    );
    setNodes((prev) =>
      prev.map((n) => {
        const at = positions.get(n.id);
        return at ? { ...n, position: at } : n;
      }),
    );
    scheduleAutosave();
    window.setTimeout(() => {
      void reactFlow.fitView({
        nodes: [...positions.keys()].map((id) => ({ id })),
        padding: 0.15,
        duration: 300,
      });
    }, 40);
  }, [reactFlow, setNodes, scheduleAutosave]);

  const handleNodesChange = useCallback(
    (allChanges: NodeChangeset<DisplayNode>) => {
      const lock = planLockRef.current;
      const allowed =
        lock.nodeIds.size === 0 && lock.groupIds.size === 0
          ? allChanges
          : new NodeChangeset(
              allChanges.toArray().filter((change) => {
                const frameGroup = groupIdFromFrameId(change.id);
                if (frameGroup && lock.groupIds.has(frameGroup) && change.type === "position") return false;
                if (lock.nodeIds.has(change.id) && (change.type === "position" || change.type === "remove")) return false;
                return true;
              }),
            );
      // Frame drags move the group's members; the rest are ordinary node changes.
      const { nodeChanges: changes, frameDragEnded } = splitNodeChanges(allowed);
      if (frameDragEnded) scheduleAutosave();
      if (changes.isEmpty()) return;
      onNodesChange(changes);
      if (pendingGroupLayoutRef.current && changes.getByType("dimensions").length > 0) {
        window.requestAnimationFrame(applyPendingGroupLayout);
      }
      const meaningful =
        changes.getByType("position").length > 0 ||
        changes.getByType("remove").length > 0 ||
        changes.getByType("add").length > 0 ||
        changes.getByType("replace").length > 0;
      if (meaningful) scheduleAutosave();
    },
    [onNodesChange, scheduleAutosave, applyPendingGroupLayout, splitNodeChanges],
  );

  // Marks the previews of changed nodes and everything downstream as old versions; Run regenerates them.
  const markStale = useCallback(
    (changedIds: readonly string[]) => {
      if (changedIds.length === 0) return;
      const { staleIds } = markStaleOutputs(
        toDomainNodes(nodesRef.current),
        toDomainEdges(edgesRef.current),
        changedIds,
      );
      if (staleIds.length === 0) return;
      const ids = new Set(staleIds);
      setNodes((prev) =>
        prev.map((n) =>
          ids.has(n.id) && n.data.outputUrl ? { ...n, data: { ...n.data, staleOutputUrl: n.data.outputUrl } } : n,
        ),
      );
    },
    [setNodes],
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      const lock = planLockRef.current.nodeIds;
      const kept =
        lock.size === 0
          ? changes
          : new EdgeChangeset(
              changes.toArray().filter((change) => {
                if (change.type !== "remove") return true;
                const edge = edgesRef.current.find((item) => item.id === change.id);
                return !edge || (!lock.has(edge.source) && !lock.has(edge.target));
              }),
            );
      // Targets that lose an input wire get their previews cleared.
      const removedIds = new Set(kept.getByType("remove").map((c) => c.id));
      const staleTargets = edgesRef.current.filter((e) => removedIds.has(e.id)).map((e) => e.target);
      markStale(staleTargets);
      onEdgesChange(kept);
      const meaningful =
        kept.getByType("remove").length > 0 ||
        kept.getByType("add").length > 0 ||
        kept.getByType("replace").length > 0;
      if (meaningful) scheduleAutosave();
    },
    [onEdgesChange, scheduleAutosave, markStale],
  );

  const onUpdateNodeData = useCallback(
    (nodeId: string, patch: Partial<CanvasNodeData>) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      const current = nodesRef.current.find((n) => n.id === nodeId);
      // A Director edit only makes rows whose wired output text changed old (a text style change).
      if (current && isPlanDirectorNode({ type: "model", data: current.data })) {
        const before = toDomainNodes([current])[0]!;
        const after = { ...before, data: { ...before.data, ...patch } };
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
        markStale(directorChangedTargets(before, after, toDomainEdges(edgesRef.current)));
        scheduleAutosave();
        return;
      }
      const stale = current ? isGenerationInputPatch(current.data, patch) : false;
      // A settings edit only makes the targets whose run values or used `{{key}}` values change old.
      const settingsTargets =
        current?.type === "settings" && patch.settings
          ? settingsStaleTargets(toDomainNodes(nodesRef.current), toDomainEdges(edgesRef.current), nodeId, patch.settings)
          : [];
      // A Swap / Teleport trim edit also sets the render length to the trimmed section.
      const domain = patch.toolParams && current?.data.modelId === "ffmpeg:trim-speed" ? toDomainNodes(nodesRef.current) : [];
      const sync = domain.length
        ? renderDurationForTrim(
            domain,
            snapshotGroups(domain).find((g) => g.memberIds.includes(nodeId)),
            { ...current?.data.toolParams, ...patch.toolParams },
          )
        : undefined;
      const syncRender =
        sync && domain.find((n) => n.id === sync.renderId)?.data.durationSeconds !== sync.durationSeconds ? sync : undefined;
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === nodeId) return { ...n, data: { ...n.data, ...patch } };
          if (n.id === syncRender?.renderId) return { ...n, data: { ...n.data, durationSeconds: syncRender.durationSeconds } };
          return n;
        }),
      );
      if (stale) markStale([nodeId]);
      if (syncRender) markStale([syncRender.renderId]);
      if (settingsTargets.length > 0) markStale(settingsTargets);
      scheduleAutosave();
    },
    [setNodes, scheduleAutosave, markStale, snapshotGroups],
  );

  const onDeleteNode = useCallback(
    (nodeId: string) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      markStale(edgesRef.current.filter((e) => e.source === nodeId).map((e) => e.target));
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      scheduleAutosave();
    },
    [setNodes, setEdges, scheduleAutosave, markStale],
  );

  // Swaps the node's model; its preview becomes an old version and wires the new model cannot take are removed.
  const onSwapModel = useCallback(
    (nodeId: string, modelId: string) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      const next = models.find((spec) => spec.id === modelId);
      if (!next) return;
      const res = swapNodeModel({
        nodes: toDomainNodes(nodesRef.current),
        edges: toDomainEdges(edgesRef.current),
        nodeId,
        next,
        catalog: models,
      });
      if (!res) return;
      markStale([nodeId]);
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...res.data } } : n)));
      if (res.droppedEdgeIds.length > 0) {
        const dropped = new Set(res.droppedEdgeIds);
        setEdges((prev) => prev.filter((e) => !dropped.has(e.id)));
        toast.info(
          isZh
            ? `已更換模型，移除了 ${res.droppedEdgeIds.length} 條新模型不支援的連線`
            : `Model changed; removed ${res.droppedEdgeIds.length} wire(s) the new model does not accept`,
        );
      }
      scheduleAutosave();
    },
    [models, markStale, setNodes, setEdges, scheduleAutosave, isZh],
  );

  // Concat (and any multi-video handle) renders in edge order, so moving a row rewrites that order.
  const onReorderTargetEdges = useCallback(
    (nodeId: string, targetHandle: string, fromIndex: number, toIndex: number) => {
      setEdges((prev) => reorderTargetHandleEdges(prev, nodeId, targetHandle, fromIndex, toIndex));
      scheduleAutosave();
    },
    [setEdges, scheduleAutosave],
  );

  // Guardrail connection check (prevents incompatible port types, self-loops, cycles, over-capacity).
  const isValidConnection = useCallback(
    (edgeOrConnection: Edge | Connection) => {
      const locked = planLockRef.current.nodeIds;
      if (locked.has(edgeOrConnection.source) || locked.has(edgeOrConnection.target)) return false;
      const verdict = validateEdgeConnection(
        toDomainNodes(nodesRef.current),
        toDomainEdges(edgesRef.current),
        {
          source: edgeOrConnection.source,
          sourceHandle: edgeOrConnection.sourceHandle,
          target: edgeOrConnection.target,
          targetHandle: edgeOrConnection.targetHandle,
        },
        models,
        { allowReplaceSingle: true },
      );
      return verdict.valid;
    },
    [models],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const locked = planLockRef.current.nodeIds;
      if (locked.has(connection.source) || locked.has(connection.target)) return;
      const currentNodes = toDomainNodes(nodesRef.current);
      const currentEdges = toDomainEdges(edgesRef.current);
      const verdict = validateEdgeConnection(
        currentNodes,
        currentEdges,
        connection,
        models,
        { allowReplaceSingle: true },
      );
      if (!verdict.valid) {
        toast.error(verdict.reason);
        return;
      }

      const srcNode = currentNodes.find((n) => n.id === connection.source);
      const tgtNode = currentNodes.find((n) => n.id === connection.target);
      const portType = srcNode ? getNodeOutputPortType(srcNode, models) : null;
      const stroke = settingsStroke(srcNode) ?? (portType ? PORT_COLOR_MAP[portType] : "#c6f24b");

      // If target handle is single-value, replace existing edge smoothly.
      const tgtSpec =
        tgtNode?.type === "model" && tgtNode.data.modelId
          ? findCanvasModel(tgtNode.data.modelId, models)
          : undefined;
      const tgtPort = tgtSpec?.inputs.find((p) => p.id === connection.targetHandle);
      const outfitPort =
        tgtNode?.type === "character" ? characterOutfitPort(connection.targetHandle ?? "") : undefined;
      const replaceSingle =
        connection.targetHandle === SETTINGS_HANDLE ||
        (tgtPort && !tgtPort.multiple) ||
        (outfitPort && !outfitPort.multiple);

      setEdges((prev) => {
        const cleaned = replaceSingle
            ? prev.filter(
                (e) =>
                  !(
                    e.target === connection.target &&
                    e.targetHandle === connection.targetHandle
                  ),
              )
            : prev;
        return addEdge(
          {
            ...connection,
            id: `e-${crypto.randomUUID().slice(0, 8)}`,
            style: { stroke, strokeWidth: 2 },
          },
          cleaned,
        );
      });
      if (connection.target) markStale([connection.target]);
      scheduleAutosave();
    },
    [models, setEdges, scheduleAutosave, markStale],
  );

  const getCenterPosition = useCallback(() => {
    const jitter = ((nodesRef.current.length * 37) % 120) - 60;
    try {
      return reactFlow.screenToFlowPosition({
        x: window.innerWidth * 0.55 + jitter,
        y: window.innerHeight * 0.45 + jitter,
      });
    } catch {
      return { x: 240 + jitter, y: 140 + jitter };
    }
  }, [reactFlow]);

  // Life / Poster setup dialog; submit lands a visible node group.
  const [scroDialog, setScroDialog] = useState<ScroDialogState>(null);

  // Lands a Swap or Teleport group (or a dialog-built Life / Poster group) and re-lays it out.
  const placeScroGroup = useCallback(
    (group: ScroGroup, tool: ScroDialogTool, origin: { x: number; y: number }) => {
      const allNodes = [...toDomainNodes(nodesRef.current), ...group.nodes];
      setNodes((prev) => [...prev, ...toFlowNodes(group.nodes)]);
      setEdges((prev) => [...prev, ...toFlowEdges(group.edges, allNodes, models)]);
      addGroup({
        id: group.groupId,
        title: defaultGroupTitle(tool),
        color: defaultGroupColor(tool),
        kind: tool,
        memberIds: group.nodes.map((n) => n.id),
      });
      pendingGroupLayoutRef.current = {
        ids: new Set(group.nodes.map((n) => n.id)),
        edges: group.edges,
        origin,
        layout: "depth",
      };
      scheduleAutosave();
      window.setTimeout(applyPendingGroupLayout, 600);
    },
    [models, setNodes, setEdges, addGroup, scheduleAutosave, applyPendingGroupLayout],
  );

  const addModelNodeAt = useCallback(
    (modelId: string, position?: { x: number; y: number }) => {
      const spec = findCanvasModel(modelId, models);
      if (!spec) return;
      const pos = position ?? getCenterPosition();
      // Directors land ready to edit. The user sets them on the node; nothing asks first.
      if (spec.id === "scro:explainer") {
        setNodes((prev) => [...prev, explainerDirectorNode(pos)]);
        scheduleAutosave();
        return;
      }
      if (spec.id === "scro:talking-head") {
        setNodes((prev) => [...prev, talkingHeadDirectorNode(pos)]);
        scheduleAutosave();
        return;
      }
      if (spec.id === "scro:swap" || spec.id === "scro:teleport") {
        const card = spec.id === "scro:swap" ? swapDirectorNode(pos) : teleportDirectorNode(pos);
        setNodes((prev) => [...prev, card]);
        scheduleAutosave();
        return;
      }
      const dialogTool = SCRO_DIALOG_TOOL_BY_MODEL[spec.id];
      if (dialogTool) {
        setScroDialog({ tool: dialogTool, position: pos });
        return;
      }
      const newNode: FlowNode = {
        id: `model-${crypto.randomUUID().slice(0, 8)}`,
        type: "model",
        position: pos,
        data: {
          modelId: spec.id,
          presetId: spec.defaultPresetId,
          aspectRatio: spec.supportsAspectRatio ? "16:9" : undefined,
          resolution: spec.supportsResolution ? "2k" : undefined,
          durationSeconds: spec.defaultDurationSeconds,
          prompt: "",
          status: "idle",
        },
      };
      setNodes((prev) => [...prev, newNode]);
      scheduleAutosave();
    },
    [models, getCenterPosition, setNodes, scheduleAutosave],
  );

  const addAssetNodeAt = useCallback(
    (asset: CanvasLibraryAsset, position?: { x: number; y: number }) => {
      const pos = position ?? getCenterPosition();
      const draft = libraryAssetNodeDraft(asset);
      const id = `${draft.type}-${crypto.randomUUID().slice(0, 8)}`;
      let place = pos;
      let outfitEdge: CanvasEdge | undefined;
      if (asset.source === "outfit" && position) {
        const targetId = findCharacterNodeAt(nodesRef.current, position);
        if (targetId) {
          const handle = outfitHandleForPart(asset.outfitPart);
          place = { x: pos.x - 320, y: pos.y };
          const port = characterOutfitPort(handle);
          if (port && !port.multiple) {
            setEdges((prev) =>
              prev.filter((edge) => !(edge.target === targetId && edge.targetHandle === handle)),
            );
          }
          outfitEdge = {
            id: `e-${crypto.randomUUID().slice(0, 8)}`,
            source: id,
            sourceHandle: "output",
            target: targetId,
            targetHandle: handle,
          };
        }
      }
      const newNode: FlowNode = {
        id,
        type: draft.type,
        position: place,
        data: draft.data,
      };
      setNodes((prev) => [...prev, newNode]);
      if (outfitEdge) {
        const stroke = PORT_COLOR_MAP.image;
        setEdges((prev) =>
          addEdge({ ...outfitEdge, style: { stroke, strokeWidth: 2 } }, prev),
        );
      }
      scheduleAutosave();
    },
    [getCenterPosition, setNodes, setEdges, scheduleAutosave],
  );

  // Hand-added empty Setting node; wire it into a Director, model, or Prompt node.
  const addSettingsNode = useCallback(
    (position?: { x: number; y: number }) => {
      const newNode: FlowNode = {
        id: `settings-${crypto.randomUUID().slice(0, 8)}`,
        type: "settings",
        position: position ?? getCenterPosition(),
        data: { label: "Setting", settings: { vars: {} } },
      };
      setNodes((prev) => [...prev, newNode]);
      scheduleAutosave();
    },
    [getCenterPosition, setNodes, scheduleAutosave],
  );

  const addPromptNode = useCallback((position?: { x: number; y: number }) => {
    const pos = position ?? getCenterPosition();
    const newNode: FlowNode = {
      id: `prompt-${crypto.randomUUID().slice(0, 8)}`,
      type: "prompt",
      position: pos,
      data: { label: "Prompt", text: "" },
    };
    setNodes((prev) => [...prev, newNode]);
    scheduleAutosave();
  }, [getCenterPosition, setNodes, scheduleAutosave]);

  const uploadAndPlaceFiles = useCallback(
    async (files: FileList | File[], dropPosition?: { x: number; y: number }) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setIsUploading(true);
      try {
        const basePos = dropPosition ?? getCenterPosition();
        let offset = 0;
        for (const file of list) {
          const fd = new FormData();
          fd.append("file", file);
          const result = await uploadCanvasMediaAction(fd);
          if (!result.ok) {
            toast.error(result.error);
            continue;
          }
          const node: FlowNode = {
            id: `media-${crypto.randomUUID().slice(0, 8)}`,
            type: "media",
            position: { x: basePos.x + offset, y: basePos.y + offset },
            data: {
              label: result.fileName,
              fileName: result.fileName,
              mediaKind: result.mediaKind,
              mediaUrl: result.url,
            },
          };
          offset += 44;
          setNodes((prev) => [...prev, node]);
          scheduleAutosave();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [getCenterPosition, setNodes, scheduleAutosave],
  );

  // Applies polled or completed job updates back into React Flow node state.
  const applyJobUpdates = useCallback(
    (jobs: readonly CanvasJobDto[]) => {
      if (jobs.length === 0) return;
      const byNodeId = new Map<string, CanvasJobDto>();
      for (const job of jobs) {
        byNodeId.set(job.nodeId, job);
      }

      for (const job of jobs) {
        const previous = jobOutputRef.current.get(job.nodeId);
        const outputUrl = job.outputUrl ?? previous?.outputUrl;
        const outputKind = job.outputKind ?? previous?.outputKind;
        jobOutputRef.current.set(job.nodeId, {
          status: job.status,
          lastJobId: job.id,
          lastCostUsd: job.chargedUsd,
          ...(outputUrl ? { outputUrl } : {}),
          ...(outputKind ? { outputKind } : {}),
          ...(job.status === "failed" && job.error ? { lastError: job.error } : {}),
        });
      }

      setNodes((prev) =>
        withRememberedJobOutputs(prev, jobOutputRef.current),
      );

      // Update animated edge state for running targets.
      setEdges((prev) =>
        prev.map((e) => {
          const job = byNodeId.get(e.target);
          if (!job) return e;
          return {
            ...e,
            animated: job.status === "queued" || job.status === "running",
          };
        }),
      );
    },
    [setNodes, setEdges],
  );

  // Active-job 3-second polling loop (completely idle when no node is queued/running).
  const activeJobIds = useMemo(() => {
    const ids: string[] = [];
    for (const node of nodes) {
      if (
        node.type === "model" &&
        (node.data.status === "queued" || node.data.status === "running") &&
        node.data.lastJobId
      ) {
        ids.push(node.data.lastJobId);
      }
    }
    return ids;
  }, [nodes]);

  const activeJobIdsKey = activeJobIds.join(",");

  useEffect(() => {
    if (!activeJobIdsKey || isFlowRunning) return;
    const jobIds = activeJobIdsKey.split(",");
    let alive = true;

    const timer = window.setInterval(async () => {
      try {
        const res = await pollCanvasJobsAction({
          canvasId: activeProjectIdRef.current,
          jobIds,
        });
        if (!alive) return;
        applyJobUpdates(res.jobs);
        syncWallet(res.creditUsd);
      } catch {
        // Keep polling silently on transient network hiccups.
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [activeJobIdsKey, isFlowRunning, applyJobUpdates, syncWallet]);

  const onRunNode = useCallback(
    async (nodeId: string) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: "queued", lastError: undefined } }
            : n,
        ),
      );
      try {
        const res = await runCanvasNodeAction({
          canvasId: activeProjectIdRef.current,
          nodeId,
          nodes: toDomainNodes(
            withRememberedJobOutputs(nodesRef.current, jobOutputRef.current),
          ),
          edges: toDomainEdges(edgesRef.current),
          viewport: viewportRef.current,
        });
        syncWallet(res.creditUsd);
        if (!res.ok) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      status: "failed",
                      lastError: res.error,
                    },
                  }
                : n,
            ),
          );
          scheduleAutosave();
          if (res.code === "INSUFFICIENT_CREDIT") {
            toast.error(
              isZh
                ? `USD Credit 餘額不足（需 ${formatUsd(res.requiredUsd ?? 0)}，剩餘 ${formatUsd(res.availableUsd ?? 0)}），請先前往加值`
                : `Insufficient USD Credit (need ${formatUsd(res.requiredUsd ?? 0)}, remaining ${formatUsd(res.availableUsd ?? 0)})`,
            );
          } else {
            toast.error(res.error);
          }
          return;
        }
        if ("waitingForUpstream" in res) {
          setIsFlowRunning(true);
          setFlowWaveProgress({ current: res.activeFlowRun.currentWave, total: res.activeFlowRun.totalWaves });
          setSaveStatus("saved");
          toast.info(isZh ? "上游還在執行，完成後會自動執行這個節點" : "Waiting for the upstream node; this node runs when it finishes");
          return;
        }
        applyJobUpdates([res.job]);
        setSaveStatus("saved");
        if (res.job.status === "completed") {
          toast.success(
            isZh
              ? `節點完成（扣除 ${formatUsd(res.job.chargedUsd)}）`
              : `Node completed (${formatUsd(res.job.chargedUsd)})`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Execution failed";
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: "failed", lastError: msg } }
              : n,
          ),
        );
        scheduleAutosave();
        toast.error(msg);
      }
    },
    [setNodes, syncWallet, applyJobUpdates, isZh, scheduleAutosave],
  );

  // Free Explainer planning: mark the card as planning, save the graph, then queue Phase A.
  // `graph` lets callers that just added the card (dialog, AI assistant) pass the fresh state.
  const startDirectorPlan = useCallback(
    async (nodeId: string, graph?: { nodes: FlowNode[]; edges: Edge[] }) => {
      const baseNodes = graph?.nodes ?? nodesRef.current;
      const nextEdges = graph?.edges ?? edgesRef.current;
      if (!baseNodes.some((n) => n.id === nodeId)) return;
      const markPlanning = (n: FlowNode): FlowNode =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                toolParams: {
                  ...n.data.toolParams,
                  planStatus: "planning",
                  planError: undefined,
                  planStage: undefined,
                  plannerVideoId: undefined,
                  replanRequested: undefined,
                },
              },
            }
          : n;
      const nextNodes = baseNodes.map(markPlanning);
      setNodes((prev) =>
        prev.some((n) => n.id === nodeId) ? prev.map(markPlanning) : nextNodes,
      );
      try {
        const res = await startCanvasExplainerPlanAction({
          canvasId: activeProjectIdRef.current,
          nodeId,
          nodes: toDomainNodes(withRememberedJobOutputs(nextNodes, jobOutputRef.current)),
          edges: toDomainEdges(nextEdges),
          viewport: viewportRef.current,
        });
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    toolParams: res.ok
                      ? { ...n.data.toolParams, plannerVideoId: res.plannerVideoId, planStatus: "planning" }
                      : { ...n.data.toolParams, planStatus: "failed", planError: res.error },
                  },
                }
              : n,
          ),
        );
        if (!res.ok) {
          runAfterReplanRef.current.delete(nodeId);
          toast.error(res.error);
        }
      } catch (err) {
        runAfterReplanRef.current.delete(nodeId);
        const msg = err instanceof Error ? err.message : "Planning failed";
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    toolParams: { ...n.data.toolParams, planStatus: "failed", planError: msg },
                  },
                }
              : n,
          ),
        );
        toast.error(msg);
      }
      scheduleAutosave();
    },
    [setNodes, scheduleAutosave],
  );

  const onPlanExplainer = useCallback(
    (nodeId: string) => void startDirectorPlan(nodeId),
    [startDirectorPlan],
  );

  // Card label for the Replan confirm: model name, plus the clip number from a Director row id.
  const runNodeLabel = useCallback(
    (nodeId: string) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      const spec = node?.data.modelId ? findCanvasModel(node.data.modelId, models) : undefined;
      const name = spec?.name ?? node?.data.label ?? node?.data.modelId ?? nodeId;
      const clip = /-(\d+)$/.exec(nodeId)?.[1];
      return clip ? `${name} · Clip ${clip}` : name;
    },
    [models],
  );

  // Run / Re-run on a card: a Director changed since its last plan asks to Replan first.
  const requestRunNode = useCallback(
    async (nodeId: string) => {
      if (planLockRef.current.nodeIds.has(nodeId)) return;
      const need = replanBeforeRun(toDomainNodes(nodesRef.current), toDomainEdges(edgesRef.current), nodeId);
      if (!need) return onRunNode(nodeId);
      setReplanRun({
        nodeId,
        directorId: need.directorId,
        nodeLabel: runNodeLabel(nodeId),
        affected: need.affectedIds.map((id) => ({ id, label: runNodeLabel(id) })),
      });
    },
    [onRunNode, runNodeLabel],
  );

  const cancelReplanRun = useCallback(() => setReplanRun(null), []);

  const confirmReplanRun = useCallback(() => {
    if (!replanRun) return;
    setReplanRun(null);
    runAfterReplanRef.current.set(replanRun.directorId, replanRun.nodeId);
    void startDirectorPlan(replanRun.directorId);
  }, [replanRun, startDirectorPlan]);

  const closeScroDialog = useCallback(() => setScroDialog(null), []);

  // Adds a dialog-built Life or Poster group at the spot the dialog was opened from.
  const insertScroGroup = useCallback(
    (group: ScroGroup, tool: ScroDialogTool) => {
      const origin = scroDialog?.position ?? group.nodes[0]?.position ?? { x: 0, y: 0 };
      setScroDialog(null);
      placeScroGroup(group, tool, origin);
    },
    [scroDialog, placeScroGroup],
  );

  // Images and videos already on the canvas, offered first in the setup dialogs.
  const canvasMedia = useMemo<CanvasMediaItem[]>(
    () =>
      nodes.flatMap((n): CanvasMediaItem[] => {
        if (n.type === "media" && n.data.mediaUrl && n.data.mediaKind) {
          return [{
            nodeId: n.id,
            label: n.data.fileName ?? n.data.label ?? n.id,
            mediaKind: n.data.mediaKind,
            url: n.data.mediaUrl,
          }];
        }
        if (n.type === "character") {
          const url = n.data.outputUrl || n.data.mediaUrl;
          if (!url) return [];
          return [{
            nodeId: n.id,
            label: n.data.label ?? n.data.fileName ?? n.id,
            mediaKind: "image",
            url,
          }];
        }
        if (n.type === "model" && n.data.outputUrl && n.data.outputKind) {
          const spec = n.data.modelId ? findCanvasModel(n.data.modelId, models) : undefined;
          return [{
            nodeId: n.id,
            label: spec?.name ?? n.data.modelId ?? n.id,
            mediaKind: n.data.outputKind,
            url: n.data.outputUrl,
          }];
        }
        return [];
      }),
    [nodes, models],
  );

  // Directors whose rows are still being placed one node at a time.
  const revealTimersRef = useRef<Map<string, number>>(new Map());
  const stopReveal = useCallback((directorId: string) => {
    const timer = revealTimersRef.current.get(directorId);
    if (timer !== undefined) window.clearInterval(timer);
    revealTimersRef.current.delete(directorId);
  }, []);
  useEffect(() => {
    const timers = revealTimersRef.current;
    return () => {
      for (const timer of timers.values()) window.clearInterval(timer);
      timers.clear();
    };
  }, []);

  // Measured re-layout of a Director's rows once their cards render.
  const layoutDirectorRows = useCallback(
    (directorId: string, expanded: ExpandedDirectorRows) => {
      const first = expanded.nodes[0];
      const talkingHead = nodesRef.current.find((n) => n.id === directorId)?.data.modelId === "scro:talking-head";
      pendingGroupLayoutRef.current = {
        ids: new Set(expanded.nodes.map((n) => n.id)),
        edges: expanded.edges.filter((e) => e.source !== directorId),
        origin: first ? first.position : { x: 0, y: 0 },
        layout: talkingHead ? "depth" : "explainer",
      };
      window.setTimeout(applyPendingGroupLayout, 600);
      scheduleAutosave();
    },
    [applyPendingGroupLayout, scheduleAutosave],
  );

  // Puts a Director's rows on the canvas. Rows this plan already placed take the final data;
  // otherwise old rows go and the new ones appear one node at a time, wires following.
  const placeDirectorRows = useCallback(
    (directorId: string, expanded: ExpandedDirectorRows, replaceOld: boolean) => {
      stopReveal(directorId);
      const domain = toDomainNodes(nodesRef.current);
      const oldGroup = snapshotGroups(domain).find((g) => g.memberIds.includes(directorId));
      const allNodes = [...domain, ...expanded.nodes];
      const flow = { nodes: toFlowNodes(expanded.nodes), edges: toFlowEdges(expanded.edges, allNodes, models) };

      if (oldGroup?.id === expanded.group.id) {
        const present = new Set(nodesRef.current.map((n) => n.id));
        setNodes((prev) => mergeDirectorRows({ nodes: prev, edges: [] }, { nodes: flow.nodes, edges: [] }).nodes);
        setEdges((prev) => mergeDirectorRows({ nodes: [], edges: prev }, { nodes: [], edges: flow.edges }).edges);
        addGroup(expanded.group);
        if (flow.nodes.some((n) => !present.has(n.id))) layoutDirectorRows(directorId, expanded);
        else scheduleAutosave();
        return;
      }

      const removed = new Set(
        replaceOld && oldGroup ? oldGroup.memberIds.filter((id) => id !== directorId) : [],
      );
      if (oldGroup && removed.size > 0) {
        const clear = { directorId, expansion: { nodes: [], edges: [] }, replaceGroup: oldGroup };
        setNodes((prev) => applyDirectorBuild({ nodes: prev, edges: [] }, clear).nodes);
        setEdges((prev) => applyDirectorBuild({ nodes: [], edges: prev }, clear).edges);
        updateGroups((prev) => prev.filter((g) => g.id !== oldGroup.id));
      }
      addGroup(expanded.group);
      const kept = nodesRef.current.map((n) => n.id).filter((id) => !removed.has(id));
      const steps = directorRevealSteps(flow, [directorId, ...kept]);
      let index = 0;
      const timer = window.setInterval(() => {
        const step = steps[index++];
        if (!step) {
          stopReveal(directorId);
          layoutDirectorRows(directorId, expanded);
          return;
        }
        setNodes((prev) => (prev.some((n) => n.id === step.node.id) ? prev : [...prev, step.node]));
        if (step.edges.length > 0) {
          setEdges((prev) => [...prev, ...step.edges.filter((e) => !prev.some((p) => p.id === e.id))]);
        }
      }, DIRECTOR_REVEAL_STEP_MS);
      revealTimersRef.current.set(directorId, timer);
    },
    [models, setNodes, setEdges, snapshotGroups, updateGroups, addGroup, stopReveal, layoutDirectorRows, scheduleAutosave],
  );

  // Phase A is in: place the rows now while still prompts and reference stills are made.
  const onDirectorPlanBuilding = useCallback(
    (nodeId: string, state: Extract<CanvasExplainerPlanState, { status: "building" }>) => {
      const director = nodesRef.current.find((n) => n.id === nodeId);
      if (!director || !state.plan) return;
      const toolParams = director.data.toolParams ?? {};
      const drafting = toolParams.planDraft === true;
      // A Replan keeps the rows it already has until the plan is finished.
      const firstBuild = drafting || !readDirectorPlan(toDomainNodes([director])[0]!);
      const placed = snapshotGroups(toDomainNodes(nodesRef.current)).some(
        (g) => g.id === state.group.id && g.memberIds.includes(nodeId),
      );
      const setParams = (next: typeof toolParams) =>
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, toolParams: next } } : n)));

      if (firstBuild && !placed) {
        setParams({ ...toolParams, plan: state.plan, planDraft: true, planStage: state.stage });
        // A retried draft drops the rows the failed attempt placed.
        placeDirectorRows(nodeId, state, drafting);
      } else if (toolParams.planStage !== state.stage) {
        setParams({ ...toolParams, planStage: state.stage });
        scheduleAutosave();
      }
    },
    [setNodes, snapshotGroups, placeDirectorRows, scheduleAutosave],
  );

  // Stores a finished plan on its Director and always builds its rows: first plan, rows placed
  // while planning, or a Replan with a new clip count. Same-count Replans update in place.
  const onDirectorPlanReady = useCallback(
    (nodeId: string, state: Extract<CanvasExplainerPlanState, { status: "ready" }>) => {
      const director = nodesRef.current.find((n) => n.id === nodeId);
      if (!director || !state.plan) return;
      const before = toDomainNodes([director])[0]!;
      const drafting = director.data.toolParams?.planDraft === true;
      const oldPlan = drafting ? undefined : readDirectorPlan(before);
      const toolParams = {
        ...director.data.toolParams,
        plan: state.plan,
        planStatus: "planned",
        planningWith: undefined,
        planDraft: undefined,
        planStage: undefined,
      };
      const after = { ...before, data: { ...before.data, toolParams } };
      const changed = directorChangedTargets(before, after, toDomainEdges(edgesRef.current));
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, toolParams } } : n)));
      // A Run that asked for this Replan goes ahead once the rows keep their ids.
      const waitingRun = runAfterReplanRef.current.get(nodeId);
      runAfterReplanRef.current.delete(nodeId);
      if (oldPlan && oldPlan.clips.length === state.plan.clips.length) {
        // Rows keep their ids, so wires stay. Reference stills and voice settings still follow the new plan.
        const memberIds =
          snapshotGroups(toDomainNodes(nodesRef.current)).find((g) => g.memberIds.includes(nodeId))?.memberIds ??
          [];
        const synced = syncDirectorReplanRows(
          { nodes: toDomainNodes(nodesRef.current), edges: toDomainEdges(edgesRef.current) },
          { nodes: state.nodes, edges: state.edges },
          memberIds,
        );
        const syncedById = new Map(synced.nodes.map((n) => [n.id, n]));
        setNodes((prev) => {
          const kept = prev.flatMap((n) => {
            if (n.id === nodeId) return [{ ...n, data: { ...n.data, toolParams } }];
            const row = syncedById.get(n.id);
            return row ? [{ ...n, data: row.data }] : [];
          });
          const have = new Set(kept.map((n) => n.id));
          return [...kept, ...toFlowNodes(synced.nodes.filter((n) => !have.has(n.id)))];
        });
        setEdges(toFlowEdges(synced.edges, synced.nodes, models));
        if (synced.addedIds.length > 0 || synced.removedIds.length > 0) {
          const drop = new Set(synced.removedIds);
          updateGroups((prev) =>
            prev.map((g) => {
              if (!g.memberIds.includes(nodeId)) return g;
              const ids = g.memberIds.filter((id) => !drop.has(id));
              for (const id of synced.addedIds) if (!ids.includes(id)) ids.push(id);
              return { ...g, memberIds: ids };
            }),
          );
        }
        markStale([...changed, ...synced.changedIds]);
        if (waitingRun) {
          setReplannedRunId(waitingRun);
          toast.success(
            isZh ? "已更新規劃，正在重新生成；其他舊版本節點要再 Run" : "Plan updated; regenerating now. Other old versions need another Run",
          );
        } else {
          toast.success(isZh ? "已更新規劃，按 Run group 重新生成" : "Plan updated; press Run group to regenerate");
        }
        scheduleAutosave();
        return;
      }
      if (waitingRun) {
        toast.info(
          isZh ? "片段數量改變，已重建所有列，請在新的列再按 Run" : "Clip count changed and the rows were rebuilt; press Run on the new row",
        );
      }
      placeDirectorRows(nodeId, state, Boolean(oldPlan) || drafting);
    },
    [setNodes, setEdges, markStale, scheduleAutosave, placeDirectorRows, snapshotGroups, updateGroups, models, isZh],
  );

  // Planning cards waiting on the worker (polled like canvas jobs).
  const planningNodeIdsKey = useMemo(
    () =>
      nodes
        .filter((n) => {
          if (n.type !== "model" || !isExplainerPlannerNode({ type: "model", data: n.data })) {
            return false;
          }
          const plan = readPlannerParams(n);
          return plan.planStatus === "planning" && Boolean(plan.plannerVideoId);
        })
        .map((n) => n.id)
        .join(","),
    [nodes],
  );

  useEffect(() => {
    if (!planningNodeIdsKey) return;
    const ids = planningNodeIdsKey.split(",");
    let alive = true;
    let inFlight = false;

    const setPlannerParams = (nodeId: string, patch: Record<string, unknown>) =>
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, toolParams: { ...n.data.toolParams, ...patch } } }
            : n,
        ),
      );

    const timer = window.setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        for (const nodeId of ids) {
          const state = await getCanvasExplainerPlanAction({
            canvasId: activeProjectIdRef.current,
            nodeId,
          }).catch(() => null);
          if (!alive || !state || state.status === "planning") continue;
          const planner = nodesRef.current.find((n) => n.id === nodeId);
          // Another tick already handled (or removed) this planning card.
          if (!planner || readPlannerParams(planner).planStatus !== "planning") continue;
          if (state.status === "failed") {
            runAfterReplanRef.current.delete(nodeId);
            setPlannerParams(nodeId, { planStatus: "failed", planError: state.error, planStage: undefined });
            scheduleAutosave();
            continue;
          }
          if (state.status === "building") {
            onDirectorPlanBuilding(nodeId, state);
            continue;
          }
          // A Director keeps its card and stores the plan; it never swaps itself for the rows.
          if (state.plan && isPlanDirectorNode({ type: "model", data: planner.data })) {
            onDirectorPlanReady(nodeId, state);
            continue;
          }
          // The planning card disappears; only the expanded per-clip nodes remain.
          const allNodes = [...toDomainNodes(nodesRef.current), ...state.nodes];
          const next = replacePlannerWithExpansion(
            { nodes: nodesRef.current, edges: edgesRef.current },
            nodeId,
            {
              nodes: toFlowNodes(state.nodes),
              edges: toFlowEdges(state.edges, allNodes, models),
            },
          );
          // Measured re-layout runs once the new cards render (and as a fallback after a beat).
          pendingGroupLayoutRef.current = {
            ids: new Set(state.nodes.map((n) => n.id)),
            edges: state.edges,
            origin: planner.position,
            layout: planner.data.modelId === "scro:talking-head" ? "depth" : "explainer",
          };
          setNodes(next.nodes);
          setEdges(next.edges);
          addGroup(state.group);
          scheduleAutosave();
          window.setTimeout(applyPendingGroupLayout, 600);
        }
      } finally {
        inFlight = false;
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [
    planningNodeIdsKey,
    models,
    setNodes,
    setEdges,
    addGroup,
    scheduleAutosave,
    applyPendingGroupLayout,
    onDirectorPlanReady,
    onDirectorPlanBuilding,
  ]);

  // Worker-driven multi-wave flow polling loop (survives page reloads & closed tabs).
  useEffect(() => {
    if (!isFlowRunning) return;
    let alive = true;

    const timer = window.setInterval(async () => {
      try {
        const res = await pollCanvasFlowAction(activeProjectIdRef.current);
        if (!alive) return;
        syncWallet(res.creditUsd);

        for (const node of res.nodes) {
          if (node.type !== "model") continue;
          if (node.data.lastJobId) {
            jobOutputRef.current.set(node.id, {
              status: node.data.status ?? "idle",
              lastJobId: node.data.lastJobId,
              lastCostUsd: node.data.lastCostUsd,
              outputUrl: node.data.outputUrl,
              outputKind: node.data.outputKind,
              lastError: node.data.lastError,
            });
          }
        }
        setNodes((prev) =>
          prev.map((flowNode) => {
            const serverNode = res.nodes.find((n) => n.id === flowNode.id);
            if (!serverNode) return flowNode;
            return {
              ...flowNode,
              data: { ...flowNode.data, ...serverNode.data },
            };
          }),
        );
        setEdges((prev) =>
          prev.map((e) => {
            const targetNode = res.nodes.find((n) => n.id === e.target);
            const busy =
              targetNode?.type === "model" &&
              (targetNode.data.status === "queued" || targetNode.data.status === "running");
            return { ...e, animated: Boolean(busy) };
          }),
        );

        const run = res.activeFlowRun;
        if (!run || run.status !== "running") {
          setIsFlowRunning(false);
          setFlowWaveProgress(null);
          if (run?.status === "completed") {
            toast.success(isZh ? "整條工作流執行完成！" : "Workflow completed!");
          } else if (run?.status === "failed") {
            toast.error(
              isZh
                ? `工作流結束（${run.failedNodeIds.length} 個節點失敗並已自動退費）`
                : `Workflow finished (${run.failedNodeIds.length} node(s) failed & refunded)`,
            );
          }
        } else {
          setFlowWaveProgress({ current: run.currentWave, total: run.totalWaves });
        }
      } catch {
        // Keep polling silently on transient network hiccups.
      }
    }, JOB_POLL_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [isFlowRunning, isZh, setEdges, setNodes, syncWallet]);

  // Worker-backed multi-wave Run Flow trigger; nodeIds limits it to one group.
  const startFlowRun = useCallback(async (nodeIds?: string[]) => {
    const currentNodes = toDomainNodes(
      withRememberedJobOutputs(nodesRef.current, jobOutputRef.current),
    );
    const currentEdges = toDomainEdges(edgesRef.current);

    let waves: string[][];
    try {
      waves = computeExecutionWaves(currentNodes, currentEdges);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid graph");
      return;
    }
    const locked = planLockRef.current.nodeIds;
    if (nodeIds) waves = waves.map((w) => w.filter((id) => nodeIds.includes(id))).filter((w) => w.length);
    if (locked.size > 0) waves = waves.map((w) => w.filter((id) => !locked.has(id))).filter((w) => w.length);
    if (waves.length === 0) return;
    const limitTo = nodeIds || locked.size > 0 ? waves.flat() : undefined;

    const res = await runCanvasFlowAction({
      canvasId: activeProjectIdRef.current,
      nodes: currentNodes,
      edges: currentEdges,
      viewport: viewportRef.current,
      ...(limitTo ? { nodeIds: limitTo } : {}),
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    syncWallet(res.creditUsd);
    setIsFlowRunning(true);
    setFlowWaveProgress({
      current: res.activeFlowRun.currentWave,
      total: res.activeFlowRun.totalWaves,
    });
  }, [syncWallet]);

  const handleRunFlow = useCallback(() => void startFlowRun(), [startFlowRun]);

  // Run group: only the group's model nodes run, in dependency order.
  const handleRunGroup = useCallback(
    (groupId: string) => {
      if (planLockRef.current.groupIds.has(groupId)) return;
      const group = groupsApi.groups.find((g) => g.id === groupId);
      if (!group) return;
      const members = new Set(group.memberIds);
      const runnable = nodesRef.current
        .filter((n) => members.has(n.id) && n.type === "model" && !isScroDirectorNode(n))
        .map((n) => n.id);
      if (runnable.length === 0) return;
      void startFlowRun(runnable);
    },
    [groupsApi.groups, startFlowRun],
  );

  // Build replaces the previous trim → render → grade rows and keeps the director card.
  const handleBuildScroDirector = useCallback(
    (nodeId: string) => {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node || !isScroDirectorNode(node)) return;
      const swap = isSwapDirectorNode(node);
      const videoNodeId = edgesRef.current.find((e) => e.target === nodeId && e.targetHandle === "video")?.source;
      const referenceNodeId = edgesRef.current.find(
        (e) => e.target === nodeId && e.targetHandle === (swap ? "refImages" : "image"),
      )?.source;
      const builtGroupId =
        typeof node.data.toolParams?.builtGroupId === "string" && node.data.toolParams.builtGroupId
          ? node.data.toolParams.builtGroupId
          : `${swap ? "swap" : "teleport"}-${crypto.randomUUID().slice(0, 6)}`;
      const input = {
        directorId: nodeId,
        videoNodeId,
        referenceNodeId,
        idPrefix: builtGroupId,
        origin: { x: node.position.x + 380, y: node.position.y },
      };
      const built = swap ? buildSwapDirectorGroup(node, input) : buildTeleportDirectorGroup(node, input);
      if ("error" in built) {
        toast.error(scroDirectorBuildMessage(built.error, isZh));
        return;
      }
      const previous = new Set(readExpandedNodeIds(node.data));
      if (previous.size > 0) {
        markStale(
          edgesRef.current
            .filter((e) => previous.has(e.source) && !previous.has(e.target))
            .map((e) => e.target),
        );
      }
      const kind = swap ? "swap" : "teleport";
      setNodes((prev) => [
        ...prev
          .filter((n) => !previous.has(n.id))
          .map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    toolParams: {
                      ...(n.data.toolParams ?? {}),
                      directorMode: true,
                      builtGroupId,
                      expandedNodeIds: built.expandedNodeIds,
                    },
                  },
                }
              : n,
          ),
        ...toFlowNodes(built.group.nodes),
      ]);
      setEdges((prev) => [
        ...prev.filter((e) => !previous.has(e.source) && !previous.has(e.target)),
        ...toFlowEdges(
          built.group.edges,
          [...toDomainNodes(nodesRef.current).filter((n) => !previous.has(n.id)), ...built.group.nodes],
          models,
        ),
      ]);
      // A plain object widens kind to string; the CanvasGroup type keeps "swap" | "teleport".
      const frame: CanvasGroup = {
        id: builtGroupId,
        title: defaultGroupTitle(kind),
        color: defaultGroupColor(kind),
        kind,
        memberIds: built.memberIds,
      };
      updateGroups((prev) =>
        prev.some((g) => g.id === builtGroupId)
          ? prev.map((g) => (g.id === builtGroupId ? { ...g, memberIds: built.memberIds } : g))
          : withGroup(prev, frame),
      );
      pendingGroupLayoutRef.current = {
        ids: new Set(built.expandedNodeIds),
        edges: built.group.edges,
        origin: input.origin,
        layout: "depth",
      };
      scheduleAutosave();
      window.setTimeout(applyPendingGroupLayout, 600);
    },
    [isZh, models, markStale, setNodes, setEdges, updateGroups, scheduleAutosave, applyPendingGroupLayout],
  );

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

  const handleStopFlow = useCallback(async () => {
    flowAbortRef.current = true;
    await stopCanvasFlowAction(activeProjectIdRef.current).catch(() => {});
    setIsFlowRunning(false);
    setFlowWaveProgress(null);
    toast.info(isZh ? "已停止後續波次執行" : "Stopped remaining flow waves");
  }, [isZh]);

  // Project switcher / CRUD handlers. The transition stays pending until the next canvas renders.
  const handleSelectProject = useCallback(
    (projectId: string) => {
      startSwitchTransition(() => {
        router.push(`/app/canvas?id=${encodeURIComponent(projectId)}`);
      });
    },
    [router],
  );

  const handleCreateProject = useCallback(async (folderId?: string) => {
    setIsCreatingProject(true);
    try {
      const { project } = await createCanvasProjectAction({
        title: isZh ? "未命名畫布" : "Untitled Canvas",
        ...(folderId ? { folderId } : {}),
      });
      startSwitchTransition(() => {
        router.push(`/app/canvas?id=${encodeURIComponent(project.id)}`);
      });
    } finally {
      setIsCreatingProject(false);
    }
  }, [isZh, router]);

  const handleRenameProject = useCallback(async (projectId: string, nextTitle: string) => {
    if (projectId === activeProjectIdRef.current) setActiveTitle(nextTitle);
    const res = await renameCanvasProjectAction(projectId, nextTitle);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setProjects((prev) =>
      prev.map((p) => (p.id === res.project.id ? { ...p, title: res.project.title } : p)),
    );
  }, []);

  useEffect(() => {
    let alive = true;
    listCanvasFoldersAction()
      .then((next) => {
        if (alive) setFolders(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleCreateFolder = useCallback(async (name: string) => {
    const res = await createCanvasFolderAction(name);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setFolders((prev) => [res.folder, ...prev]);
  }, []);

  const handleRenameFolder = useCallback(async (folderId: string, name: string) => {
    const res = await renameCanvasFolderAction(folderId, name);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setFolders((prev) => prev.map((folder) => (folder.id === res.folder.id ? res.folder : folder)));
  }, []);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    const res = await deleteCanvasFolderAction(folderId);
    if (!res.ok) return;
    setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
    setProjects((prev) =>
      prev.map((project) => {
        if (project.folderId !== folderId) return project;
        const next = { ...project };
        delete next.folderId;
        return next;
      }),
    );
  }, []);

  const handleMoveProject = useCallback(async (projectId: string, folderId: string | null) => {
    const res = await moveCanvasToFolderAction(projectId, folderId);
    if (!res.ok) {
      toast.error(isZh ? "無法移動畫布" : "Could not move the canvas");
      return;
    }
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        if (!folderId) {
          const next = { ...project };
          delete next.folderId;
          return next;
        }
        return { ...project, folderId };
      }),
    );
  }, [isZh]);

  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      const ok = window.confirm(
        isZh ? "確定要刪除此畫布專案嗎？" : "Delete this canvas project?",
      );
      if (!ok) return;
      await deleteCanvasProjectAction(projectId);
      const remaining = projects.filter((p) => p.id !== projectId);
      if (projectId === activeProjectIdRef.current) {
        const nextId = remaining[0]?.id;
        router.push(
          nextId ? `/app/canvas?id=${encodeURIComponent(nextId)}` : "/app/canvas",
        );
      } else {
        setProjects(remaining);
      }
    },
    [projects, isZh, router],
  );

  const handleApplyTemplate = useCallback(
    (templateId: CanvasStarterTemplateId) => {
      const { nodes: tplNodes, edges: tplEdges } = instantiateCanvasTemplate(templateId);
      // The Explainer template drops a Director with the sample topic already filled in.
      if (templateId === "explainer") {
        const sample = tplNodes.find((n) => n.type === "prompt")?.data.text ?? "";
        setNodes((prev) => [...prev, explainerDirectorNode(getCenterPosition(), sample)]);
        scheduleAutosave();
        return;
      }
      if (templateId === "talking-head") {
        const sample = tplNodes.find((n) => n.type === "prompt")?.data.text ?? "";
        setNodes((prev) => [...prev, talkingHeadDirectorNode(getCenterPosition(), sample)]);
        scheduleAutosave();
        return;
      }
      if (templateId === "scro-swap" || templateId === "teleport") {
        const pos = getCenterPosition();
        const card =
          templateId === "scro-swap"
            ? swapDirectorNode(pos)
            : teleportDirectorNode(pos, "", "Modern minimalist Tokyo coffee bar with warm morning window light");
        setNodes((prev) => [...prev, card]);
        scheduleAutosave();
        return;
      }
      setNodes((prev) => [...prev, ...toFlowNodes(tplNodes)]);
      setEdges((prev) => [
        ...prev,
        ...toFlowEdges(tplEdges, [...toDomainNodes(nodesRef.current), ...tplNodes], models),
      ]);
      scheduleAutosave();
      window.setTimeout(() => {
        void reactFlow.fitView({ padding: 0.2, duration: 300 });
      }, 60);
    },
    [models, setNodes, setEdges, scheduleAutosave, reactFlow, getCenterPosition],
  );

  // Canvas agent: the graph sent with each chat message, per-turn undo snapshots, and op replay.
  const agentSnapshotsRef = useRef(new Map<string, CanvasAgentGraph>());

  const getAgentGraph = useCallback((): CanvasAgentGraphSnapshot => {
    // The action saves this graph itself, so a pending autosave would only repeat it.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const domain = toDomainNodes(withRememberedJobOutputs(nodesRef.current, jobOutputRef.current));
    return {
      nodes: domain,
      edges: toDomainEdges(edgesRef.current),
      groups: snapshotGroups(domain),
      viewport: viewportRef.current,
    };
  }, [snapshotGroups]);

  const applyAgentOps = useCallback(
    async (messageId: string, ops: CanvasAgentOp[]) => {
      const before = getAgentGraph();
      agentSnapshotsRef.current.set(messageId, {
        nodes: before.nodes,
        edges: before.edges,
        groups: before.groups,
      });
      let graph: CanvasAgentGraph = { nodes: before.nodes, edges: before.edges, groups: before.groups };
      let skipped = 0;

      for (const op of ops) {
        await new Promise((resolve) => window.setTimeout(resolve, AGENT_OP_STEP_MS));
        const result = applyCanvasAgentOp(graph, op);
        if (!result.applied) {
          skipped += 1;
          continue;
        }
        graph = result.graph;
        // Patch React Flow state per op so existing nodes keep their measured size.
        switch (op.kind) {
          case "add_node":
            setNodes((prev) => [...prev, ...toFlowNodes([op.node])]);
            break;
          case "update_node":
            setNodes((prev) =>
              prev.map((n) => (n.id === op.nodeId ? { ...n, data: { ...n.data, ...op.patch } } : n)),
            );
            break;
          case "move_node":
            setNodes((prev) =>
              prev.map((n) => (n.id === op.nodeId ? { ...n, position: op.position } : n)),
            );
            break;
          case "remove_node":
            setNodes((prev) => prev.filter((n) => n.id !== op.nodeId));
            setEdges((prev) => prev.filter((e) => e.source !== op.nodeId && e.target !== op.nodeId));
            break;
          case "add_edge":
            setEdges((prev) => [...prev, ...toFlowEdges([op.edge], graph.nodes, models)]);
            break;
          case "remove_edge":
            setEdges((prev) => prev.filter((e) => e.id !== op.edgeId));
            break;
          case "mark_stale": {
            const ids = new Set(op.nodeIds);
            setNodes((prev) =>
              prev.map((n) =>
                ids.has(n.id) && n.data.outputUrl ? { ...n, data: { ...n.data, staleOutputUrl: n.data.outputUrl } } : n,
              ),
            );
            break;
          }
          case "add_group":
          case "update_group":
          case "remove_group": {
            const nextGroups: CanvasGroup[] = graph.groups ?? [];
            updateGroups(() => nextGroups);
            break;
          }
        }
      }

      scheduleAutosave();
      window.setTimeout(() => {
        void reactFlow.fitView({ padding: 0.2, duration: 400 });
      }, 80);

      // Explainer cards the assistant added start planning right away (free).
      // Directors the assistant edited with a replan request replan the same way.
      const agentPlanners = graph.nodes.filter(
        (n) =>
          (isExplainerPlannerNode(n) &&
            !readPlannerParams(n).plannerVideoId &&
            ops.some((op) => op.kind === "add_node" && op.node.id === n.id)) ||
          (isPlanDirectorNode(n) && n.data.toolParams?.replanRequested === true),
      );
      if (agentPlanners.length > 0) {
        const flowGraph = {
          nodes: toFlowNodes(graph.nodes),
          edges: toFlowEdges(graph.edges, graph.nodes, models),
        };
        for (const planner of agentPlanners) {
          await startDirectorPlan(planner.id, flowGraph);
        }
      }
      return { skipped };
    },
    [
      getAgentGraph,
      models,
      reactFlow,
      scheduleAutosave,
      setEdges,
      setNodes,
      startDirectorPlan,
      updateGroups,
    ],
  );

  const undoAgentTurn = useCallback(
    async (messageId: string) => {
      const snapshot = agentSnapshotsRef.current.get(messageId);
      if (!snapshot) return;
      agentSnapshotsRef.current.delete(messageId);
      setNodes(toFlowNodes(snapshot.nodes));
      setEdges(toFlowEdges(snapshot.edges, snapshot.nodes, models));
      resetGroups(snapshot.groups ?? []);
      scheduleAutosave();
    },
    [models, resetGroups, scheduleAutosave, setEdges, setNodes],
  );

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

    const tick = async () => {
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
