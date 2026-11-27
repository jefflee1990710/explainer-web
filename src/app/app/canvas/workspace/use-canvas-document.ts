"use client";

// Autosave, graph edits, and placing nodes. Groups call scheduleAutosave through a ref.

import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { addEdge, EdgeChangeset, NodeChangeset, type Connection, type Edge } from "@xyflow/react";
import type { CanvasEdge, CanvasNodeData } from "@/model/canvas";
import { saveCanvasProjectAction, uploadCanvasMediaAction } from "@/presentation/actions/canvas";
import { placeDroppedCanvasFiles } from "@/app/app/canvas/workspace/canvas-media-drop";
import {
  adoptServerPreview,
  getNodeOutputPortType,
  reorderTargetHandleEdges,
  validateEdgeConnection,
} from "@/service/canvas/core/graph";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import {
  VIDEO_STYLE_TRANSFER_MODEL_ID,
  videoStyleTransferNodeData,
} from "@/service/canvas/catalog/video-style-transfer";
import { directorChangedTargets, isPlanDirectorNode } from "@/service/canvas/directors/explainer-director";
import { renderDurationForTrim } from "@/service/canvas/scro-groups/section-sync";
import { layoutExplainerGroup, shiftGroupClearOf, type LayoutSize } from "@/service/canvas/directors/explainer-layout";
import { layoutGroupByDepth } from "@/service/canvas/core/group-layout";
import type { ScroGroup } from "@/service/canvas/scro-groups/builder";
import { defaultGroupColor, defaultGroupTitle } from "@/service/canvas/core/groups";
import { SCRO_DIALOG_TOOL_BY_MODEL, type ScroDialogState, type ScroDialogTool } from "@/app/app/canvas/scro-group-dialogs";
import { type DisplayNode, GROUP_FRAME_TYPE, groupIdFromFrameId } from "@/app/app/canvas/groups/group-frames";
import type { CanvasLibraryAsset } from "@/model/canvas-dto";
import { AUTOSAVE_DEBOUNCE_MS } from "@/app/app/canvas/workspace/canvas-timing";
import {
  settingsStroke,
  toDomainEdges,
  toDomainNodes,
  toFlowEdges,
  toFlowNodes,
  withRememberedJobOutputs,
  type FlowNode,
  type RememberedJobOutput,
} from "@/app/app/canvas/workspace/canvas-graph-state";
import {
  explainerDirectorNode,
  swapDirectorNode,
  talkingHeadDirectorNode,
  teleportDirectorNode,
} from "@/app/app/canvas/workspace/canvas-director-nodes";
import { settingsStaleTargets } from "@/service/canvas/core/settings/apply";
import { withoutModelSettingsEdges } from "@/service/canvas/core/settings/registry";
import { SETTINGS_HANDLE } from "@/service/canvas/core/settings/types";
import { isGenerationInputPatch, markStaleOutputs } from "@/service/canvas/core/stale-outputs";
import { swapNodeModel } from "@/service/canvas/core/model-swap";
import { PORT_COLOR_MAP } from "@/app/app/canvas/nodes/port-colors";
import {
  blueprintAttachPlan,
  blueprintDropHandle,
  emptyCharacterBlueprintData,
  findPortraitDropTarget,
} from "@/service/canvas/core/character-blueprint";
import {
  characterOutfitPort,
  libraryAssetNodeDraft,
  outfitHandleForPart,
} from "@/service/canvas/core/character-node";


import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useReactFlow } from "@xyflow/react";
import type { CanvasProjectSummaryDto } from "@/model/canvas-dto";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import type { CanvasViewport } from "@/model/canvas";
import type { SaveStatus } from "@/app/app/canvas/canvas-topbar";
import { directorPlanningLocks } from "@/service/canvas/directors/director-plan-lock";

export type CanvasDocumentHookDeps = {
  models: readonly CanvasModelSpec[];
  isZh: boolean;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setProjects: Dispatch<SetStateAction<CanvasProjectSummaryDto[]>>;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  saveStatus: SaveStatus;
  setIsUploading: Dispatch<SetStateAction<boolean>>;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
  jobOutputRef: MutableRefObject<Map<string, RememberedJobOutput>>;
  viewportRef: MutableRefObject<CanvasViewport>;
  activeProjectIdRef: MutableRefObject<string>;
  saveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  autosaveRef: MutableRefObject<() => void>;
  planLockRef: MutableRefObject<ReturnType<typeof directorPlanningLocks>>;
  reactFlow: ReturnType<typeof useReactFlow<DisplayNode, Edge>>;
  snapshotGroups: (nodes: import("@/model/canvas").CanvasNode[]) => import("@/model/canvas").CanvasGroup[];
  addGroup: (group: import("@/model/canvas").CanvasGroup) => void;
  splitNodeChanges: (changes: NodeChangeset<DisplayNode>) => {
    nodeChanges: NodeChangeset<FlowNode>;
    frameDragEnded: boolean;
  };
  onNodesChange: (changes: NodeChangeset<FlowNode>) => void;
  onEdgesChange: (changes: EdgeChangeset<Edge>) => void;
};

