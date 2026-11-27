// Style transfer keeps one canvas node. Run sends the connected image through
// the image model stored on the node, using that model's existing job path.

import type { CanvasNode } from "@/model/canvas";
import type { CanvasModelSpec } from "@/model/canvas-model";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";

export const STYLE_TRANSFER_MODEL_ID = "scro:style-transfer";
export const STYLE_TRANSFER_IMAGE_MODEL_KEY = "imageModelId";

// Fixed instruction so the chosen image model redraws the reference instead of inventing a new scene.
export const STYLE_TRANSFER_PROMPT =
  "Style transfer. Recreate the reference image as a new picture with a strong, cohesive artistic style. Keep the same subject, pose, and framing. Do not add text.";

export type StyleTransferRun =
  | { ok: true; spec: CanvasModelSpec; inputs: ResolvedCanvasInputs }
  | { ok: false; reason: string; missingRequiredFields: string[] };

// Image generators that can take the connected picture as a reference.
export function styleTransferImageModels(catalog: readonly CanvasModelSpec[]): CanvasModelSpec[] {
  return catalog.filter((spec) => {
    if (spec.id === STYLE_TRANSFER_MODEL_ID) return false;
    if (spec.category !== "image" || spec.available === false || spec.hiddenInSidebar) return false;
    return spec.inputs.some((port) => port.type === "image");
  });
}

export function readStyleTransferModelId(node: CanvasNode): string | undefined {
  const raw = node.data.toolParams?.[STYLE_TRANSFER_IMAGE_MODEL_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

// Sync image providers read `refImages`. Declared image ports are filled too.
export function styleTransferGenerationInputs(
  imageUrl: string,
  target: CanvasModelSpec,
): ResolvedCanvasInputs {
  const inputs: ResolvedCanvasInputs = {
    prompt: STYLE_TRANSFER_PROMPT,
    refImages: [imageUrl],
    videos: [],
  };
  for (const port of target.inputs) {
    if (port.id === "image") inputs.image = imageUrl;
    if (port.id === "startImage") inputs.startImage = imageUrl;
    if (port.id === "endImage") inputs.endImage = imageUrl;
  }
  return inputs;
}

// Turns the style-transfer node into the chosen image model's job inputs.
export function prepareStyleTransferRun(
  node: CanvasNode,
  inputs: ResolvedCanvasInputs,
  catalog: readonly CanvasModelSpec[],
): StyleTransferRun {
  const imageUrl = inputs.image?.trim();
  if (!imageUrl) {
    return {
      ok: false,
      reason: "風格轉換需要連接一張圖片",
      missingRequiredFields: ["image"],
    };
  }
  const modelId = readStyleTransferModelId(node);
  if (!modelId) {
    return {
      ok: false,
      reason: "請先選擇圖片模型",
      missingRequiredFields: [STYLE_TRANSFER_IMAGE_MODEL_KEY],
    };
  }
  const spec = styleTransferImageModels(catalog).find((item) => item.id === modelId);
  if (!spec) {
    return {
      ok: false,
      reason: "這個圖片模型不能用參考圖做風格轉換",
      missingRequiredFields: [STYLE_TRANSFER_IMAGE_MODEL_KEY],
    };
  }
  return { ok: true, spec, inputs: styleTransferGenerationInputs(imageUrl, spec) };
}
