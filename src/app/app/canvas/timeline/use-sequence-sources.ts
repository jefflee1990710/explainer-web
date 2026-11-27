"use client";

// Media behind each wire into a Sequence node: URL, kind, label, and length. Lengths come from
// the graph (probed outputs or edit estimates); missing ones are read from the file's metadata.

import { useEffect, useMemo, useState } from "react";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import { sequenceSourceDurations } from "@/service/canvas/core/edit-media";
import { extractMediaUrl } from "@/service/canvas/core/graph";
import { currentMediaMeta } from "@/service/canvas/core/media-meta";
import { SEQUENCE_PORTS } from "@/service/canvas/core/sequence";
import { concatClipLabel } from "@/app/app/canvas/nodes/concat-clip-label";

export type SequenceSource = {
  url?: string;
  // 540p proxy of the main output, for playback only.
  previewUrl?: string;
  kind: "video" | "image" | "audio";
  label: string;
  durationSec?: number;
};

const KIND_BY_PORT: Record<string, SequenceSource["kind"]> = {
  [SEQUENCE_PORTS.video]: "video",
  [SEQUENCE_PORTS.audio]: "audio",
  [SEQUENCE_PORTS.image]: "image",
};

// Reads a media file's length in the browser without downloading the whole file.
function probeDuration(url: string, kind: "video" | "audio"): Promise<number | undefined> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = "metadata";
    el.muted = true;
    const done = (value?: number) => {
      el.removeAttribute("src");
      el.load();
      resolve(value);
    };
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : undefined);
    el.onerror = () => done(undefined);
    el.src = url;
  });
}

export function useSequenceSources({
  nodeId,
  nodes,
  edges,
  catalog,
  locale,
  isZh,
}: {
  nodeId: string;
  nodes: readonly CanvasNode[];
  edges: readonly CanvasEdge[];
  catalog: readonly CanvasModelSpec[];
  locale: string;
  isZh: boolean;
}): Record<string, SequenceSource> {
  const [probed, setProbed] = useState<Record<string, number | undefined>>({});

  const base = useMemo(() => {
    const known = sequenceSourceDurations({ nodes, edges }, nodeId);
    const out: Record<string, SequenceSource> = {};
    const counts: Record<string, number> = {};
    for (const edge of edges) {
      if (edge.target !== nodeId) continue;
      const kind = KIND_BY_PORT[edge.targetHandle];
      if (!kind) continue;
      const source = nodes.find((n) => n.id === edge.source);
      const index = counts[edge.targetHandle] ?? 0;
      counts[edge.targetHandle] = index + 1;
      out[edge.id] = {
        url: source ? extractMediaUrl(source, edge.sourceHandle) : undefined,
        previewUrl:
          source && (edge.sourceHandle || "output") === "output" ? currentMediaMeta(source)?.proxyUrl : undefined,
        kind,
        durationSec: known[edge.id],
        label: concatClipLabel({
          sourceId: edge.source,
          nodes,
          edges,
          index,
          isZh,
          modelName: (node) => {
            if (node.type !== "model" || !node.data.modelId) return undefined;
            const spec = findCanvasModel(node.data.modelId, catalog);
            return spec ? canvasModelDisplayName(spec, locale) : undefined;
          },
        }),
      };
    }
    return out;
  }, [catalog, edges, isZh, locale, nodeId, nodes]);

  useEffect(() => {
    let cancelled = false;
    const missing = Object.values(base).filter(
      (s): s is SequenceSource & { url: string; kind: "video" | "audio" } =>
        s.kind !== "image" && s.durationSec === undefined && Boolean(s.url) && !(s.url! in probed),
    );
    for (const source of missing) {
      void probeDuration(source.url, source.kind).then((sec) => {
        if (!cancelled) setProbed((prev) => ({ ...prev, [source.url]: sec }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [base, probed]);

  return useMemo(() => {
    const out: Record<string, SequenceSource> = {};
    for (const [ref, source] of Object.entries(base)) {
      out[ref] =
        source.durationSec === undefined && source.url && probed[source.url] !== undefined
          ? { ...source, durationSec: probed[source.url] }
          : source;
    }
    return out;
  }, [base, probed]);
}
