"use client";

// While a Scro Swap group exists, nodes wired to its director join it and leave when unwired.

import { useEffect, useRef } from "react";
import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import { isSwapDirectorNode } from "@/service/canvas/directors/scro-director";
import { syncSwapDirectorGroupMembers } from "@/service/canvas/directors/swap-group-membership";

type SyncEdge = { id: string; source: string; target: string };

export function useSwapDirectorGroupSync(params: {
  nodes: readonly CanvasNode[];
  edges: readonly SyncEdge[];
  snapshotGroups: (nodes: readonly { id: string }[]) => CanvasGroup[];
  updateGroups: (update: (prev: CanvasGroup[]) => CanvasGroup[]) => void;
}) {
  const { nodes, edges, snapshotGroups, updateGroups } = params;
  const seenNodes = useRef<Set<string> | null>(null);
  const seenEdges = useRef<Set<string> | null>(null);

  useEffect(() => {
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edgeIds = new Set(edges.map((edge) => edge.id));
    const knownNodes = seenNodes.current;
    const knownEdges = seenEdges.current;
    const first = knownNodes === null;
    const newDirector =
      !first && nodes.some((node) => isSwapDirectorNode(node) && !knownNodes.has(node.id));
    const newDirectorEdge =
      !first &&
      edges.some((edge) => {
        if (knownEdges?.has(edge.id)) return false;
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        return Boolean(
          (source && isSwapDirectorNode(source)) || (target && isSwapDirectorNode(target)),
        );
      });
    seenNodes.current = nodeIds;
    seenEdges.current = edgeIds;

    const current = snapshotGroups(nodes);
    const next = syncSwapDirectorGroupMembers(nodes, edges, current, {
      createMissing: newDirector || newDirectorEdge,
    });
    if (next === current) return;
    updateGroups(() => next);
  }, [nodes, edges, snapshotGroups, updateGroups]);
}
