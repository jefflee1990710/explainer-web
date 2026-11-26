// Field table for FFmpeg edit params without hand-built controls: the newer edit nodes and
// the options added to older ones. Defaults match the worker's fallbacks in ffmpeg-edit*.ts.

export type Opt = readonly [value: string, zh: string, en: string];

export type FfmpegParamField = {
  key: string;
  zh: string;
  en: string;
  kind: "number" | "select" | "check" | "text" | "textarea";
  def?: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly Opt[];
  // Spans both grid columns.
  wide?: boolean;
  show?: (params: Record<string, unknown>) => boolean;
};

export const SUBTITLE_LOOK_OPTIONS: readonly Opt[] = [
  ["clean", "簡潔", "Clean"],
  ["bold", "粗體", "Bold"],
  ["outline", "描邊", "Outline"],
  ["handwritten", "手寫", "Handwritten"],
  ["neon", "霓虹", "Neon"],
  ["comic", "漫畫", "Comic"],
  ["chalk", "粉筆", "Chalk"],
  ["gold", "金色", "Gold"],
  ["typewriter", "打字機", "Typewriter"],
  ["graffiti", "塗鴉", "Graffiti"],
  ["sticker", "貼紙", "Sticker"],
  ["glitch", "故障風", "Glitch"],
  ["brush", "毛筆", "Brush"],
];

const TRANSITION_OPTIONS: readonly Opt[] = [
  ["pad-200ms", "定格銜接 (200ms Pad)", "Pad 200ms"],
  ["cut", "硬切 (Hard Cut)", "Hard Cut"],
  ["fade", "淡入淡出 (Crossfade)", "Crossfade"],
  ["dissolve", "溶解", "Dissolve"],
  ["wipeleft", "向左抹除", "Wipe left"],
  ["wiperight", "向右抹除", "Wipe right"],
  ["slideleft", "向左滑動", "Slide left"],
  ["slideright", "向右滑動", "Slide right"],
];

const SHAPE_OPTIONS: readonly Opt[] = [
  ["source", "跟第一段", "Same as first clip"],
  ["9:16", "9:16", "9:16"],
  ["16:9", "16:9", "16:9"],
  ["1:1", "1:1", "1:1"],
  ["4:5", "4:5", "4:5"],
];

const POSITION_OPTIONS: readonly Opt[] = [
  ["top", "上方", "Top"],
  ["center", "中間", "Center"],
  ["bottom", "下方", "Bottom"],
];

const start = (key: string): FfmpegParamField => ({ key, zh: "開始（秒）", en: "Start (s)", kind: "number", def: 0, min: 0, step: 0.1 });
const end = (key: string): FfmpegParamField => ({ key, zh: "結束（秒，0＝到尾）", en: "End (s, 0 = end)", kind: "number", def: 0, min: 0, step: 0.1 });

