// Pure: Scro Swap as visible nodes — source → trim → swap render → H3 Soft grade.

import type { CanvasAspectRatio } from "@/model/canvas";
import {
  createGroupBuilder,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";

export type SwapGroupInput = {
  video: GroupMediaRef;
  mode: "character" | "object" | "relight" | "colorfix";
  // Character blueprint or uploaded reference image.
  reference?: GroupMediaRef;
  // Custom edit (character), change-to (object), or light prompt (relight).
  instruction?: string;
  objectTarget?: string;
  objectEditMode?: "change" | "add" | "remove";
  lightLookId?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
};

// Comfy renders 2–15s per job.
export function clampSectionLength(seconds: number): number {
  return Math.min(15, Math.max(2, Math.round(Number.isFinite(seconds) ? seconds : 6)));
}

export function buildTrimNode(start: number, length: number) {
  const from = Math.max(0, Number.isFinite(start) ? start : 0);
  return {
    modelId: "ffmpeg:trim-speed",
    presetId: "1.0x",
    toolParams: { ffmpegStartSec: from, ffmpegEndSec: from + length, ffmpegSpeed: 1 },
  };
}

export function buildSwapGroup(ctx: GroupContext, input: SwapGroupInput): ScroGroup {
  const b = createGroupBuilder(ctx);
  const video = b.media("video", input.video);

  if (input.mode === "colorfix") {
    const grade = b.model("grade", {
      modelId: "ffmpeg:color-grade",
      presetId: "jutsu",
      toolParams: { gradeLook: "jutsu" },
    });
    b.wire(video, grade, "video");
    return b.finish(grade);
  }

  const length = clampSectionLength(input.sectionLength);
  const trim = b.model("trim", buildTrimNode(input.sectionStart, length));
  const render = b.model("render", {
    modelId: "scro:swap-render",
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    durationSeconds: length,
    prompt: "",
    toolParams: {
      swapMode: input.mode,
      ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
      ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
      ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
    },
  });
  const grade = b.model("grade", {
    modelId: "ffmpeg:color-grade",
    presetId: "jutsu",
    toolParams: { gradeLook: "jutsu" },
  });
  b.wire(video, trim, "video");
  b.wire(trim, render, "video");
  if (input.reference) b.wire(b.media("reference", input.reference), render, "refImages");
  const instruction = input.instruction?.trim();
  if (instruction) b.wire(b.prompt("instruction", instruction, "Swap prompt"), render, "prompt");
  b.wire(render, grade, "video");
  return b.finish(grade);
}
