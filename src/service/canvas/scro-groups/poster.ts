// Pure: Poster as visible nodes — character / product stills + post prompt → Seedream 5.0 Pro.

import type { CanvasAspectRatio } from "@/model/canvas";
import {
  createGroupBuilder,
  SEEDREAM_MODEL_ID,
  type GroupContext,
  type GroupMediaRef,
  type ScroGroup,
} from "@/service/canvas/scro-groups/builder";
import { buildPostCreatePrompt } from "@/service/post/prompts";

export type PosterGroupInput = {
  prompt: string;
  character?: { ref: GroupMediaRef; name: string };
  product?: { ref: GroupMediaRef; name: string };
  aspectRatio: CanvasAspectRatio;
};

export function buildPosterGroup(ctx: GroupContext, input: PosterGroupInput): ScroGroup {
  const b = createGroupBuilder(ctx);
  // Reference order must match the prompt's image ordinals: cast first, then products.
  const refs: string[] = [];
  if (input.character) refs.push(b.media("character", input.character.ref));
  if (input.product) refs.push(b.media("product", input.product.ref));
  const text = buildPostCreatePrompt({
    prompt: input.prompt.trim(),
    cast: input.character ? [{ name: input.character.name }] : [],
    products: input.product ? [{ name: input.product.name }] : [],
  });
  const prompt = b.prompt("prompt", text, "Poster prompt");
  const image = b.model("image", {
    modelId: SEEDREAM_MODEL_ID,
    presetId: input.aspectRatio,
    aspectRatio: input.aspectRatio,
    resolution: "2k",
    prompt: "",
  });
  for (const ref of refs) b.wire(ref, image, "refImages");
  b.wire(prompt, image, "prompt");
  return b.finish(image);
}
