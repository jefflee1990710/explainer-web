"use client";

// Asks the server for 540p proxies of long videos on this canvas and copies finished ones onto
// their nodes, so previews and the timeline stream a light file. Polls while renders are pending.

import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { requestCanvasProxiesAction } from "@/presentation/actions/canvas-proxy";
import { currentMediaMeta, nodeMediaUrl } from "@/service/canvas/core/media-meta";
import { applyProxyUrls, wantsProxy } from "@/service/canvas/core/media-proxy";
import type { FlowNode } from "@/app/app/canvas/workspace/canvas-graph-state";

const FIRST_ASK_MS = 3_000;
const POLL_MS = 20_000;
const MAX_POLLS = 30;

// Videos that may still need a proxy: no metadata yet, or long / large without one.
function proxyCandidatesKey(nodes: readonly FlowNode[]): string {
  return nodes
    .filter((node) => {
      const kind = node.type === "media" ? node.data.mediaKind : node.data.outputKind;
      if (kind !== "video" || !nodeMediaUrl(node)) return false;
      const meta = currentMediaMeta(node);
      return !meta || wantsProxy(meta);
    })
    .map((node) => `${node.id}=${nodeMediaUrl(node)}`)
    .sort()
    .join("|");
}

export function useCanvasProxies({
  canvasId,
  nodes,
  setNodes,
}: {
  canvasId: string;
  nodes: readonly FlowNode[];
  setNodes: Dispatch<SetStateAction<FlowNode[]>>;
}) {
  const key = useMemo(() => proxyCandidatesKey(nodes), [nodes]);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    const ask = async () => {
      const state = await requestCanvasProxiesAction(canvasId).catch(() => null);
      if (cancelled || !state) return;
      if (state.proxies.length > 0) {
        setNodes((prev) => {
          const next = applyProxyUrls(prev, state.proxies);
          return next.changed ? next.nodes : prev;
        });
      }
      polls += 1;
      if (state.pending > 0 && polls < MAX_POLLS) timer = setTimeout(ask, POLL_MS);
    };
    timer = setTimeout(ask, FIRST_ASK_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canvasId, key, setNodes]);
}
