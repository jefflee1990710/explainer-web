// Pure: splits clip outputs across chained FFmpeg Concat nodes (8 inputs max per node).

import type { CanvasNodeData } from "@/model/canvas";

export const CONCAT_MAX_INPUTS = 8;

export const CONCAT_NODE_DATA: CanvasNodeData = {
  modelId: "ffmpeg:concat",
  presetId: "pad-200ms",
  toolParams: { ffmpegTransition: "pad-200ms" },
};

// First concat takes up to 8 clips; each next one takes the previous concat + up to 7 clips.
export function concatBatches(items: readonly string[]): string[][] {
  const batches: string[][] = [items.slice(0, CONCAT_MAX_INPUTS)];
  for (let i = CONCAT_MAX_INPUTS; i < items.length; i += CONCAT_MAX_INPUTS - 1) {
    batches.push(items.slice(i, i + CONCAT_MAX_INPUTS - 1));
  }
  return batches;
}

// Adds one concat per batch, wiring the previous concat first so clip order is kept.
export function chainConcats(
  items: readonly string[],
  addConcat: (step: number) => string,
  wire: (source: string, target: string, targetHandle: string) => void,
): string {
  let previous: string | undefined;
  concatBatches(items).forEach((batch, index) => {
    const concatId = addConcat(index + 1);
    if (previous) wire(previous, concatId, "videos");
    for (const item of batch) wire(item, concatId, "videos");
    previous = concatId;
  });
  return previous!;
}
