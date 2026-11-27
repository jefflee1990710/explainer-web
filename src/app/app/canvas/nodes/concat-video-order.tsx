"use client";

// Ordered list of clips wired into a multi-input join port (Concat videos, Audio Concat audios).
// Up/down changes edge order.

import { ChevronDown, ChevronUp } from "lucide-react";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import { canvasModelDisplayName } from "@/service/canvas/catalog/model-names";
import { concatClipLabel } from "@/app/app/canvas/nodes/concat-clip-label";
import { useCanvasNodeActions } from "@/app/app/canvas/nodes/port-colors";

export function ConcatVideoOrder({
  nodeId,
  isZh,
  port = "videos",
}: {
  nodeId: string;
  isZh: boolean;
  port?: "videos" | "audios";
}) {
  const { catalog, edges, nodes, locale, onReorderTargetEdges } = useCanvasNodeActions();
  const videos = edges.filter((edge) => edge.target === nodeId && edge.targetHandle === port);
  if (videos.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-white/50">{port === "audios" ? (isZh ? "音訊順序" : "Track order") : isZh ? "接片順序" : "Clip order"}</label>
      <ol className="space-y-1">
        {videos.map((edge, index) => {
          const label = concatClipLabel({
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
          });
          return (
            <li
              key={edge.id}
              className="flex items-center gap-1 rounded-[8px] border border-white/10 bg-[#12161f] px-1.5 py-1"
            >
              <span className="w-4 shrink-0 text-center text-[10px] text-white/45">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-white/85" title={label}>
                {label}
              </span>
              <button
                type="button"
                disabled={index === 0}
                title={isZh ? "上移" : "Move up"}
                aria-label={isZh ? "上移" : "Move up"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onReorderTargetEdges(nodeId, port, index, index - 1);
                }}
                className="nodrag nopan cursor-pointer rounded p-0.5 text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={index === videos.length - 1}
                title={isZh ? "下移" : "Move down"}
                aria-label={isZh ? "下移" : "Move down"}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onReorderTargetEdges(nodeId, port, index, index + 1);
                }}
                className="nodrag nopan cursor-pointer rounded p-0.5 text-white/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
