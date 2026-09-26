import { listicleListEntries } from "@/service/director/skill-rules";
import type { SceneTextLanguage } from "@/model/project";

export type SceneTextPreset = {
  id: SceneTextLanguage;
  label: string;
  sublabel: string;
  // Instruction appended to the director / frame prompt.
  skillHint: string;
};

export const SCENE_TEXT_PRESETS: Record<SceneTextLanguage, SceneTextPreset> = {
  en: {
    id: "en",
    label: "English",
    sublabel: "英文標籤",
    skillHint:
      "On-canvas text language: English. Caption styling may be English handwriting or mixed-case lettering; never invent extra English titles besides the clip's englishVo.",
  },
  "zh-Hant": {
    id: "zh-Hant",
    label: "繁體中文",
    sublabel: "畫面文字",
    skillHint:
      "On-canvas text language: Traditional Chinese (繁體中文). Caption styling may use Traditional Chinese handwriting; never invent extra titles besides the clip's englishVo (keep that line in its own script).",
  },
  "zh-Hans": {
    id: "zh-Hans",
    label: "简体中文",
    sublabel: "画面文字",
    skillHint:
      "On-canvas text language: Simplified Chinese (简体中文). Caption styling may use Simplified Chinese handwriting; never invent extra titles besides the clip's englishVo (keep that line in its own script).",
  },
};

export const SCENE_TEXT_IDS = Object.keys(SCENE_TEXT_PRESETS) as SceneTextLanguage[];

// AliCloud / Qwen: steer away from lettering when scene text is off.
export const SCENE_TEXT_OFF_NEGATIVE_PROMPT =
  "text, words, letters, numbers, typography, captions, subtitles, signage, labels, watermark, logo";

// OFF but in-world labels allowed: only block caption-style writing, keep short tags.
export const SCENE_TEXT_CAPTIONS_OFF_NEGATIVE_PROMPT =
  "captions, subtitles, subtitle bar, paragraph text, printed font, watermark, logo";

export function isSceneTextLanguage(value: string): value is SceneTextLanguage {
  return SCENE_TEXT_IDS.includes(value as SceneTextLanguage);
}

// On-canvas text is always on; only the script is chosen. Legacy
// `sceneTextEnabled: false` rows resolve to on as well.
export function resolveSceneText(input: {
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  skillSlug?: string;
}) {
  const language = input.sceneTextLanguage && isSceneTextLanguage(input.sceneTextLanguage)
    ? input.sceneTextLanguage
    : "en";
  return { enabled: true, language, inWorldLabels: false };
}

// Shared wording for the "captions off, short in-world labels on" mode.
const IN_WORLD_LABELS_RULE =
  "Short in-world handwritten labels that belong to the scene ARE allowed and encouraged: yellow tags, arrow labels, bin or box names, 1–3 all-caps words each. They must name a prop or concept in the scene — never a title card, never a transcript of the voiceover.";

export function listicleOnCanvasLines(input: {
  clips: Array<{ clipNumber: number; narrativeJob: string; englishVo: string }>;
  clipNumber: number;
  typography?: string;
}) {
  const entries = listicleListEntries(input.clips);
  const current = entries.find((entry) => entry.clipNumber === input.clipNumber);
  const listLines = entries.map(
    (entry) => `List item ${entry.index} (spell exactly): "${entry.title}"`,
  );
  return [
    "On-canvas item list ON — highest priority. The scene MUST show a readable numbered list of these items as a primary graphic, not a tiny subtitle bar.",
    ...listLines,
    current
      ? `Highlight list item ${current.index} as the current beat.`
      : "Show the full list; this is the hook or outro.",
    input.typography?.trim() || "",
    "Only the listed item titles may appear as writing; no other invented labels.",
  ].filter(Boolean);
}

