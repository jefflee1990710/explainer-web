// Curated workflow templates for the Interactive Node Canvas Editor (/app/canvas).

import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  OPENROUTER_WAN_3_VIDEO_MODEL,
} from "@/service/openrouter/generate";

export type CanvasStarterTemplateId =
  | "talking-head"
  | "explainer"
  | "scro-swap"
  | "teleport"
  | "ffmpeg-reel"
  | "text-image-video";

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
    id: "talking-head",
    name: {
      "zh-Hant": "Talking Head 對鏡口播",
      en: "Talking Head (TTS → Avatar)",
    },
    description: {
      "zh-Hant": "先用 ElevenLabs TTS 配音，再駁入 Talking Head 生成 1080p 真人口播短片",
      en: "Synthesize speech with ElevenLabs TTS and drive Talking Head lip-sync",
    },
  },
  {
    id: "explainer",
    name: {
      "zh-Hant": "Explainer AI 解說短片",
      en: "AI Explainer Video",
    },
    description: {
      "zh-Hant": "輸入主題或文章，自動規劃分鏡、白板／剪紙圖表與旁白成片",
      en: "Turn any topic into a multi-clip animated explainer with voiceover",
    },
  },
  {
    id: "scro-swap",
    name: {
      "zh-Hant": "Scro Swap 角色／穿搭換角",
      en: "Scro Swap Character Remix",
    },
    description: {
      "zh-Hant": "拖入來源影片與角色參考圖，一鍵替換畫面人物並保留原本動作光影",
      en: "Swap the person in any video into your AI character while keeping motion",
    },
  },
  {
    id: "teleport",
    name: {
      "zh-Hant": "Teleport 實景換場",
      en: "Teleport Scene Relocate",
    },
    description: {
      "zh-Hant": "鎖住原片人物與動作，直接把人傳送到全新背景或場景",
      en: "Keep the subject and performance while relocating them into a new scene",
    },
  },
  {
    id: "ffmpeg-reel",
    name: {
      "zh-Hant": "FFmpeg 多段合併配音剪輯",
      en: "FFmpeg Concat + Audio Mux",
    },
    description: {
      "zh-Hant": "用 FFmpeg 合併多段影片，再與 ElevenLabs 旁白或音樂混音成片",
      en: "Join multiple clips with FFmpeg Concat and mix TTS/BGM via Audio Mux",
    },
  },
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
];

export function isCanvasStarterTemplateId(raw?: string): raw is CanvasStarterTemplateId {
  return CANVAS_STARTER_TEMPLATES.some((tpl) => tpl.id === raw);
}

