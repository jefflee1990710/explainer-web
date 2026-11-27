// Edit checks for FFmpeg nodes the agent added or changed this turn: times past the
// source's end, sound edits on a silent source, and too many or mismatched concat clips.
// Sources are read through their output handle, so Split's part B has its own length.

import type { CanvasNode } from "@/model/canvas";
import { SEQUENCE_MODEL_ID } from "@/model/canvas-sequence";
import { expectedNodeMedia, sequenceSourceDurations, wiredEdges, wiredSourceMedia } from "@/service/canvas/core/edit-media";
import { readSequence, sequenceIssues, syncSequenceWithEdges } from "@/service/canvas/core/sequence";
import { complementRanges, mergeRanges, parseKeepRanges } from "@/service/canvas/core/edit-ranges";
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
    const { id: sourceId, media: source } = wiredSourceMedia(g, node.id, modelId === "ffmpeg:audio-trim" ? "refAudio" : "video");
    const duration = source?.durationSec;
    const pastEnd = (field: string, what: string, at: number) => {
      if (duration !== undefined && at >= duration) add(field, `${what} at ${sec(at)} but the source is only ${sec(duration)} long`);
    };

    if (modelId === SEQUENCE_MODEL_ID) {
      const seq = syncSequenceWithEdges(readSequence(node.data.toolParams), node.id, g.edges);
      for (const issue of sequenceIssues(seq, sequenceSourceDurations(g, node.id))) add(`timeline.${issue.field}`, issue.message);
      continue;
    }

    if (NEEDS_SOUND.has(modelId) && source?.hasAudio === false) {
      add("video", `its source ${sourceId} has no sound, so this edit fails`);
    }

    if ((modelId === "ffmpeg:trim-speed" || modelId === "ffmpeg:audio-trim") && duration !== undefined) {
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
          else if (node.data.toolParams?.ffmpegRangeMode === "remove" && complementRanges(mergeRanges(ranges), duration).length === 0) {
            add("ffmpegRanges", "removes the whole clip");
          }
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

    if (modelId === "ffmpeg:frame-grab") pastEnd("ffmpegAtSec", "grabs", num(node, "ffmpegAtSec") ?? 0);
    if (modelId === "ffmpeg:freeze") pastEnd("ffmpegAtSec", "freezes", num(node, "ffmpegAtSec") ?? 0);
    if (modelId === "ffmpeg:text") pastEnd("ffmpegTextStartSec", "text starts", num(node, "ffmpegTextStartSec") ?? 0);
    if (modelId === "ffmpeg:overlay") pastEnd("ffmpegOverlayStartSec", "overlay starts", num(node, "ffmpegOverlayStartSec") ?? 0);
    if (modelId === "ffmpeg:audio-mix") pastEnd("ffmpegBgmStartSec", "music starts", num(node, "ffmpegBgmStartSec") ?? 0);
    if (modelId === "ffmpeg:split") {
      const at = num(node, "ffmpegAtSec") ?? 0;
      if (at <= 0) add("ffmpegAtSec", "splits at 0s, so part A would be empty");
      else pastEnd("ffmpegAtSec", "splits", at);
    }

    if (modelId === "ffmpeg:audio-concat") {
      const port = spec.inputs.find((p) => p.id === "audios");
      const parts = wiredEdges(g, node.id, "audios");
      if (port && parts.length > port.maxConnections) add("audios", `has ${parts.length} tracks but takes at most ${port.maxConnections}`);
    }

    if (modelId === "ffmpeg:concat") {
      const port = spec.inputs.find((p) => p.id === "videos");
      const clips = wiredEdges(g, node.id, "videos");
      if (port && clips.length > port.maxConnections) {
        add("videos", `has ${clips.length} clips but takes at most ${port.maxConnections}; chain a second concat`);
      }
      const reframed = (node.data.toolParams?.ffmpegAspect ?? "source") !== "source";
      const shapes = new Set(
        clips
          .filter(() => !reframed)
          .map((e) => expectedNodeMedia(g, e.source, new Set(), e.sourceHandle))
          .filter((m) => m?.width && m.height)
          .map((m) => (m!.width! / m!.height!).toFixed(2)),
      );
      if (shapes.size > 1) add("videos", "mixes frame shapes; set ffmpegAspect or reframe them first, or later clips get black bars");
    }
  }
  return issues;
}