export function sceneTextSkillHint(
  enabled: boolean,
  language: SceneTextLanguage,
  options?: { dualBeat?: boolean; listicle?: boolean; inWorldLabels?: boolean },
) {
  if (options?.listicle) {
    return [
      "On-canvas text is REQUIRED for this director. Every still must show a readable numbered list of the item titles (each item clip's englishVo).",
      "Highlight the current item. The list is a primary graphic in the scene, not a tiny subtitle bar.",
      SCENE_TEXT_PRESETS[language].skillHint,
    ].join(" ");
  }
  if (!enabled && options?.inWorldLabels) {
    return [
      "Voiceover captions are OFF: never quote, transcribe, or subtitle the spoken line on canvas, and never add a title card.",
      IN_WORLD_LABELS_RULE,
      "Write each label's exact wording inside 「」 in startScene / endScene so the still prompt can spell it; count labels, tags, and arrows toward the 3–4 visual devices per still.",
      `Label language: ${SCENE_TEXT_PRESETS[language].label}.`,
    ].join(" ");
  }
  if (!enabled) {
    return "On-canvas text is OFF. explainerScene, visualWorld, and motionCamera must contain NO written words, labels, numbers, captions, signage, or lettering — not even in quotes or 「」. Communicate only with images, props, and composition.";
  }
  if (options?.dualBeat) {
    return [
      "When on-canvas text is ON, the start still quotes ONLY startVo and the end still quotes ONLY endVo as handwritten marker lettering centered at 52%–60% of the frame height (max 2 lines, generous side margins, not a bottom subtitle band). English is all-caps black marker; line 2 sits in a warm-yellow highlight box. Two beats switch at the midpoint.",
      "startScene and endScene may also name short prop labels inside 「」 (yellow tags, arrows, bin names) on the object they belong to. Do NOT invent a title card or a second transcript of the spoken line.",
      "Lettering follows the whiteboard doodle visual style: handwritten marker, never a printed caption.",
      markerLanguageHint(language),
    ].join(" ");
  }
  return [
    "When on-canvas text is ON, the ONLY writing in each still is that clip's englishVo voiceover line as a bottom subtitle, spelled character-for-character.",
    "explainerScene and motionCamera must describe pose, props, and environment only. Do NOT invent extra titles, quotes, 「Mental Health?」-style labels, signs, or any wording that is not englishVo.",
    SCENE_TEXT_PRESETS[language].skillHint,
  ].join(" ");
}

// Revision note when the user toggles scene text after Phase A already exists.
export function sceneTextDirectorRevisionNote(
  enabled: boolean,
  language: SceneTextLanguage,
) {
  if (!enabled) {
    return "On-canvas text is now OFF. Rewrite every clip's explainerScene and motionCamera so they contain zero quoted words, labels, signs, or lettering (no 「」 quotes). Keep the same story, characters, and titles. Visuals and motion only.";
  }
  const voScript =
    language === "zh-Hant"
      ? "Rewrite every clip's englishVo into Traditional Chinese (繁體中文) — that Chinese line is the bottom subtitle."
      : language === "zh-Hans"
        ? "Rewrite every clip's englishVo into Simplified Chinese (简体中文) — that Chinese line is the bottom subtitle."
        : "Keep each clip's englishVo as the spoken English line; that line is the bottom subtitle.";
  return `On-canvas text is now ON (${SCENE_TEXT_PRESETS[language].label}). ${voScript} The ONLY writing in each still is that clip's englishVo. Rewrite every clip's explainerScene and motionCamera: pose, props, environment only — never invent short titles such as 「Mental Health?」 or any other quoted labels. Keep the same story, characters, and proposal titles.`;
}

// Typography locale for lettering style; the quoted voiceover keeps its own script.
export function sceneTextTypographyHint(language: SceneTextLanguage) {
  return SCENE_TEXT_PRESETS[language].skillHint.replace(
    /Every label is .+$/,
    "Match this locale for hand-drawn caption styling when it fits the quoted line.",
  );
}

// Full-sentence voiceover on canvas — not the director's "1–2 word label" rule.
export function voiceoverLineLooksLatin(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /[a-zA-Z]/.test(trimmed) && !/[\u4e00-\u9fff]/.test(trimmed);
}

