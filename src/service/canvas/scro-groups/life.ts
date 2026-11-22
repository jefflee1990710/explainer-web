// Pure: Life Photo as visible nodes — character still + scene prompt → Seedream 5.0 Pro.

import type { CanvasAspectRatio } from "@/model/canvas";
import {
  createGroupBuilder,
  SEEDREAM_MODEL_ID,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";

export type LifeGroupInput = {
  character: GroupMediaRef;
  scene: string;
  aspectRatio: CanvasAspectRatio;
};

// Same template the single `scro:life` node sends.
export function buildLifePhotoPrompt(scene: string): string {
  const text = scene.trim() || "Candid natural daylight lifestyle portrait";
  return (
    `Candid lifestyle photograph of the reference character. Scene and mood: ${text}. ` +
    `Natural candid framing, authentic textures, soft realistic lighting.`
  );
}

export function buildLifeGroup(ctx: GroupContext, input: LifeGroupInput): ScroGroup {
  const b = createGroupBuilder(ctx);
  const character = b.media("character", input.character);
  const prompt = b.prompt("prompt", buildLifePhotoPrompt(input.scene), "Life prompt");
  const image = b.model("image", {
    modelId: SEEDREAM_MODEL_ID,
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    resolution: "2k",
    prompt: "",
  });
  b.wire(character, image, "refImages");
  b.wire(prompt, image, "prompt");
  return b.finish(image);
}
