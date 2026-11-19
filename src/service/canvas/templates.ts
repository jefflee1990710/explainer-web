// Curated starter workflow templates for the Interactive Node Canvas Editor (/app/canvas).

import type { CanvasEdge, CanvasNode } from "@/model/canvas";

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
      "zh-Hant": "用 FLUX.2 快速出圖，直接接成 Wan 2.2 起始幀生成短片",
      en: "Generate a keyframe with FLUX.2 and animate it with Wan 2.2",
    },
  },
  {
    id: "image-edit-upscale",
    name: {
      "zh-Hant": "修圖 → 2x 超解析放大",
      en: "Image → Edit → 2x Upscale",
    },
    description: {
      "zh-Hant": "用 Qwen-Image-Edit 指令修圖，再送入 SeedVR2 放大 2 倍",
      en: "Edit an image with Qwen-Image-Edit and upscale 2x with SeedVR2",
    },
  },
  {
    id: "text-image-cutout",
    name: {
      "zh-Hant": "文生圖 → 一鍵去背",
      en: "Text → Image → Cutout",
    },
    description: {
      "zh-Hant": "先以 FLUX.1 schnell 生圖，再由 BiRefNet 自動去背",
      en: "Create an image with FLUX.1 schnell and remove background with BiRefNet",
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
            modelId: "mentalok:flux-2-klein-4b",
            presetId: "flux2-klein-portrait",
            prompt: "",
            status: "idle",
          },
        },
        {
          id: vidModelId,
          type: "model",
          position: { x: 760, y: 80 },
          data: {
            modelId: "mentalok:wan-2-2",
            presetId: "wan22-portrait",
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
            modelId: "mentalok:qwen-image-edit-2511",
            presetId: "qwen-edit-4step",
            prompt:
              "Add warm sunset window light and clean editorial color grading, keep the subject identical",
            status: "idle",
          },
        },
        {
          id: upscaleModelId,
          type: "model",
          position: { x: 680, y: 100 },
          data: {
            modelId: "mentalok:seedvr2-image",
            presetId: "seedvr2-img-2x",
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
          targetHandle: "image",
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
          modelId: "mentalok:flux-schnell",
          presetId: "flux-square-1024",
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
          modelId: "mentalok:birefnet",
          presetId: "birefnet-auto",
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
        targetHandle: "image",
      },
    ],
  };
}
