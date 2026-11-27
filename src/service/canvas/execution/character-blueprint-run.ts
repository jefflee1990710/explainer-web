// Draws one character blueprint with Seedream 5.0 Pro. Photos, then outfit images, stay within 14 references.

import type { CanvasNode } from "@/model/canvas";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import {
  characterBlueprintGap,
  characterBlueprintPrompt,
  characterBlueprintReferenceUrls,
} from "@/service/canvas/core/character-blueprint";
import { persistMedia } from "@/service/higgsfield/persist";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";

type SubmitImage = typeof submitOpenRouterImage;

export async function runCanvasCharacterBlueprint(
  params: {
    clerkUserId: string;
    jobIdHex: string;
    node: CanvasNode;
    inputs: ResolvedCanvasInputs;
  },
  deps?: {
    submitImage?: SubmitImage;
    persistImageUrl?: (url: string, pathname: string) => Promise<string>;
  },
): Promise<{ outputUrl: string; outputKind: "image" }> {
  const outfitWires = params.inputs.outfitRefs ?? [];
  const imageCount = params.inputs.refImages.length + outfitWires.length;
  if (characterBlueprintGap({ prompt: params.inputs.prompt, imageCount })) {
    throw new Error("請描述角色，或接上參考圖／穿搭");
  }

  const prompt = characterBlueprintPrompt({
    name: params.node.data.label,
    description: params.inputs.prompt,
    outfitWires,
    photoCount: params.inputs.refImages.length,
  });
  const referenceImageUrls = characterBlueprintReferenceUrls({
    refImages: params.inputs.refImages,
    outfitUrls: outfitWires.map((wire) => wire.url),
  });
  const submitImage = deps?.submitImage ?? submitOpenRouterImage;
  const persistImageUrl = deps?.persistImageUrl ?? ((url: string, pathname: string) => persistMedia(url, pathname));
  const res = await submitImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt,
    aspectRatio: "1:1",
    resolution: "2k",
    referenceImageUrls,
  });
  const rawUrl = res.images?.[0]?.url;
  if (res.status === "failed" || res.status === "nsfw" || !rawUrl) {
    throw new Error(res.error || "角色藍圖生成失敗");
  }
  const outputUrl = await persistImageUrl(
    rawUrl,
    `canvas/${params.clerkUserId}/${params.jobIdHex}.png`,
  );
  return { outputUrl, outputKind: "image" };
}
