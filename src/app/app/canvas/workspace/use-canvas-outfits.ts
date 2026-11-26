"use client";

// Character outfit generation from the wired outfit pieces, and the poll that paints the new look onto the node.

import { useCallback, useEffect, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import type { CanvasNodeData } from "@/model/canvas";
import { generateCanvasCharacterOutfitAction } from "@/presentation/actions/canvas";
import { refreshCharacterAction } from "@/presentation/actions/characters";
import { characterOutfitEditInstruction, outfitWiresFromGraph } from "@/service/canvas/core/character-node";
import { JOB_POLL_INTERVAL_MS } from "@/app/app/canvas/workspace/canvas-timing";
import { toDomainEdges, toDomainNodes, type FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

export type CanvasOutfitsHookDeps = {
  nodes: FlowNode[];
  isZh: boolean;
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
  scheduleAutosave: () => void;
  nodesRef: MutableRefObject<FlowNode[]>;
  edgesRef: MutableRefObject<Edge[]>;
};

export function useCanvasOutfits({ nodes, isZh, setNodes, scheduleAutosave, nodesRef, edgesRef }: CanvasOutfitsHookDeps) {
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

  return { onGenerateOutfit };
}
