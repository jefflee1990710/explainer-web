// Pure: Scro Swap as visible nodes — settings + source → trim → swap render → H3 Soft grade.

import type { CanvasAspectRatio } from "@/model/canvas";
import type { SwapSettings } from "@/model/canvas-settings";
import {
  createGroupBuilder,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";
import { clampSectionLength, trimToolParams } from "@/service/canvas/settings/section";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";

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

export { clampSectionLength };

export function buildTrimNode(start: number, length: number) {
  return { modelId: "ffmpeg:trim-speed", presetId: "1.0x", toolParams: trimToolParams(start, length) };
}

export function swapSettingsValues(input: SwapGroupInput): SwapSettings {
  return {
    swapMode: input.mode,
    ...(input.objectTarget ? { objectTarget: input.objectTarget } : {}),
    ...(input.objectEditMode ? { objectEditMode: input.objectEditMode } : {}),
    ...(input.lightLookId ? { lightLookId: input.lightLookId } : {}),
    sectionStart: Math.max(0, input.sectionStart),
    sectionLength: clampSectionLength(input.sectionLength),
    aspectRatio: input.aspectRatio,
    gradeLook: "jutsu",
  };
}

export function buildSwapGroup(ctx: GroupContext, input: SwapGroupInput): ScroGroup {
  const b = createGroupBuilder(ctx);
  const video = b.media("video", input.video);
  const settings = b.settings("settings", { kind: "swap", values: swapSettingsValues(input) });

  if (input.mode === "colorfix") {
    const grade = b.model("grade", {
      modelId: "ffmpeg:color-grade",
      presetId: "jutsu",
      toolParams: { gradeLook: "jutsu" },
    });
    b.wire(video, grade, "video");
    b.wire(settings, grade, SETTINGS_HANDLE);
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
  for (const target of [trim, render, grade]) b.wire(settings, target, SETTINGS_HANDLE);
  return b.finish(grade);
}
