// Pure: Teleport as visible nodes — source → trim → teleport render ← scene → H3 Soft grade.

import type { CanvasAspectRatio } from "@/model/canvas";
import type { AspectRatio } from "@/model/project";
import {
  createGroupBuilder,
  SEEDREAM_MODEL_ID,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";
import { buildTrimNode, clampSectionLength } from "@/service/canvas/scro-groups/swap";
import { buildTeleportScenePlatePrompt } from "@/service/teleport/prompts";

export type TeleportGroupInput = {
  video: GroupMediaRef;
  scene: { kind: "image"; ref: GroupMediaRef } | { kind: "text"; text: string };
  mood?: string;
  sectionStart: number;
  sectionLength: number;
  aspectRatio: CanvasAspectRatio;
};

export function buildTeleportGroup(ctx: GroupContext, input: TeleportGroupInput): ScroGroup {
  const b = createGroupBuilder(ctx);
  const length = clampSectionLength(input.sectionLength);
  const video = b.media("video", input.video);
  const trim = b.model("trim", buildTrimNode(input.sectionStart, length));
  // The render prompt is the optional mood; the scene image sets the place.
  const render = b.model("render", {
    modelId: "scro:teleport-render",
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    durationSeconds: length,
    prompt: input.mood?.trim() ?? "",
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
  return b.finish(grade);
}