export function useCanvasDocument(deps: CanvasDocumentHookDeps) {
  const {
    models, isZh, setNodes, setEdges, setProjects, setSaveStatus, saveStatus, setIsUploading,
    nodesRef, edgesRef, jobOutputRef, viewportRef, activeProjectIdRef, saveTimerRef, autosaveRef,
    planLockRef, reactFlow, snapshotGroups, addGroup, splitNodeChanges, onNodesChange, onEdgesChange,
  } = deps;

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
      const savedById = new Map(res.project.nodes.map((node) => [node.id, node]));
      const adopted = nodesRef.current.map((node) => adoptServerPreview(node, savedById.get(node.id)));
      if (adopted.some((node, index) => node !== nodesRef.current[index])) {
        nodesRef.current = adopted;
        for (const node of adopted) {
          const saved = savedById.get(node.id);
          if (!saved?.data.outputUrl || !saved.data.lastJobId) continue;
          if (saved.data.outputUrl !== node.data.outputUrl) continue;
          jobOutputRef.current.set(node.id, {
            status: saved.data.status ?? node.data.status ?? "completed",
            lastJobId: saved.data.lastJobId,
            ...(saved.data.lastCostUsd !== undefined ? { lastCostUsd: saved.data.lastCostUsd } : {}),
            outputUrl: saved.data.outputUrl,
            ...(saved.data.outputKind ? { outputKind: saved.data.outputKind } : {}),
          });
        }
        setNodes(adopted);
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
  }, [setNodes, snapshotGroups]);

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

  // Warn before closing/reloading while local edits have not finished saving.
  useEffect(() => {
    if (saveStatus !== "dirty" && saveStatus !== "saving") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveStatus]);

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
      // Editing generated text (captions or a text model) refreshes whatever is wired to it.
      const textOutputEdit =
        current?.data.outputKind === "text" &&
        Object.keys(patch).length === 1 &&
        Object.prototype.hasOwnProperty.call(patch, "text");
      if (textOutputEdit) {
        markStale(edgesRef.current.filter((edge) => edge.source === nodeId).map((edge) => edge.target));
      } else if (stale) {
        markStale([nodeId]);
      }
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
      // Dropping Character lands an empty character. Photos and outfits are wired in afterwards.
      if (spec.id === "scro:character") {
        setNodes((prev) => [
          ...prev,
          {
            id: `model-${crypto.randomUUID().slice(0, 8)}`,
            type: "model",
            position: pos,
            data: emptyCharacterBlueprintData(),
          },
        ]);
        scheduleAutosave();
        return;
      }
      // One sidebar click places detection and burn, with the subtitle text already wired.
      if (spec.id === "scro:auto-captions") {
        const capId = `model-${crypto.randomUUID().slice(0, 8)}`;
        const burnId = `model-${crypto.randomUUID().slice(0, 8)}`;
        setNodes((prev) => [
          ...prev,
          {
            id: capId,
            type: "model",
            position: pos,
            data: {
              modelId: spec.id,
              presetId: "yue",
              toolParams: { captionLanguage: "yue" },
              status: "idle",
            },
          },
          {
            id: burnId,
            type: "model",
            position: { x: pos.x + 420, y: pos.y },
            data: { modelId: "ffmpeg:burn-subtitles", presetId: "bottom", status: "idle" },
          },
        ]);
        setEdges((prev) =>
          addEdge(
            {
              id: `e-${crypto.randomUUID().slice(0, 8)}`,
              source: capId,
              sourceHandle: "output",
              target: burnId,
              targetHandle: "prompt",
              style: { stroke: PORT_COLOR_MAP.text, strokeWidth: 2 },
            },
            prev,
          ),
        );
        scheduleAutosave();
        return;
      }
      if (spec.id === VIDEO_STYLE_TRANSFER_MODEL_ID) {
        const styleNode: FlowNode = {
          id: `model-${crypto.randomUUID().slice(0, 8)}`,
          type: "model",
          position: pos,
          data: videoStyleTransferNodeData(models),
        };
        setNodes((prev) => [...prev, styleNode]);
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
    [models, getCenterPosition, setNodes, setEdges, scheduleAutosave],
  );

  const addAssetNodeAt = useCallback(
    (asset: CanvasLibraryAsset, position?: { x: number; y: number }) => {
      const pos = position ?? getCenterPosition();
      const draft = libraryAssetNodeDraft(asset);
      const id = `${draft.type}-${crypto.randomUUID().slice(0, 8)}`;
      let place = pos;
      let outfitEdge: CanvasEdge | undefined;
      const dropTarget = position ? findPortraitDropTarget(nodesRef.current, position) : undefined;
      if (dropTarget?.kind === "character" && asset.source === "outfit") {
        const handle = outfitHandleForPart(asset.outfitPart);
        place = { x: pos.x - 320, y: pos.y };
        const port = characterOutfitPort(handle);
        if (port && !port.multiple) {
          setEdges((prev) =>
            prev.filter((edge) => !(edge.target === dropTarget.id && edge.targetHandle === handle)),
          );
        }
        outfitEdge = {
          id: `e-${crypto.randomUUID().slice(0, 8)}`,
          source: id,
          sourceHandle: "output",
          target: dropTarget.id,
          targetHandle: handle,
        };
      }
      const blueprintHandle =
        dropTarget?.kind === "blueprint" ? blueprintDropHandle(asset) : null;
      if (dropTarget?.kind === "blueprint" && blueprintHandle) {
        place = { x: pos.x - 320, y: pos.y };
        const plan = blueprintAttachPlan(edgesRef.current, dropTarget.id, blueprintHandle);
        if (plan === "full") {
          toast.error(isZh ? "這個輸入已滿" : "That input is full");
        } else {
          outfitEdge = {
            id: `e-${crypto.randomUUID().slice(0, 8)}`,
            source: id,
            sourceHandle: "output",
            target: dropTarget.id,
            targetHandle: blueprintHandle,
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
        const edge = outfitEdge;
        const stroke = PORT_COLOR_MAP.image;
        setEdges((prev) => {
          const plan = blueprintAttachPlan(prev, edge.target, edge.targetHandle);
          if (plan === "full") return prev;
          const base =
            plan === "replace"
              ? prev.filter((item) => !(item.target === edge.target && item.targetHandle === edge.targetHandle))
              : prev;
          return addEdge({ ...edge, style: { stroke, strokeWidth: 2 } }, base);
        });
      }
      scheduleAutosave();
    },
    [getCenterPosition, isZh, setNodes, setEdges, scheduleAutosave],
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
        const blueprintTarget = dropPosition
          ? findPortraitDropTarget(nodesRef.current, dropPosition)
          : undefined;
        const wirePhotos = blueprintTarget?.kind === "blueprint";
        const wiredHandles = edgesRef.current.map((edge) => ({
          target: edge.target,
          targetHandle: edge.targetHandle,
        }));
        let toldPhotoFull = false;
        await placeDroppedCanvasFiles({
          files: list,
          // Photos dropped on an empty character sit to its left, then wire into refImages.
          position:
            wirePhotos && list.some((file) => file.type.toLowerCase().startsWith("image/"))
              ? { x: basePos.x - 340, y: basePos.y }
              : basePos,
          // The server action returns when the upload finishes. It does not emit a percentage.
          upload: async (file) => {
            const fd = new FormData();
            fd.append("file", file);
            return uploadCanvasMediaAction(fd);
          },
          onNodes: setNodes,
          onError: (message) => toast.error(message),
          onSettled: scheduleAutosave,
          onVisualSettled: (settled) => {
            if (!wirePhotos || !blueprintTarget || settled.mediaKind !== "image") return;
            const targetId = blueprintTarget.id;
            if (blueprintAttachPlan(wiredHandles, targetId, "refImages") === "full") {
              if (!toldPhotoFull) {
                toast.error(isZh ? "參考圖已滿" : "Photo inputs are full");
                toldPhotoFull = true;
              }
              return;
            }
            wiredHandles.push({ target: targetId, targetHandle: "refImages" });
            setEdges((prev) => {
              if (blueprintAttachPlan(prev, targetId, "refImages") !== "add") return prev;
              return addEdge(
                {
                  id: `e-${crypto.randomUUID().slice(0, 8)}`,
                  source: settled.id,
                  sourceHandle: "output",
                  target: targetId,
                  targetHandle: "refImages",
                  style: { stroke: PORT_COLOR_MAP.image, strokeWidth: 2 },
                },
                prev,
              );
            });
          },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [getCenterPosition, isZh, setNodes, setEdges, scheduleAutosave],
  );


  return {
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
  };
}
