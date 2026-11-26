// Edit checks for FFmpeg nodes the agent added or changed this turn: times past the
// source's end, sound edits on a silent source, and too many or mismatched concat clips.

import type { CanvasNode } from "@/model/canvas";
import { expectedNodeMedia, wiredSources } from "@/service/canvas/core/edit-media";
import { parseKeepRanges } from "@/service/canvas/core/edit-ranges";
import { findCanvasModel } from "@/service/canvas/catalog/model-catalog";
import type { CanvasAgentWorkingGraph } from "@/service/canvas-agent/working-graph";

export type CanvasAgentEditIssue = { nodeId: string; modelName: string; field: string; message: string };

// Edits that only change sound fail on a source with no audio track.
const NEEDS_SOUND = new Set(["ffmpeg:volume", "ffmpeg:audio-fade", "ffmpeg:extract-audio", "scro:auto-captions"]);

// Nodes this turn added or updated, still on the canvas.
function touchedNodes(g: CanvasAgentWorkingGraph): CanvasNode[] {
  const ids = new Set(
    g.ops.flatMap((op) =>
      op.kind === "add_node" ? [op.node.id] : op.kind === "update_node" ? [op.nodeId] : op.kind === "add_edge" ? [op.edge.target] : [],
    ),
  );
  return g.nodes.filter((n) => ids.has(n.id) && n.type === "model");
}

function num(node: CanvasNode, key: string): number | undefined {
  const raw = node.data.toolParams?.[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

const sec = (value: number) => `${Math.round(value * 100) / 100}s`;

export function findCanvasAgentEditIssues(g: CanvasAgentWorkingGraph): CanvasAgentEditIssue[] {
  const issues: CanvasAgentEditIssue[] = [];
  for (const node of touchedNodes(g)) {
    const modelId = node.data.modelId ?? "";
    const spec = findCanvasModel(modelId, g.catalog);
    if (!spec) continue;
    const add = (field: string, message: string) => issues.push({ nodeId: node.id, modelName: spec.name, field, message });
    const sourceId = wiredSources(g, node.id, "video")[0];
    const source = sourceId ? expectedNodeMedia(g, sourceId) : undefined;
    const duration = source?.durationSec;

    if (NEEDS_SOUND.has(modelId) && source?.hasAudio === false) {
      add("video", `its source ${sourceId} has no sound, so this edit fails`);
    }

    if (modelId === "ffmpeg:trim-speed" && duration !== undefined) {
      const start = num(node, "ffmpegStartSec") ?? 0;
      const end = num(node, "ffmpegEndSec") ?? 0;
      if (start >= duration) add("ffmpegStartSec", `starts at ${sec(start)} but the source is only ${sec(duration)} long`);
      else if (end > duration + 0.05) add("ffmpegEndSec", `ends at ${sec(end)} but the source is only ${sec(duration)} long`);
      if (end > 0 && end <= start) add("ffmpegEndSec", `ends at ${sec(end)}, before its start ${sec(start)}`);
    }

    if (modelId === "ffmpeg:keep-ranges") {
      const raw = node.data.toolParams?.ffmpegRanges;
      const text = typeof raw === "string" ? raw : "";
      try {
        // Unclipped first, so a range past the end is reported instead of silently shortened.
        const ranges = parseKeepRanges(text, Number.POSITIVE_INFINITY);
        if (duration !== undefined) {
          if (ranges.every((r) => r.start >= duration)) add("ffmpegRanges", `every range starts after the source's ${sec(duration)} end`);
          else if (ranges.some((r) => r.end > duration + 0.05)) add("ffmpegRanges", `has a range past the source's ${sec(duration)} end`);
        }
      } catch (error) {
        add("ffmpegRanges", error instanceof Error ? error.message : "ranges cannot be read");
      }
    }

    if ((modelId === "ffmpeg:fade" || modelId === "ffmpeg:audio-fade") && duration !== undefined) {
      const fadeIn = num(node, "ffmpegFadeInSec") ?? 0.4;
      const fadeOut = num(node, "ffmpegFadeOutSec") ?? 0.4;
      if (fadeIn + fadeOut > duration) {
        add("ffmpegFadeInSec", `fades total ${sec(fadeIn + fadeOut)} but the source is only ${sec(duration)} long`);
      }
    }

    if (modelId === "ffmpeg:frame-grab" && duration !== undefined) {
      const at = num(node, "ffmpegAtSec") ?? 0;
      if (at >= duration) add("ffmpegAtSec", `grabs at ${sec(at)} but the source is only ${sec(duration)} long`);
    }

    if (modelId === "ffmpeg:concat") {
      const port = spec.inputs.find((p) => p.id === "videos");
      const clips = wiredSources(g, node.id, "videos");
      if (port && clips.length > port.maxConnections) {
        add("videos", `has ${clips.length} clips but takes at most ${port.maxConnections}; chain a second concat`);
      }
      const shapes = new Set(
        clips
          .map((id) => expectedNodeMedia(g, id))
          .filter((m) => m?.width && m.height)
          .map((m) => (m!.width! / m!.height!).toFixed(2)),
      );
      if (shapes.size > 1) add("videos", "mixes frame shapes; later clips get black bars unless you reframe them first");
    }
  }
  return issues;
}
