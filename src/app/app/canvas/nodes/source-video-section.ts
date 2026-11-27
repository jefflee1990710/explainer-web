// Start, length, and ratio read from a Swap director's source video.

import type { CanvasNode } from "@/model/canvas";

export const SECTION_RATIOS = ["9:16", "16:9", "1:1"] as const;
export type SectionRatio = (typeof SECTION_RATIOS)[number];

const RATIO_VALUE: Record<SectionRatio, number> = {
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "1:1": 1,
};

// Named ratios the canvas already stores. Only 9:16, 16:9, and 1:1 are choices.
const NAMED_RATIO: Record<string, number> = {
  ...RATIO_VALUE,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
};

// Container offsets and rounding noise are not an edit in-point.
export const MEANINGFUL_IN_POINT_SECONDS = 0.15;

export type SourceVideoMeasure = {
  durationSeconds?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  // Missing when the source does not store a start. 0 is an explicit in-point.
  inPointSeconds?: number;
};

export type DerivedVideoSection = {
  start: number;
  length: number;
  ratio: SectionRatio;
};

export function roundSectionSeconds(seconds: number): number {
  return Math.round(seconds * 10) / 10;
}

export function meaningfulInPoint(seconds: number | undefined): number {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < MEANINGFUL_IN_POINT_SECONDS) {
    return 0;
  }
  return roundSectionSeconds(seconds);
}

// Nearest of the three existing choices. Does not add a new ratio.
export function closestSectionRatio(width: number, height: number): SectionRatio | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  const value = width / height;
  let best: SectionRatio = SECTION_RATIOS[0];
  let bestDelta = Infinity;
  for (const ratio of SECTION_RATIOS) {
    const delta = Math.abs(value - RATIO_VALUE[ratio]);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = ratio;
    }
  }
  return best;
}

export function closestSectionRatioFromAspect(aspect: string | undefined): SectionRatio | undefined {
  if (!aspect) return undefined;
  if ((SECTION_RATIOS as readonly string[]).includes(aspect)) return aspect as SectionRatio;
  const value = NAMED_RATIO[aspect];
  if (!value) return undefined;
  return closestSectionRatio(value * 1000, 1000);
}

// Length is the video duration. Start stays 0 unless the source already has an in-point.
export function sectionFromSourceVideo(measure: SourceVideoMeasure | undefined): DerivedVideoSection | undefined {
  if (!measure) return undefined;
  const duration = measure.durationSeconds;
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) return undefined;
  const ratio =
    typeof measure.width === "number" && typeof measure.height === "number"
      ? closestSectionRatio(measure.width, measure.height)
      : closestSectionRatioFromAspect(measure.aspectRatio);
  if (!ratio) return undefined;
  return {
    start: meaningfulInPoint(measure.inPointSeconds),
    length: roundSectionSeconds(duration),
    ratio,
  };
}

export function mergeSourceVideoMeasure(
  stored: SourceVideoMeasure | undefined,
  probe: SourceVideoMeasure | null | undefined,
): SourceVideoMeasure | undefined {
  if (!stored && !probe) return undefined;
  return {
    durationSeconds: stored?.durationSeconds ?? probe?.durationSeconds,
    width: probe?.width ?? stored?.width,
    height: probe?.height ?? stored?.height,
    aspectRatio: stored?.aspectRatio,
    inPointSeconds: stored?.inPointSeconds !== undefined ? stored.inPointSeconds : probe?.inPointSeconds,
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// Playable video URL on the node wired into the director. Images and empty nodes are not a source.
export function sourceVideoFromNode(node: CanvasNode | undefined): { url: string; measure: SourceVideoMeasure } | undefined {
  if (!node) return undefined;
  let url: string | undefined;
  if (node.type === "media" && node.data.mediaKind === "video") url = node.data.mediaUrl?.trim();
  else if (node.type === "model" && node.data.outputKind === "video") url = node.data.outputUrl?.trim();
  if (!url) return undefined;
  const params = node.data.toolParams ?? {};
  const inPointSeconds = finiteNumber(params.ffmpegStartSec) ?? finiteNumber(params.sectionStart);
  return {
    url,
    measure: {
      ...(finiteNumber(node.data.durationSeconds) ? { durationSeconds: node.data.durationSeconds } : {}),
      ...(node.data.aspectRatio ? { aspectRatio: node.data.aspectRatio } : {}),
      ...(inPointSeconds !== undefined ? { inPointSeconds } : {}),
    },
  };
}