export const FFMPEG_PARAM_FIELDS: Record<string, readonly FfmpegParamField[]> = {
  "ffmpeg:concat": [
    { key: "ffmpegTransition", zh: "轉場方式", en: "Transition", kind: "select", def: "pad-200ms", options: TRANSITION_OPTIONS },
    {
      key: "ffmpegTransitionSec",
      zh: "轉場長度（秒）",
      en: "Transition (s)",
      kind: "number",
      def: 0.35,
      min: 0.2,
      max: 1.5,
      step: 0.05,
      show: (p) => !["pad-200ms", "cut", undefined].includes(p.ffmpegTransition as string | undefined),
    },
    { key: "ffmpegAspect", zh: "畫面比例", en: "Frame", kind: "select", def: "source", options: SHAPE_OPTIONS },
  ],
  "ffmpeg:trim-speed": [{ key: "ffmpegReverse", zh: "倒播", en: "Play backwards", kind: "check" }],
  "ffmpeg:transform": [
    {
      key: "ffmpegResolution",
      zh: "解像度",
      en: "Resolution",
      kind: "select",
      def: "1080p",
      options: [
        ["720p", "720p", "720p"],
        ["1080p", "1080p", "1080p"],
        ["4k", "4K", "4K"],
      ],
    },
  ],
  "ffmpeg:keep-ranges": [
    {
      key: "ffmpegRangeMode",
      zh: "模式",
      en: "Mode",
      kind: "select",
      def: "keep",
      wide: true,
      options: [
        ["keep", "只保留這些區間", "Keep these ranges"],
        ["remove", "剪走這些區間", "Remove these ranges"],
      ],
    },
  ],
  "ffmpeg:overlay": [
    { key: "ffmpegOverlayX", zh: "左邊距 %", en: "Left %", kind: "number", def: 0, min: 0, max: 100, show: (p) => p.ffmpegOverlayPosition === "custom" },
    { key: "ffmpegOverlayY", zh: "上邊距 %", en: "Top %", kind: "number", def: 0, min: 0, max: 100, show: (p) => p.ffmpegOverlayPosition === "custom" },
    { key: "ffmpegOverlaySizePct", zh: "闊度 %", en: "Width %", kind: "number", def: 22, min: 5, max: 100 },
    {
      key: "ffmpegChromaKey",
      zh: "去背",
      en: "Key out",
      kind: "select",
      def: "none",
      options: [
        ["none", "不去背", "None"],
        ["green", "綠幕", "Green screen"],
        ["blue", "藍幕", "Blue screen"],
      ],
    },
    start("ffmpegOverlayStartSec"),
    end("ffmpegOverlayEndSec"),
  ],
  "ffmpeg:burn-subtitles": [
    { key: "subtitleLook", zh: "字幕樣式", en: "Look", kind: "select", def: "clean", options: SUBTITLE_LOOK_OPTIONS },
    {
      key: "ffmpegSubtitlePosition",
      zh: "位置",
      en: "Position",
      kind: "select",
      def: "bottom",
      options: [
        ["bottom", "下方", "Bottom"],
        ["middle", "中間", "Middle"],
        ["top", "上方", "Top"],
      ],
    },
  ],
  "ffmpeg:split": [
    { key: "ffmpegAtSec", zh: "分割時間（秒，空白＝中間）", en: "Split at (s, blank = middle)", kind: "number", min: 0.1, step: 0.1, wide: true },
  ],
  "ffmpeg:text": [
    { key: "ffmpegText", zh: "文字（可換行）", en: "Text (new line allowed)", kind: "textarea", wide: true },
    { key: "ffmpegTextPosition", zh: "位置", en: "Position", kind: "select", def: "bottom", options: POSITION_OPTIONS },
    { key: "ffmpegTextSizePct", zh: "字高 %", en: "Size %", kind: "number", def: 5, min: 2, max: 15, step: 0.5 },
    {
      key: "ffmpegTextColor",
      zh: "顏色",
      en: "Color",
      kind: "select",
      def: "white",
      options: [
        ["white", "白", "White"],
        ["yellow", "黃", "Yellow"],
        ["black", "黑", "Black"],
        ["lime", "螢光綠", "Lime"],
        ["red", "紅", "Red"],
      ],
    },
    { key: "ffmpegTextBox", zh: "深色底框", en: "Dark box", kind: "check" },
    start("ffmpegTextStartSec"),
    end("ffmpegTextEndSec"),
  ],
  "ffmpeg:audio-mix": [
    { key: "ffmpegBgmVolumeDb", zh: "音樂音量 (dB)", en: "Music (dB)", kind: "number", def: -18, min: -40, max: 6 },
    { key: "ffmpegBgmStartSec", zh: "音樂開始（秒）", en: "Music starts (s)", kind: "number", def: 0, min: 0, step: 0.1 },
    { key: "ffmpegBgmFadeOutSec", zh: "結尾淡出（秒）", en: "Fade out (s)", kind: "number", def: 1.5, min: 0, max: 10, step: 0.1 },
    { key: "ffmpegBgmLoop", zh: "音樂太短就重播", en: "Loop short music", kind: "check", def: true },
    { key: "ffmpegBgmDuck", zh: "說話時壓低音樂", en: "Duck under speech", kind: "check", def: true },
  ],
  "ffmpeg:audio-trim": [
    start("ffmpegStartSec"),
    end("ffmpegEndSec"),
    { key: "ffmpegAudioGainDb", zh: "音量 (dB)", en: "Gain (dB)", kind: "number", def: 0, min: -40, max: 24 },
    { key: "ffmpegFadeInSec", zh: "淡入（秒）", en: "Fade in (s)", kind: "number", def: 0, min: 0, max: 10, step: 0.1 },
    { key: "ffmpegFadeOutSec", zh: "淡出（秒）", en: "Fade out (s)", kind: "number", def: 0, min: 0, max: 10, step: 0.1 },
    { key: "ffmpegLoudnorm", zh: "統一響度", en: "Even loudness", kind: "check" },
  ],
  "ffmpeg:audio-concat": [
    { key: "ffmpegGapSec", zh: "段落間靜音（秒）", en: "Gap between (s)", kind: "number", def: 0, min: 0, max: 5, step: 0.1, wide: true },
  ],
  "ffmpeg:adjust": [
    { key: "ffmpegBrightness", zh: "亮度", en: "Brightness", kind: "number", def: 0, min: -0.5, max: 0.5, step: 0.05 },
    { key: "ffmpegContrast", zh: "對比", en: "Contrast", kind: "number", def: 1, min: 0.5, max: 2, step: 0.05 },
    { key: "ffmpegSaturation", zh: "飽和度", en: "Saturation", kind: "number", def: 1, min: 0, max: 3, step: 0.05 },
    { key: "ffmpegTemperatureK", zh: "色溫 K（高＝暖）", en: "Temp K (high = warm)", kind: "number", def: 6500, min: 3000, max: 10000, step: 100 },
    { key: "ffmpegVignette", zh: "暗角", en: "Vignette", kind: "check" },
  ],
  "ffmpeg:freeze": [
    { key: "ffmpegAtSec", zh: "定格時間（秒）", en: "Freeze at (s)", kind: "number", def: 0, min: 0, step: 0.1 },
    { key: "ffmpegDurationSec", zh: "停留（秒）", en: "Hold (s)", kind: "number", def: 1, min: 0.2, max: 10, step: 0.1 },
  ],
  "ffmpeg:export": [
    {
      key: "ffmpegFormat",
      zh: "格式",
      en: "Format",
      kind: "select",
      def: "mp4",
      options: [
        ["mp4", "MP4", "MP4"],
        ["webm", "WebM", "WebM"],
        ["gif", "GIF（無聲）", "GIF (silent)"],
      ],
    },
    {
      key: "ffmpegResolution",
      zh: "解像度",
      en: "Resolution",
      kind: "select",
      def: "source",
      options: [
        ["source", "原尺寸", "Source"],
        ["720p", "720p", "720p"],
        ["1080p", "1080p", "1080p"],
        ["4k", "4K", "4K"],
      ],
    },
    {
      key: "ffmpegFps",
      zh: "幀率",
      en: "FPS",
      kind: "select",
      def: "source",
      options: [
        ["source", "原幀率", "Source"],
        ["24", "24", "24"],
        ["30", "30", "30"],
        ["60", "60", "60"],
      ],
    },
    {
      key: "ffmpegQuality",
      zh: "畫質",
      en: "Quality",
      kind: "select",
      def: "standard",
      options: [
        ["high", "高", "High"],
        ["standard", "標準", "Standard"],
        ["small", "細檔", "Small"],
      ],
    },
    { key: "ffmpegFileName", zh: "檔名", en: "File name", kind: "text", wide: true },
    { key: "ffmpegLoudnorm", zh: "統一響度 (-14 LUFS)", en: "Loudness -14 LUFS", kind: "check" },
  ],
};
