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
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeData,
  CanvasNodeStatus,
  CanvasNodeType,
  CanvasOutputKind,
  CanvasViewport,
} from "@/model/canvas";
import {
  createCanvasProjectAction,
  deleteCanvasProjectAction,
  pollCanvasFlowAction,
  pollCanvasJobsAction,
  refreshCanvasModelsAction,
  renameCanvasProjectAction,
  runCanvasFlowAction,
  runCanvasNodeAction,
  saveCanvasProjectAction,
  stopCanvasFlowAction,
  uploadCanvasMediaAction,
} from "@/presentation/actions/canvas";
import { notifyCreditsChanged } from "@/presentation/components/app/billing/credits-changed";
import { useI18n } from "@/presentation/components/i18n-provider";
import { addUsd, formatUsd } from "@/service/billing/usd";
import {
  computeExecutionWaves,
  getNodeOutputPortType,
  validateEdgeConnection,
} from "@/service/canvas/graph";
import {
  type CanvasModelSpec,
  findCanvasModel,
} from "@/service/canvas/model-catalog";
import { estimateCanvasModelCostUsd } from "@/service/canvas/pricing";
import {
  dropExpandedPlanners,
  isExplainerPlannerNode,
  readPlannerParams,
} from "@/service/canvas/explainer-planner";
import { replacePlannerWithExpansion } from "@/service/canvas/explainer-expand";
import {
  layoutExplainerGroup,
  shiftGroupClearOf,
  type LayoutSize,
} from "@/service/canvas/explainer-layout";
import { layoutGroupByDepth } from "@/service/canvas/group-layout";
import type { ScroGroup } from "@/service/canvas/scro-groups/builder";
import {
  SCRO_DIALOG_TOOL_BY_MODEL,
  ScroGroupDialogs,
  type ScroDialogState,
} from "@/app/app/canvas/scro-group-dialogs";
import type { CanvasMediaItem } from "@/app/app/canvas/scro-group-options";
import {
  ExplainerPlanDialog,
  type ExplainerPlanDialogValues,
} from "@/app/app/canvas/explainer-plan-dialog";
import {
  TalkingHeadDialog,
  type TalkingHeadDialogValues,
} from "@/app/app/canvas/talking-head-dialog";
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
import {
  type CanvasStarterTemplateId,
  instantiateCanvasTemplate,
} from "@/service/canvas/templates";
import type { CanvasAgentMessageDto } from "@/service/canvas-agent/history";
import { applyCanvasAgentOp } from "@/service/canvas-agent/apply-ops";
import type { CanvasAgentGraph, CanvasAgentOp } from "@/service/canvas-agent/types";
import {
  CANVAS_AGENT_DOCK_SIDE_KEY,
  CanvasAgentDock,
  type CanvasAgentDockSide,
  type CanvasAgentGraphSnapshot,
} from "@/app/app/canvas/agent/canvas-agent-dock";
import { CanvasLightbox } from "@/app/app/canvas/canvas-lightbox";
import {
  CANVAS_DRAG_ASSET_MIME,
  CANVAS_DRAG_MODEL_MIME,
  CanvasSidebar,
} from "@/app/app/canvas/canvas-sidebar";
import { CanvasTopbar, type SaveStatus } from "@/app/app/canvas/canvas-topbar";
import { MediaNodeCard } from "@/app/app/canvas/nodes/media-node-card";
import { ModelNodeCard } from "@/app/app/canvas/nodes/model-node-card";
import {
  type CanvasLightboxItem,
  CanvasNodeActionsContext,
  PORT_COLOR_MAP,
} from "@/app/app/canvas/nodes/port-colors";
import { PromptNodeCard } from "@/app/app/canvas/nodes/prompt-node-card";

const SIDEBAR_OPEN_KEY = "scro.canvasSidebar.open";

const NODE_TYPES = {
  media: MediaNodeCard,
  prompt: PromptNodeCard,
  model: ModelNodeCard,
} as const;

const AUTOSAVE_DEBOUNCE_MS = 800;
const JOB_POLL_INTERVAL_MS = 3_000;
// Pause between agent ops so the user can watch the graph being built.
const AGENT_OP_STEP_MS = 90;