export function sceneTextVoLetteringHint(
  language: SceneTextLanguage,
  narration: string,
  options?: { markerSafeZone?: boolean },
) {
  if (options?.markerSafeZone) {
    if (voiceoverLineLooksLatin(narration)) {
      return "Line 1 is bold black hand-drawn all-caps marker, same stroke weight as the outlines, slightly wobbly baseline. When line 2 exists, draw it as bold all-caps inside a warm-yellow rounded highlight box with a black outline. No printed font.";
    }
    if (language === "zh-Hant") {
      return "以繁體手寫馬克筆置中呈現，筆觸與外框同粗、略帶手繪晃動。若有第二行，放進暖黃色圓角標示框，黑框。不要印刷字體。";
    }
    if (language === "zh-Hans") {
      return "以简体手写马克笔居中呈现，笔触与外框同粗、略带手绘晃动。若有第二行，放进暖黄色圆角标示框，黑框。不要印刷字体。";
    }
  }
  if (voiceoverLineLooksLatin(narration)) {
    return "Hand-letter the quoted English subtitle in large, readable mixed-case (same spelling as the quote).";
  }
  if (language === "zh-Hant") {
    return "以繁體手寫字幕呈現下方整句旁白，字大清晰。";
  }
  if (language === "zh-Hans") {
    return "以简体手写字幕呈现下方整句旁白，字大清晰。";
  }
  return "Hand-letter the FULL quoted voiceover line large and readable.";
}

// Phase A often embeds labels like 「Mental Health?」 — models copy those instead of englishVo.
// Two-line split helps Qwen render long English narration legibly.
export function formatVoiceoverForCanvas(line: string) {
  const text = line.trim();
  if (!text) return { display: "", line1: "", line2: "" };
  const words = text.split(/\s+/);
  if (words.length <= 10) {
    return { display: text, line1: text, line2: "" };
  }
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");
  return { display: `${line1}\n${line2}`, line1, line2 };
}

// Cartoon-director stills: two short marker rows in the middle safe zone.
// Latin lines are all-caps; a 4+ word line always splits so it does not become one caption.
export function formatVoiceoverForMarker(line: string) {
  const text = line.trim();
  if (!text) return { line1: "", line2: "" };
  const latin = voiceoverLineLooksLatin(text);
  const display = latin ? text.toLocaleUpperCase("en-US") : text;
  const words = display.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    const mid = Math.ceil(words.length / 2);
    return {
      line1: words.slice(0, mid).join(" "),
      line2: words.slice(mid).join(" "),
    };
  }
  if (!latin && [...display].length > 16) {
    const chars = [...display];
    const mid = Math.ceil(chars.length / 2);
    return { line1: chars.slice(0, mid).join(""), line2: chars.slice(mid).join("") };
  }
  return { line1: display, line2: "" };
}

function markerLanguageHint(language: SceneTextLanguage) {
  if (language === "zh-Hant") {
    return "On-canvas text language: Traditional Chinese (繁體中文). Handwrite that beat's line; do not transliterate it into English all-caps.";
  }
  if (language === "zh-Hans") {
    return "On-canvas text language: Simplified Chinese (简体中文). Handwrite that beat's line; do not transliterate it into English all-caps.";
  }
  return "On-canvas text language: English. Render the beat as handwritten all-caps marker lettering; never invent extra English titles besides that beat and short prop labels.";
}

export function stripStoryboardWriting(description: string) {
  let s = description.trim();
  // Clauses with Chinese corner quotes (label text).
  s = s.replace(/[，,、]?[^，,。]*?[「『][^」』]+[」』][^，,。]*?[，,。]?/g, " ");
  // Common director wording for on-canvas labels in Chinese storyboards.
  s = s.replace(/[，,、]?[^，,。]*?(手寫字|手写|標籤|标签|字幕|文字| signage)[^，,。]*?[，,。]?/gi, " ");
  s = s.replace(
    /\b(sign|label|caption|title|text|lettering|words?)\s*(reads|saying|showing|:)?\s*["'][^"']+["']/gi,
    " ",
  );
  s = s.replace(/\s{2,}/g, " ").replace(/^[，,、\s]+|[，,、\s]+$/g, "").trim();
  return s || description.trim();
}

// Phase A sometimes writes the text policy into visualWorld ("無任何畫布文字…"),
// which then rides into every still prompt as part of the style. Drop those
// prohibition sentences; the frame prompt states its own text rule.
export function stripVisualWorldTextPolicy(visualWorld: string) {
  const negation = /(無任何|無|不含|沒有|禁止|不得|不要|never|no\b|without|zero|free of)/i;
  const textTopic =
    /(文字|字幕|標籤|标签|字體|字体|印刷|手寫字|lettering|caption|subtitle|label|typography|writing|written|text\b|words?\b|signage)/i;
  // Sentence chunks keep their own punctuation + trailing space so rejoining is lossless.
  const chunks = visualWorld.match(/[^。.!?！？]+[。.!?！？]*\s*/g) || [visualWorld];
  const kept = chunks.filter((sentence) => {
    const s = sentence.trim();
    if (!s) return false;
    return !(negation.test(s) && textTopic.test(s));
  });
  const out = kept.join("").trim();
  return out || visualWorld.trim();
}

