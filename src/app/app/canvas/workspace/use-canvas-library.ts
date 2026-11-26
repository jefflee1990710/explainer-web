"use client";

// Canvas and folder list: open, create, rename, move, delete, and starter templates.

import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useReactFlow, type Edge } from "@xyflow/react";
import { toast } from "sonner";
import {
  createCanvasFolderAction,
  createCanvasProjectAction,
  deleteCanvasFolderAction,
  deleteCanvasProjectAction,
  listCanvasFoldersAction,
  moveCanvasToFolderAction,
  renameCanvasFolderAction,
  renameCanvasProjectAction,
} from "@/presentation/actions/canvas";
import type { CanvasFolderDto } from "@/model/canvas-dto";
import type { CanvasModelSpec } from "@/service/canvas/catalog/model-catalog";
import type { CanvasProjectSummaryDto } from "@/model/canvas-dto";
import { type CanvasStarterTemplateId, instantiateCanvasTemplate } from "@/service/canvas/core/templates";
import { canvasPageHref } from "@/app/app/canvas/canvas-href";
import type { DisplayNode } from "@/app/app/canvas/groups/group-frames";
import {
  explainerDirectorNode,
  swapDirectorNode,
  talkingHeadDirectorNode,
  teleportDirectorNode,
} from "@/app/app/canvas/workspace/canvas-director-nodes";
import { toDomainNodes, toFlowEdges, toFlowNodes, type FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

export type CanvasLibraryHookDeps = {
  isZh: boolean;
  router: ReturnType<typeof useRouter>;
  reactFlow: ReturnType<typeof useReactFlow<DisplayNode, Edge>>;
  projects: CanvasProjectSummaryDto[];
  setProjects: Dispatch<SetStateAction<CanvasProjectSummaryDto[]>>;
  setFolders: Dispatch<SetStateAction<CanvasFolderDto[]>>;
  setIsSwitchingProject: Dispatch<SetStateAction<boolean>>;
  setIsCreatingProject: Dispatch<SetStateAction<boolean>>;
  setActiveTitle: Dispatch<SetStateAction<string>>;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  activeProjectIdRef: MutableRefObject<string>;
  nodesRef: MutableRefObject<FlowNode[]>;
  models: readonly CanvasModelSpec[];
  scheduleAutosave: () => void;
  getCenterPosition: () => { x: number; y: number };
};

export function useCanvasLibrary(deps: CanvasLibraryHookDeps) {
  const {
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
  } = deps;

  // Project switcher / CRUD handlers. The transition stays pending until the next canvas renders.
  const openCanvas = useCallback(
    (projectId: string) => {
      if (!projectId || projectId === activeProjectIdRef.current) return;
      setIsSwitchingProject(true);
      // Push directly so the address bar updates. A nested transition was delaying it.
      router.push(canvasPageHref(projectId, window.location.search));
    },
    [router],
  );

  const handleSelectProject = useCallback(
    (projectId: string) => {
      openCanvas(projectId);
    },
    [openCanvas],
  );

  const handleCreateProject = useCallback(async (folderId?: string) => {
    setIsCreatingProject(true);
    try {
      const { project } = await createCanvasProjectAction({
        title: isZh ? "未命名畫布" : "Untitled Canvas",
        ...(folderId ? { folderId } : {}),
      });
      openCanvas(project.id);
    } finally {
      setIsCreatingProject(false);
    }
  }, [isZh, openCanvas]);

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
        if (nextId) openCanvas(nextId);
        else router.push("/app/canvas");
      } else {
        setProjects(remaining);
      }
    },
    [projects, isZh, router, openCanvas],
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

  return {
    handleSelectProject,
    handleCreateProject,
    handleRenameProject,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveProject,
    handleDeleteProject,
    handleApplyTemplate,
  };
}
