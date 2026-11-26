// Pure: a Swap / Teleport render runs as long as the trimmed section.

import type { CanvasGroup, CanvasNode } from "@/model/canvas";
import { clampSectionLength } from "@/service/canvas/core/settings/section";

const RENDER_MODEL_IDS = new Set(["scro:swap-render", "scro:teleport-render"]);

export function renderDurationForTrim(
  nodes: readonly CanvasNode[],
  group: CanvasGroup | undefined,
  toolParams: Record<string, unknown>,
): { renderId: string; durationSeconds: number } | undefined {
  if (!group || (group.kind !== "swap" && group.kind !== "teleport")) return undefined;
  const start = Number(toolParams.ffmpegStartSec ?? 0);
  const end = toolParams.ffmpegEndSec;
  if (typeof end !== "number" || !Number.isFinite(start)) return undefined;
  const render = nodes.find((node) => group.memberIds.includes(node.id) && RENDER_MODEL_IDS.has(node.data.modelId ?? ""));
  return render ? { renderId: render.id, durationSeconds: clampSectionLength(end - start) } : undefined;
}
