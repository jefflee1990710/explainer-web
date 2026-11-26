// Pure: Scro Swap as visible nodes — source → trim → swap render → H3 Soft grade.

import type { CanvasAspectRatio } from "@/model/canvas";
import {
  createGroupBuilder,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";
import { clampSectionLength, trimToolParams } from "@/service/canvas/core/settings/section";

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
  // Library character. The swap job already accepts this on the render node.
  characterId?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
};

export { clampSectionLength };

export function buildTrimNode(start: number, length: number) {
  return { modelId: "ffmpeg:trim-speed", presetId: "1.0x", toolParams: trimToolParams(start, length) };
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
      ...(input.characterId ? { characterId: input.characterId } : {}),
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

// Dropped onto the canvas with nothing picked yet. The user wires the source and reference,
// and edits the mode, section, and ratio on these nodes.
export function buildBlankSwapGroup(ctx: GroupContext): ScroGroup {
  const b = createGroupBuilder(ctx);
  const length = 6;
  const trim = b.model("trim", buildTrimNode(0, length));
  const render = b.model("render", {
    modelId: "scro:swap-render",
    presetId: "9:16",
    aspectRatio: "9:16",
    durationSeconds: length,
    prompt: "",
    toolParams: { swapMode: "character" },
  });
  const grade = b.model("grade", {
    modelId: "ffmpeg:color-grade",
    presetId: "jutsu",
    toolParams: { gradeLook: "jutsu" },
  });
  b.wire(trim, render, "video");
  b.wire(render, grade, "video");
  return b.finish(grade);
}
