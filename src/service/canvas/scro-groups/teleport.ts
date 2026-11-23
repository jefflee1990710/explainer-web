// Pure: Teleport as visible nodes — settings + source → trim → teleport render ← scene → H3 Soft grade.

import type { CanvasAspectRatio } from "@/model/canvas";
import type { TeleportSettings } from "@/model/canvas-settings";
import type { AspectRatio } from "@/model/project";
import {
  createGroupBuilder,
  SEEDREAM_MODEL_ID,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";
import { buildTrimNode, clampSectionLength } from "@/service/canvas/scro-groups/swap";
import { SETTINGS_HANDLE } from "@/service/canvas/settings/types";
import { buildTeleportScenePlatePrompt } from "@/service/teleport/prompts";

export type TeleportGroupInput = {
  video: GroupMediaRef;
  scene: { kind: "image"; ref: GroupMediaRef } | { kind: "text"; text: string };
  mood?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
};

export function teleportSettingsValues(input: TeleportGroupInput): TeleportSettings {
  const mood = input.mood?.trim();
  return {
    sectionStart: Math.max(0, input.sectionStart),
    sectionLength: clampSectionLength(input.sectionLength),
    aspectRatio: input.aspectRatio,
    ...(mood ? { mood } : {}),
    gradeLook: "jutsu",
  };
}

export function buildTeleportGroup(ctx: GroupContext, input: TeleportGroupInput): ScroGroup {
  const b = createGroupBuilder(ctx);
  const length = clampSectionLength(input.sectionLength);
  const video = b.media("video", input.video);
  const settings = b.settings("settings", { kind: "teleport", values: teleportSettingsValues(input) });
  const trim = b.model("trim", buildTrimNode(input.sectionStart, length));
  const render = b.model("render", {
    modelId: "scro:teleport-render",
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    durationSeconds: length,
    prompt: "",
  });
  const grade = b.model("grade", {
    modelId: "ffmpeg:color-grade",
    presetId: "jutsu",
    toolParams: { gradeLook: "jutsu" },
  });

  let scene: string;
  if (input.scene.kind === "image") {
    scene = b.media("scene", input.scene.ref);
  } else {
    // Text-only scenes first draw an empty scene plate, as the Teleport page does.
    const platePrompt = b.prompt(
      "scene-prompt",
      buildTeleportScenePlatePrompt(input.scene.text, input.aspectRatio as AspectRatio),
      "Scene prompt",
    );
    scene = b.model("scene", {
      modelId: SEEDREAM_MODEL_ID,
      presetId: input.aspectRatio,
      aspectRatio: input.aspectRatio,
      resolution: "2k",
      prompt: "",
    });
    b.wire(platePrompt, scene, "prompt");
  }

  b.wire(video, trim, "video");
  b.wire(trim, render, "video");
  b.wire(scene, render, "image");
  b.wire(render, grade, "video");
  for (const target of [trim, render, grade]) b.wire(settings, target, SETTINGS_HANDLE);
  return b.finish(grade);
}