// Instantiates fresh node/edge IDs for a starter template so users can load it
// cleanly into a blank or existing canvas without ID collisions.
export function instantiateCanvasTemplate(
  templateId: CanvasStarterTemplateId,
  idPrefix = `tpl-${Date.now().toString(36)}`,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const id = (suffix: string) => `${idPrefix}-${suffix}`;

  if (templateId === "talking-head") {
    const promptId = id("script");
    const ttsId = id("tts");
    const talkingId = id("talking-head");
    return {
      nodes: [
        {
          id: promptId,
          type: "prompt",
          position: { x: 40, y: 120 },
          data: {
            label: "Script",
            text: "大家好，今日同大家分享點樣用 Scro Canvas 一站式製作 AI 網紅口播短片。",
          },
        },
        {
          id: ttsId,
          type: "model",
          position: { x: 360, y: 120 },
          data: {
            modelId: "scro:tts",
            presetId: "natural",
            prompt: "",
            toolParams: { language: "yue", voicePreset: "cathy", ttsSpeed: 1 },
            status: "idle",
          },
        },
        {
          id: talkingId,
          type: "model",
          position: { x: 740, y: 80 },
          data: {
            modelId: "scro:talking-head",
            presetId: "9:16",
            aspectRatio: "9:16",
            prompt: "",
            toolParams: { language: "yue", framing: "collarbone-close" },
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-script-tts"),
          source: promptId,
          sourceHandle: "output",
          target: ttsId,
          targetHandle: "prompt",
        },
        {
          id: id("e-tts-talking"),
          source: ttsId,
          sourceHandle: "output",
          target: talkingId,
          targetHandle: "refAudio",
        },
      ],
    };
  }

  if (templateId === "explainer") {
    const promptId = id("topic");
    const expId = id("explainer");
    return {
      nodes: [
        {
          id: promptId,
          type: "prompt",
          position: { x: 80, y: 120 },
          data: {
            label: "Topic",
            text: "用 3 個簡單比喻解釋乜嘢係復利效應，適合 IG Reels 觀眾。",
          },
        },
        {
          id: expId,
          type: "model",
          position: { x: 420, y: 80 },
          data: {
            modelId: "scro:explainer",
            presetId: "9:16",
            aspectRatio: "9:16",
            durationSeconds: 30,
            prompt: "",
            toolParams: {
              skillSlug: "cartoon-explainer-video-director",
              language: "yue",
              durationPreset: "30s",
            },
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-topic-exp"),
          source: promptId,
          sourceHandle: "output",
          target: expId,
          targetHandle: "prompt",
        },
      ],
    };
  }

  if (templateId === "scro-swap") {
    const vidId = id("source-video");
    const swapId = id("scro-swap");
    return {
      nodes: [
        {
          id: vidId,
          type: "media",
          position: { x: 80, y: 120 },
          data: {
            label: "Source Video (Upload)",
            mediaKind: "video",
            mediaUrl: "",
          },
        },
        {
          id: swapId,
          type: "model",
          position: { x: 400, y: 80 },
          data: {
            modelId: "scro:swap",
            presetId: "9:16",
            durationSeconds: 6,
            prompt: "",
            toolParams: { swapMode: "character" },
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-vid-swap"),
          source: vidId,
          sourceHandle: "output",
          target: swapId,
          targetHandle: "video",
        },
      ],
    };
  }

  if (templateId === "teleport") {
    const vidId = id("source-video");
    const scenePromptId = id("scene-prompt");
    const teleportId = id("teleport");
    return {
      nodes: [
        {
          id: vidId,
          type: "media",
          position: { x: 60, y: 40 },
          data: {
            label: "Source Video (Upload)",
            mediaKind: "video",
            mediaUrl: "",
          },
        },
        {
          id: scenePromptId,
          type: "prompt",
          position: { x: 60, y: 280 },
          data: {
            label: "Scene Prompt",
            text: "Modern minimalist Tokyo coffee bar with warm morning window light",
          },
        },
        {
          id: teleportId,
          type: "model",
          position: { x: 400, y: 120 },
          data: {
            modelId: "scro:teleport",
            presetId: "9:16",
            aspectRatio: "9:16",
            durationSeconds: 6,
            prompt: "",
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-vid-tp"),
          source: vidId,
          sourceHandle: "output",
          target: teleportId,
          targetHandle: "video",
        },
        {
          id: id("e-scene-tp"),
          source: scenePromptId,
          sourceHandle: "output",
          target: teleportId,
          targetHandle: "prompt",
        },
      ],
    };
  }

  if (templateId === "ffmpeg-reel") {
    const clip1Id = id("clip-1");
    const clip2Id = id("clip-2");
    const concatId = id("concat");
    const ttsId = id("tts");
    const muxId = id("audio-mux");
    return {
      nodes: [
        {
          id: clip1Id,
          type: "media",
          position: { x: 40, y: 20 },
          data: { label: "Clip 1", mediaKind: "video", mediaUrl: "" },
        },
        {
          id: clip2Id,
          type: "media",
          position: { x: 40, y: 240 },
          data: { label: "Clip 2", mediaKind: "video", mediaUrl: "" },
        },
        {
          id: concatId,
          type: "model",
          position: { x: 360, y: 80 },
          data: {
            modelId: "ffmpeg:concat",
            presetId: "pad-200ms",
            toolParams: { ffmpegTransition: "pad-200ms" },
            status: "idle",
          },
        },
        {
          id: ttsId,
          type: "model",
          position: { x: 360, y: 340 },
          data: {
            modelId: "scro:tts",
            presetId: "natural",
            prompt: "兩段影片無縫接駁完成，配埋高清旁白。",
            toolParams: { language: "yue", voicePreset: "alan", ttsSpeed: 1 },
            status: "idle",
          },
        },
        {
          id: muxId,
          type: "model",
          position: { x: 740, y: 160 },
          data: {
            modelId: "ffmpeg:audio-mux",
            presetId: "replace",
            toolParams: { ffmpegMixMode: "replace", ffmpegAudioGainDb: 0 },
            status: "idle",
          },
        },
      ],
      edges: [
        {
          id: id("e-c1-concat"),
          source: clip1Id,
          sourceHandle: "output",
          target: concatId,
          targetHandle: "videos",
        },
        {
          id: id("e-c2-concat"),
          source: clip2Id,
          sourceHandle: "output",
          target: concatId,
          targetHandle: "videos",
        },
        {
          id: id("e-concat-mux"),
          source: concatId,
          sourceHandle: "output",
          target: muxId,
          targetHandle: "video",
        },
        {
          id: id("e-tts-mux"),
          source: ttsId,
          sourceHandle: "output",
          target: muxId,
          targetHandle: "refAudio",
        },
      ],
    };
  }

  // "text-image-video"
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
