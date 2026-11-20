// Curated starter workflow templates for the Interactive Node Canvas Editor (/app/canvas).

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  OPENROUTER_GPT_5_IMAGE_MODEL,
  OPENROUTER_HAILUO_3_VIDEO_MODEL,
  OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL,
  OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL,
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  OPENROUTER_WAN_3_VIDEO_MODEL,
} from "@/service/openrouter/generate";

export type CanvasStarterTemplateId =
  | "text-image-video"
  | "image-edit-upscale"
  | "text-image-cutout";

export type CanvasStarterTemplate = {
  id: CanvasStarterTemplateId;
  name: {
    "zh-Hant": string;
    en: string;
  };
  description: {
    "zh-Hant": string;
    en: string;
  };
};

export const CANVAS_STARTER_TEMPLATES: readonly CanvasStarterTemplate[] = [
  {
    id: "text-image-video",
    name: {
      "zh-Hant": "文生圖 → 圖生影片",
      en: "Text → Image → Video",
    },
    description: {
      "zh-Hant": "用 Seedream 5.0 Pro 出圖，直接接成 Wan 3.0 起始幀生成短片",
      en: "Generate a keyframe with Seedream 5.0 Pro and animate it with Wan 3.0",
    },
  },
  {
    id: "image-edit-upscale",
    name: {
      "zh-Hant": "生圖 → 參考重繪",
      en: "Image → Reference Restyle",
    },
    description: {
      "zh-Hant": "先用 Seedream 5.0 Lite 生圖，再交給 Nano Banana 2.1 依參考圖重繪",
      en: "Generate with Seedream 5.0 Lite, then restyle from that reference with Nano Banana 2.1",
    },
  },
  {
    id: "text-image-cutout",
    name: {
      "zh-Hant": "文生圖 → Hailuo 短片",
      en: "Text → Image → Hailuo",
    },
    description: {
      "zh-Hant": "先以 GPT-5 Image 生圖，再交給 MiniMax Hailuo 3 做成短片",
      en: "Create an image with GPT-5 Image and animate it with MiniMax Hailuo 3",
    },
  },
];

// Instantiates fresh node/edge IDs for a starter template so users can load it
// cleanly into a blank or existing canvas without ID collisions.
export function instantiateCanvasTemplate(
  templateId: CanvasStarterTemplateId,
  idPrefix = `tpl-${Date.now().toString(36)}`,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const id = (suffix: string) => `${idPrefix}-${suffix}`;

  if (templateId === "text-image-video") {
    const promptId = id("prompt");
    const imgModelId = id("image-model");
    const vidModelId = id("video-model");

    return {
      nodes: [
        {
          id: promptId,
          type: "prompt",
          position: { x: 40, y: 140 },
          data: {
            label: "Prompt",
            text: "A sleek glass perfume bottle resting on wet volcanic basalt rock, soft golden rim lighting, commercial studio macro photography",
          },
        },
        {
          id: imgModelId,
          type: "model",
          position: { x: 360, y: 80 },
          data: {
            modelId: `openrouter:${OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL}`,
            presetId: "9:16",
            aspectRatio: "9:16",
            prompt: "",
            status: "idle",
          },
        },
        {
          id: vidModelId,
          type: "model",
          position: { x: 760, y: 80 },
          data: {
            modelId: `openrouter:${OPENROUTER_WAN_3_VIDEO_MODEL}`,
            presetId: "9:16",
            aspectRatio: "9:16",
            prompt:
              "Slow cinematic dolly-in around the perfume bottle, subtle mist drifting across the dark basalt surface",
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-prompt-img"),
          source: promptId,
          sourceHandle: "output",
          target: imgModelId,
          targetHandle: "prompt",
        },
        {
          id: id("e-img-vid"),
          source: imgModelId,
          sourceHandle: "output",
          target: vidModelId,
          targetHandle: "startImage",
        },
      ],
    };
  }

  if (templateId === "image-edit-upscale") {
    const editModelId = id("edit-model");
    const upscaleModelId = id("upscale-model");

    return {
      nodes: [
        {
          id: editModelId,
          type: "model",
          position: { x: 260, y: 100 },
          data: {
            modelId: `openrouter:${OPENROUTER_SEEDREAM_5_LITE_IMAGE_MODEL}`,
            presetId: "1:1",
            aspectRatio: "1:1",
            prompt:
              "A ceramic perfume bottle on dark stone, soft studio light, square product photo",
            status: "idle",
          },
        },
        {
          id: upscaleModelId,
          type: "model",
          position: { x: 680, y: 100 },
          data: {
            modelId: `openrouter:${OPENROUTER_NANO_BANANA_2_1_IMAGE_MODEL}`,
            presetId: "1:1",
            aspectRatio: "1:1",
            prompt:
              "Restyle the reference into warm sunset window light and clean editorial color, keep the subject identical",
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-edit-up"),
          source: editModelId,
          sourceHandle: "output",
          target: upscaleModelId,
          targetHandle: "refImages",
        },
      ],
    };
  }

  // "text-image-cutout"
  const genModelId = id("gen-model");
  const cutoutModelId = id("cutout-model");

  return {
    nodes: [
      {
        id: genModelId,
        type: "model",
        position: { x: 180, y: 100 },
        data: {
          modelId: `openrouter:${OPENROUTER_GPT_5_IMAGE_MODEL}`,
          presetId: "1:1",
          aspectRatio: "1:1",
          prompt:
            "Cute minimal ceramic coffee mug with matte sage glaze centered on a clean studio backdrop, crisp product photo",
          status: "idle",
        },
      },
      {
        id: cutoutModelId,
        type: "model",
        position: { x: 600, y: 100 },
        data: {
          modelId: `openrouter:${OPENROUTER_HAILUO_3_VIDEO_MODEL}`,
          presetId: "1:1",
          aspectRatio: "1:1",
          prompt: "Slow push-in on the coffee mug, soft light shifting across the glaze",
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: id("e-gen-cutout"),
        source: genModelId,
        sourceHandle: "output",
        target: cutoutModelId,
        targetHandle: "startImage",
      },
    ],
  };
}