// Frame prompts: OFF = zero writing; ON = quote the clip narration (englishVo) exactly.
// OFF + inWorldLabels = no captions, but keep the short labels named in the scene.
const MARKER_SAFE_ZONE_LAYOUT =
  "Layout: center the lettering horizontally, strictly between 52% and 60% of the frame height, maximum 2 lines, with side margins of at least 120px on a 1080-wide frame (about 11% of the width). No semi-opaque white band, no bottom caption bar, no corner tag, no printed font.";

export function sceneTextFrameLines(
  enabled: boolean,
  language: SceneTextLanguage,
  narration?: string,
  typography?: string,
  options?: { inWorldLabels?: boolean; markerSafeZone?: boolean },
) {
  if (!enabled && options?.inWorldLabels) {
    return [
      "Voiceover captions OFF: no subtitle band, no title card, no transcript of the spoken line anywhere in the image.",
      IN_WORLD_LABELS_RULE,
      "Render ONLY the label words written in the Scene below (inside 「」 or quotes), spelled exactly; add no other writing.",
      typography?.trim() ? typography.trim() : "",
    ].filter(Boolean);
  }
  if (!enabled) {
    return [
      "No on-canvas text, labels, captions, letters, numbers, or written words of any kind. Communicate only with images, props, and composition.",
      "Ignore any mention of words, labels, signs, or lettering in the scene description below; do NOT render writing in the image.",
    ];
  }
  const line = narration?.trim();
  if (!line) {
    return [
      sceneTextTypographyHint(language),
      "On-canvas text must quote this clip's voiceover line exactly, but none was provided.",
    ];
  }
  const marker = Boolean(options?.markerSafeZone);
  const formatted = marker ? formatVoiceoverForMarker(line) : formatVoiceoverForCanvas(line);
  const letterStyle = [
    sceneTextVoLetteringHint(language, line, { markerSafeZone: marker }),
    typography?.trim() ? typography.trim() : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (marker) {
    const markerLines = formatted.line2
      ? [
          `Marker line 1 (spell exactly, black marker): "${formatted.line1}"`,
          `Marker line 2 (spell exactly, warm-yellow highlight box): "${formatted.line2}"`,
        ]
      : [`Marker line (spell exactly, black marker): "${formatted.line1}"`];
    return [
      "On-canvas marker lettering ON — highest priority.",
      MARKER_SAFE_ZONE_LAYOUT,
      ...markerLines,
      letterStyle,
      "These quoted line(s) are the only voiceover lettering. Short prop labels already written in the Scene inside 「」 may stay on that prop. No title card, no bottom subtitle band, and no other writing.",
    ];
  }
  const subtitleLines = formatted.line2
    ? [
        `Subtitle line 1 (spell exactly): "${formatted.line1}"`,
        `Subtitle line 2 (spell exactly): "${formatted.line2}"`,
      ]
    : [`Subtitle (spell exactly): "${formatted.line1}"`];

  return [
    "On-canvas subtitles ON — highest priority.",
    "Layout: a semi-opaque white band across the bottom 18% of the frame; dark hand-lettered text centered inside the band (integrated caption, not a tiny corner tag).",
    ...subtitleLines,
    letterStyle,
    "Only the subtitle line(s) above may appear as writing; no other letters, numbers, signs, or labels anywhere in the illustration.",
    "Ignore any storyboard mention of other wording (e.g. Mental Health); do not paint prompt instructions — only the quoted subtitle strings.",
  ];
}

export function sceneTextNegativePrompt(enabled: boolean, inWorldLabels = false) {
  if (enabled) return undefined;
  return inWorldLabels
    ? SCENE_TEXT_CAPTIONS_OFF_NEGATIVE_PROMPT
    : SCENE_TEXT_OFF_NEGATIVE_PROMPT;
}