type FlowNode = Node<CanvasNodeData, CanvasNodeType>;

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
    const portType = src ? getNodeOutputPortType(src, catalog) : null;
    const stroke = portType ? PORT_COLOR_MAP[portType] : "#c6f24b";
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
  const reactFlow = useReactFlow();

  const [projects, setProjects] = useState<CanvasProjectSummaryDto[]>(initialProjects);
  const activeProjectId = initialProject.id;
  const [activeTitle, setActiveTitle] = useState(initialProject.title);
  const [models, setModels] = useState<CanvasModelSpec[]>(initialModels);
  const [assets] = useState<CanvasLibraryAssetsResult>(initialAssets);
  const [creditUsd, setCreditUsd] = useState(initialCreditUsd);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentDockSide, setAgentDockSide] = useState<CanvasAgentDockSide>("right");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
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

  const [initialGraph] = useState(() => dropExpandedPlanners(initialProject));
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

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Dock side is a layout preference, restored after mount so server HTML stays stable.
  useEffect(() => {
    const saved = window.localStorage.getItem(CANVAS_AGENT_DOCK_SIDE_KEY);
    const savedSidebar = window.localStorage.getItem(SIDEBAR_OPEN_KEY);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    if (saved === "right" || saved === "bottom") setAgentDockSide(saved);
    if (savedSidebar === "0" || savedSidebar === "1") setSidebarOpen(savedSidebar === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      const next = !open;
      window.localStorage.setItem(SIDEBAR_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }, []);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  const domainNodes = useMemo(() => toDomainNodes(nodes), [nodes]);
  const domainEdges = useMemo(() => toDomainEdges(edges), [edges]);

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
  }, []);

  const scheduleAutosave = useCallback(() => {
    setSaveStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSaveNow();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [flushSaveNow]);

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
      .filter((n) => !pending.ids.has(n.id))
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

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
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
    [onNodesChange, scheduleAutosave, applyPendingGroupLayout],
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const meaningful =
        changes.getByType("remove").length > 0 ||
        changes.getByType("add").length > 0 ||
        changes.getByType("replace").length > 0;
      if (meaningful) scheduleAutosave();
    },
    [onEdgesChange, scheduleAutosave],
  );

  const onUpdateNodeData = useCallback(
    (nodeId: string, patch: Partial<CanvasNodeData>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
      );
      scheduleAutosave();
    },
    [setNodes, scheduleAutosave],
  );

  const onDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      scheduleAutosave();
    },
    [setNodes, setEdges, scheduleAutosave],
  );

  // Guardrail connection check (prevents incompatible port types, self-loops, cycles, over-capacity).
  const isValidConnection = useCallback(
    (edgeOrConnection: Edge | Connection) => {
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
      const stroke = portType ? PORT_COLOR_MAP[portType] : "#c6f24b";

      // If target handle is single-value, replace existing edge smoothly.
      const tgtSpec =
        tgtNode?.type === "model" && tgtNode.data.modelId
          ? findCanvasModel(tgtNode.data.modelId, models)
          : undefined;
      const tgtPort = tgtSpec?.inputs.find((p) => p.id === connection.targetHandle);

      setEdges((prev) => {
        const cleaned =
          tgtPort && !tgtPort.multiple
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
      scheduleAutosave();
    },
    [models, setEdges, scheduleAutosave],
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

  // Explainer setup dialog opened by a sidebar drop or the Explainer template.
  const [explainerDialog, setExplainerDialog] = useState<{
    position: { x: number; y: number };
    defaultTopic?: string;
  } | null>(null);
  // Life / Poster / Swap / Teleport setup dialog; submit lands a visible node group.
  const [scroDialog, setScroDialog] = useState<ScroDialogState>(null);
  // Talking Head setup dialog; submit lands a planning card like Explainer.
  const [talkingHeadDialog, setTalkingHeadDialog] = useState<{
    position: { x: number; y: number };
    defaultScript?: string;
  } | null>(null);

  const addModelNodeAt = useCallback(
    (modelId: string, position?: { x: number; y: number }) => {
      const spec = findCanvasModel(modelId, models);
      if (!spec) return;
      const pos = position ?? getCenterPosition();
      // Explainer never lands as an editable node: ask for the topic first, then plan.
      if (spec.id === "scro:explainer") {
        setExplainerDialog({ position: pos });
        return;
      }
      if (spec.id === "scro:talking-head") {
        setTalkingHeadDialog({ position: pos });
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
      const newNode: FlowNode = {
        id: `media-${crypto.randomUUID().slice(0, 8)}`,
        type: "media",
        position: pos,
        data: {
          label: asset.name,
          fileName: asset.name,
          mediaKind: asset.mediaKind,
          mediaUrl: asset.url,
        },
      };
      setNodes((prev) => [...prev, newNode]);
      scheduleAutosave();
    },
    [getCenterPosition, setNodes, scheduleAutosave],
  );

  const addPromptNode = useCallback(() => {
    const pos = getCenterPosition();
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
        toast.error(msg);
      }
    },
    [setNodes, syncWallet, applyJobUpdates, isZh],
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
                  plannerVideoId: undefined,
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
        if (!res.ok) toast.error(res.error);
      } catch (err) {
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

  const closeExplainerDialog = useCallback(() => setExplainerDialog(null), []);
  const closeScroDialog = useCallback(() => setScroDialog(null), []);

  // Adds a dialog-built group, then re-lays it out with measured card sizes.
  const insertScroGroup = useCallback(
    (group: ScroGroup) => {
      const origin = scroDialog?.position ?? group.nodes[0]?.position ?? { x: 0, y: 0 };
      setScroDialog(null);
      const allNodes = [...toDomainNodes(nodesRef.current), ...group.nodes];
      setNodes((prev) => [...prev, ...toFlowNodes(group.nodes)]);
      setEdges((prev) => [...prev, ...toFlowEdges(group.edges, allNodes, models)]);
      pendingGroupLayoutRef.current = {
        ids: new Set(group.nodes.map((n) => n.id)),
        edges: group.edges,
        origin,
        layout: "depth",
      };
      scheduleAutosave();
      window.setTimeout(applyPendingGroupLayout, 600);
    },
    [scroDialog, models, setNodes, setEdges, scheduleAutosave, applyPendingGroupLayout],
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

  // Dialog submit: place the planning card at the drop spot and start the free plan.
  const submitExplainerDialog = useCallback(
    (values: ExplainerPlanDialogValues) => {
      const dialog = explainerDialog;
      setExplainerDialog(null);
      if (!dialog) return;
      const card: FlowNode = {
        id: `model-${crypto.randomUUID().slice(0, 8)}`,
        type: "model",
        position: dialog.position,
        data: {
          modelId: "scro:explainer",
          aspectRatio: values.aspectRatio,
          prompt: values.topic,
          status: "idle",
          toolParams: {
            plannerMode: true,
            skillSlug: values.skillSlug,
            language: values.language,
            durationPreset: values.durationPreset,
            ...(values.characterId ? { characterId: values.characterId } : {}),
          },
        },
      };
      void startDirectorPlan(card.id, {
        nodes: [...nodesRef.current, card],
        edges: edgesRef.current,
      });
    },
    [explainerDialog, startDirectorPlan],
  );

  const closeTalkingHeadDialog = useCallback(() => setTalkingHeadDialog(null), []);

  // Talking Head submit: same free planning card, expanded into voice → HeyGen → grade rows.
  const submitTalkingHeadDialog = useCallback(
    (values: TalkingHeadDialogValues) => {
      const dialog = talkingHeadDialog;
      setTalkingHeadDialog(null);
      if (!dialog) return;
      const card: FlowNode = {
        id: `model-${crypto.randomUUID().slice(0, 8)}`,
        type: "model",
        position: dialog.position,
        data: {
          modelId: "scro:talking-head",
          aspectRatio: values.aspectRatio,
          prompt: values.script,
          status: "idle",
          toolParams: {
            plannerMode: true,
            characterId: values.characterId,
            language: values.language,
            framing: values.framing,
          },
        },
      };
      void startDirectorPlan(card.id, {
        nodes: [...nodesRef.current, card],
        edges: edgesRef.current,
      });
    },
    [talkingHeadDialog, startDirectorPlan],
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
            setPlannerParams(nodeId, { planStatus: "failed", planError: state.error });
            scheduleAutosave();
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
  }, [planningNodeIdsKey, models, setNodes, setEdges, scheduleAutosave, applyPendingGroupLayout]);

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

  // Worker-backed multi-wave Run Flow trigger.
  const handleRunFlow = useCallback(async () => {
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
    if (waves.length === 0) return;

    const res = await runCanvasFlowAction({
      canvasId: activeProjectIdRef.current,
      nodes: currentNodes,
      edges: currentEdges,
      viewport: viewportRef.current,
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

  const handleStopFlow = useCallback(async () => {
    flowAbortRef.current = true;
    await stopCanvasFlowAction(activeProjectIdRef.current).catch(() => {});
    setIsFlowRunning(false);
    setFlowWaveProgress(null);
    toast.info(isZh ? "已停止後續波次執行" : "Stopped remaining flow waves");
  }, [isZh]);

  // Project switcher / CRUD handlers.
  const handleSelectProject = useCallback(
    (projectId: string) => {
      router.push(`/app/canvas?id=${encodeURIComponent(projectId)}`);
    },
    [router],
  );

  const handleCreateProject = useCallback(async () => {
    const { project } = await createCanvasProjectAction({
      title: isZh ? "未命名畫布" : "Untitled Canvas",
    });
    router.push(`/app/canvas?id=${encodeURIComponent(project.id)}`);
  }, [isZh, router]);

  const handleRenameProject = useCallback(async (nextTitle: string) => {
    setActiveTitle(nextTitle);
    const res = await renameCanvasProjectAction(activeProjectIdRef.current, nextTitle);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setProjects((prev) =>
      prev.map((p) => (p.id === res.project.id ? { ...p, title: res.project.title } : p)),
    );
  }, []);

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
      // The Explainer template opens the setup dialog with its sample topic instead of a node.
      if (templateId === "explainer") {
        const sample = tplNodes.find((n) => n.type === "prompt")?.data.text;
        setExplainerDialog({ position: getCenterPosition(), defaultTopic: sample });
        return;
      }
      if (templateId === "talking-head") {
        const sample = tplNodes.find((n) => n.type === "prompt")?.data.text;
        setTalkingHeadDialog({ position: getCenterPosition(), defaultScript: sample });
        return;
      }
      if (templateId === "scro-swap" || templateId === "teleport") {
        setScroDialog({
          tool: templateId === "scro-swap" ? "swap" : "teleport",
          position: getCenterPosition(),
        });
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
    return {
      nodes: toDomainNodes(withRememberedJobOutputs(nodesRef.current, jobOutputRef.current)),
      edges: toDomainEdges(edgesRef.current),
      viewport: viewportRef.current,
    };
  }, []);

  const applyAgentOps = useCallback(
    async (messageId: string, ops: CanvasAgentOp[]) => {
      const before = getAgentGraph();
      agentSnapshotsRef.current.set(messageId, { nodes: before.nodes, edges: before.edges });
      let graph: CanvasAgentGraph = { nodes: before.nodes, edges: before.edges };
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
        }
      }

      scheduleAutosave();
      window.setTimeout(() => {
        void reactFlow.fitView({ padding: 0.2, duration: 400 });
      }, 80);

      // Explainer cards the assistant added start planning right away (free).
      const agentPlanners = graph.nodes.filter(
        (n) =>
          isExplainerPlannerNode(n) &&
          !readPlannerParams(n).plannerVideoId &&
          ops.some((op) => op.kind === "add_node" && op.node.id === n.id),
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
    [getAgentGraph, models, reactFlow, scheduleAutosave, setEdges, setNodes, startDirectorPlan],
  );

  const undoAgentTurn = useCallback(
    async (messageId: string) => {
      const snapshot = agentSnapshotsRef.current.get(messageId);
      if (!snapshot) return;
      agentSnapshotsRef.current.delete(messageId);
      setNodes(toFlowNodes(snapshot.nodes));
      setEdges(toFlowEdges(snapshot.edges, snapshot.nodes, models));
      scheduleAutosave();
    },
    [models, scheduleAutosave, setEdges, setNodes],
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

  // Estimate whole-flow USD cost for all model nodes currently on canvas.
  const { flowEstimatedUsd, flowModelCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const node of nodes) {
      if (node.type !== "model" || !node.data.modelId) continue;
      // Planners are free and never run in a flow.
      if (isExplainerPlannerNode({ type: "model", data: node.data })) continue;
      const spec = findCanvasModel(node.data.modelId, models);
      if (!spec) continue;
      count += 1;
      total = addUsd(
        total,
        estimateCanvasModelCostUsd(spec, {
          durationSeconds: node.data.durationSeconds,
        }),
      );
    }
    return { flowEstimatedUsd: total, flowModelCount: count };
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
    [reactFlow, addModelNodeAt, addAssetNodeAt, uploadAndPlaceFiles],
  );

  const nodeContextValue = useMemo(
    () => ({
      catalog: models,
      edges: domainEdges,
      characterOptions: assets.characterOptions ?? [],
      locale,
      isFlowRunning,
      onUpdateNodeData,
      onDeleteNode,
      onRunNode,
      onOpenLightbox: setLightbox,
      onPlanExplainer,
    }),
    [
      models,
      domainEdges,
      assets.characterOptions,
      locale,
      isFlowRunning,
      onUpdateNodeData,
      onDeleteNode,
      onRunNode,
      onPlanExplainer,
    ],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0b0e13] text-white">
      <CanvasTopbar
        locale={locale}
        projects={projects}
        activeProjectId={activeProjectId}
        activeTitle={activeTitle}
        saveStatus={saveStatus}
        creditUsd={creditUsd}
        sidebarOpen={sidebarOpen}
        flowEstimatedUsd={flowEstimatedUsd}
        flowModelCount={flowModelCount}
        isFlowRunning={isFlowRunning}
        flowWaveProgress={flowWaveProgress}
        onToggleSidebar={toggleSidebar}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        onApplyTemplate={handleApplyTemplate}
        onAddPromptNode={addPromptNode}
        onFitView={() => void reactFlow.fitView({ padding: 0.2, duration: 250 })}
        onRunFlow={handleRunFlow}
        onStopFlow={handleStopFlow}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <CanvasSidebar
          locale={locale}
          collapsed={!sidebarOpen}
          models={models}
          assets={assets}
          isUploading={isUploading}
          isRefreshingModels={isRefreshingModels}
          onToggleCollapsed={toggleSidebar}
          onAddModel={(id) => addModelNodeAt(id)}
          onAddAsset={(asset) => addAssetNodeAt(asset)}
          onUploadFiles={(files) => void uploadAndPlaceFiles(files)}
          onRefreshModels={() => void handleRefreshModels()}
        />

        <div
          className={`flex min-h-0 min-w-0 flex-1 ${agentDockSide === "right" ? "flex-row" : "flex-col"}`}
        >
          <div
            className="relative min-h-0 min-w-0 flex-1"
            onDragOver={handlePaneDragOver}
            onDragLeave={handlePaneDragLeave}
            onDrop={handlePaneDrop}
          >
            <CanvasNodeActionsContext.Provider value={nodeContextValue}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                isValidConnection={isValidConnection}
                defaultViewport={initialProject.viewport}
                onMoveEnd={(_event, viewport) => {
                  viewportRef.current = viewport;
                  scheduleAutosave();
                }}
                deleteKeyCode={["Backspace", "Delete"]}
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
                <MiniMap
                  nodeColor={(n) =>
                    n.type === "media"
                      ? "#38bdf8"
                      : n.type === "prompt"
                        ? "#c6f24b"
                        : "#a78bfa"
                  }
                  maskColor="rgba(11, 14, 19, 0.72)"
                  className="!rounded-xl !border !border-white/10 !bg-[#12161f]/90"
                />
              </ReactFlow>
            </CanvasNodeActionsContext.Provider>

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
                      {isZh ? "套用：Talking Head 口播" : "Try: Talking Head"}
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

            <ExplainerPlanDialog
              open={explainerDialog !== null}
              isZh={isZh}
              defaultTopic={explainerDialog?.defaultTopic}
              characterOptions={assets.characterOptions ?? []}
              onCancel={closeExplainerDialog}
              onSubmit={submitExplainerDialog}
            />
            <TalkingHeadDialog
              open={talkingHeadDialog !== null}
              isZh={isZh}
              defaultScript={talkingHeadDialog?.defaultScript}
              characterOptions={assets.characterOptions ?? []}
              onCancel={closeTalkingHeadDialog}
              onSubmit={submitTalkingHeadDialog}
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
            side={agentDockSide}
            initialMessages={initialAgentMessages}
            getGraph={getAgentGraph}
            onApplyOps={applyAgentOps}
            onUndo={undoAgentTurn}
            onSideChange={(side) => {
              setAgentDockSide(side);
              window.localStorage.setItem(CANVAS_AGENT_DOCK_SIDE_KEY, side);
            }}
          />
        </div>
      </div>

      <CanvasLightbox item={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
