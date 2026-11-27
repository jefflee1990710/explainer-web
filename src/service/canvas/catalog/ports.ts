// Shared bilingual (zh-Hant / en) port and output builders for Canvas model specs.

import type { CanvasModelOutputSpec, CanvasPortSpec } from "@/model/canvas-model";

export function promptPort(required = true): CanvasPortSpec {
  return {
    id: "prompt",
    label: "提示詞 Prompt",
    labels: { "zh-Hant": "提示詞", en: "Prompt" },
    type: "text",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

export function imagePort(required = true): CanvasPortSpec {
  return {
    id: "image",
    label: "輸入圖片 Image",
    labels: { "zh-Hant": "輸入圖片", en: "Image" },
    type: "image",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

export function startImagePort(required = false): CanvasPortSpec {
  return {
    id: "startImage",
    label: "起始圖 Start Image",
    labels: { "zh-Hant": "起始圖", en: "Start Image" },
    type: "image",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

export function endImagePort(required = false): CanvasPortSpec {
  return {
    id: "endImage",
    label: "結束圖 End Image",
    labels: { "zh-Hant": "結束圖", en: "End Image" },
    type: "image",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

export function refImagesPort(maxConnections: number, required = false): CanvasPortSpec {
  return {
    id: "refImages",
    label: "參考圖 Ref Images",
    labels: { "zh-Hant": "參考圖", en: "Ref Images" },
    type: "image",
    required,
    multiple: true,
    maxConnections,
  };
}

export function videoPort(required = true): CanvasPortSpec {
  return {
    id: "video",
    label: "輸入影片 Video",
    labels: { "zh-Hant": "輸入影片", en: "Video" },
    type: "video",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

export function videosPort(maxConnections = 8): CanvasPortSpec {
  return {
    id: "videos",
    label: "多段影片 Videos",
    labels: { "zh-Hant": "多段影片", en: "Videos" },
    type: "video",
    required: true,
    multiple: true,
    maxConnections,
  };
}

export function refAudioPort(required = false): CanvasPortSpec {
  return {
    id: "refAudio",
    label: "參考音訊 Audio",
    labels: { "zh-Hant": "參考音訊", en: "Audio" },
    type: "audio",
    required,
    multiple: false,
    maxConnections: 1,
  };
}

export function imageOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出圖片 Image",
    labels: { "zh-Hant": "輸出圖片", en: "Image" },
    type: "image",
  };
}

export function videoOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出影片 Video",
    labels: { "zh-Hant": "輸出影片", en: "Video" },
    type: "video",
  };
}

export function audioOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出音訊 Audio",
    labels: { "zh-Hant": "輸出音訊", en: "Audio" },
    type: "audio",
  };
}

export function textOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出字幕 Subtitles",
    labels: { "zh-Hant": "輸出字幕", en: "Subtitles" },
    type: "text",
  };
}

// Plain generated text (a text-model node), not a subtitle file.
export function generatedTextOutput(): CanvasModelOutputSpec {
  return {
    id: "output",
    label: "輸出文字 Text",
    labels: { "zh-Hant": "輸出文字", en: "Text" },
    type: "text",
  };
}

export function audiosPort(maxConnections = 8): CanvasPortSpec {
  return {
    id: "audios",
    label: "多段音訊 Audios",
    labels: { "zh-Hant": "多段音訊", en: "Audios" },
    type: "audio",
    required: true,
    multiple: true,
    maxConnections,
  };
}
