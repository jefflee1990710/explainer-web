import type { AspectRatio } from "@/model/project";
import {
  comparisonPanels,
  comparisonSplitAxis,
  listicleListEntries,
} from "@/service/director/skill-rules";
import type { SceneTextLanguage } from "@/model/project";
import { subtitleLookLine, type SubtitleLook } from "@/service/director/subtitle-look";

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
      "On-canvas text language: English. Never invent extra English titles besides the clip's englishVo. Lettering follows the selected text style.",
  },
  "zh-Hant": {
    id: "zh-Hant",
    label: "繁體中文",
    sublabel: "畫面文字",
    skillHint:
      "On-canvas text language: Traditional Chinese (繁體中文). Never invent extra titles besides the clip's englishVo (keep that line in its own script). Lettering follows the selected text style.",
  },
  "zh-Hans": {
    id: "zh-Hans",
    label: "简体中文",
    sublabel: "画面文字",
    skillHint:
      "On-canvas text language: Simplified Chinese (简体中文). Never invent extra titles besides the clip's englishVo (keep that line in its own script). Lettering follows the selected text style.",
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
  "Short in-world labels that belong to the scene ARE allowed and encouraged: one short beat title, diagram labels, node names, arrow names, tags, and bin or box names. They must name the beat or a part of the diagram — never a transcript of the voiceover. Their lettering follows the selected text style, not the visual style.";

function listicleTitles(title: string) {
  return title.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
}

// On-canvas text is the item name, not the spoken explanation after the comma.
export function listicleCanvasTitle(spoken: string) {
  const stripped = spoken
    .replace(/^(?:number\s+\w+|第\s*[0-9一二三四五六七八九十]+\s*[項个個]?)\s*[:：.]?\s*/i, "")
    .trim();
  const head = stripped.split(/[,，。；;]/)[0]?.trim() || stripped;
  return head || spoken.trim();
}

// Item clips spell only the item they introduce. The last clip spells every title.
export function listicleOnCanvasLines(input: {
  clips: Array<{ clipNumber: number; narrativeJob: string; englishVo: string }>;
  clipNumber: number;
  typography?: string;
}) {
  const entries = listicleListEntries(input.clips);
  const clip = input.clips.find((item) => item.clipNumber === input.clipNumber);
  const lastNumber = input.clips.reduce((max, item) => Math.max(max, item.clipNumber), 0);
  const showFull =
    input.clipNumber === lastNumber || /full list|完整清單/i.test(clip?.narrativeJob || "");
  const look = input.typography?.trim() || "";
  if (showFull) {
    const titles = entries.flatMap((entry) => listicleTitles(entry.title).map(listicleCanvasTitle));
    return [
      "On-canvas FULL LIST — clean and clear, highest priority. Empty background. One evenly spaced numbered list of these short titles, large and readable. No host, no extra props, no long sentences, no side clutter.",
      ...titles.map((title, index) => `List item ${index + 1} (spell exactly): "${title}"`),
      "Every title is readable. Do not leave one off. Ignore any extra objects written in the Scene.",
      look,
      "Only these short titles may appear as writing.",
    ].filter(Boolean);
  }
  const current = entries.find((entry) => entry.clipNumber === input.clipNumber);
  if (current) {
    const titles = listicleTitles(current.title).map(listicleCanvasTitle);
    return [
      "On-canvas item ON — clean and clear, highest priority. This clip introduces only this item. Empty space around one number, this short title, and one object.",
      ...titles.map((title, index) => `Item ${current.index + index} (spell exactly): "${title}"`),
      "Do not draw the other items, a side list, the full list, extra props, or the spoken sentence. Ignore any checklist written in the Scene.",
      look,
      "Only this short title may appear as writing.",
    ].filter(Boolean);
  }
  const count = entries.flatMap((entry) => listicleTitles(entry.title)).length;
  return [
    "HOOK — clean and clear, highest priority. Empty background. Draw one large count and nothing else.",
    count > 0 ? `Count (spell exactly): "${count}"` : "",
    "Do not draw item titles, a checklist, the first item, extra props, or a caption of the spoken sentence. Leave most of the frame empty. Ignore any side list written in the Scene.",
    look,
  ].filter(Boolean);
}

// Two titles, one per half. The spoken line stays off the drawing.
export function comparisonOnCanvasLines(input: {
  narrativeJob: string;
  aspectRatio: AspectRatio;
  typography?: string;
}) {
  const panels = comparisonPanels(input.narrativeJob);
  const vertical = comparisonSplitAxis(input.aspectRatio) === "top-bottom";
  const place = vertical ? "a top half and a bottom half" : "a left half and a right half";
  const sideA = vertical ? "Top" : "Left";
  const sideB = vertical ? "Bottom" : "Right";
  return [
    `Split comparison ON. Divide the frame into ${place}. Both halves stay visible together.`,
    panels
      ? `${sideA} title (spell exactly): "${panels.a}"`
      : `${sideA} half needs one short title.`,
    panels
      ? `${sideB} title (spell exactly): "${panels.b}"`
      : `${sideB} half needs one short title.`,
    "Those two titles are the only writing. Do not add a voiceover caption.",
    input.typography?.trim() || "",
  ].filter(Boolean);
}

// 9:16 Instagram Reels sit the spoken subtitle just under the middle. Landscape stays at the bottom.
export function subtitleSitsBelowCenter(aspectRatio?: string) {
  return aspectRatio === "9:16";
}

export function spokenSubtitleLock(aspectRatio?: string) {
  if (subtitleSitsBelowCenter(aspectRatio)) {
    return "Subtitle: keep this clip's spoken line a little below the vertical center for the whole clip. Clear of the face and clear of the bottom edge. Do not move it to the bottom. Same words, same place, from the first frame to the last.";
  }
  return "Subtitle: keep this clip's spoken line in a band across the bottom of the frame for the whole clip. Same words, same place, from the first frame to the last.";
}

function spokenSubtitlePlace(aspectRatio?: string) {
  if (subtitleSitsBelowCenter(aspectRatio)) {
    return "a little below the vertical center of the frame, clear of the face and the bottom edge";
  }
  if (aspectRatio === "16:9") return "across the bottom of the frame";
  return "a little below the vertical center on a 9:16 Instagram Reel, and across the bottom on a 16:9 landscape frame";
}

export function sceneTextSkillHint(
  enabled: boolean,
  language: SceneTextLanguage,
  options?: {
    dualBeat?: boolean;
    listicle?: boolean;
    comparison?: boolean;
    inWorldLabels?: boolean;
    reelSafeZone?: boolean;
    aspectRatio?: string;
    look?: SubtitleLook;
    lookLine?: string;
  },
) {
  const lookLine = options?.lookLine || subtitleLookLine(options?.look);
  if (options?.listicle) {
    return [
      "On-canvas text is REQUIRED. The hook is a clean empty frame with one large count only. Each later clip introduces one item: its number, a short title, and one object, with empty space around them.",
      "Show items one by one. The last clip is a clean full list: short titles only, evenly spaced on an empty background. Do not caption the spoken sentence.",
      lookLine,
      "Lettering follows that Look. Do not copy typography from the visual style.",
      SCENE_TEXT_PRESETS[language].skillHint,
    ].join(" ");
  }
  if (options?.comparison) {
    return [
      "On-canvas text is the two panel titles only. narrativeJob must be `contrast: <panel A title> | <panel B title>`.",
      "16:9 is left | right. 9:16 and 1:1 are top | bottom. Do not also caption the full voiceover.",
      lookLine,
      "Lettering follows that Look. Do not copy typography from the visual style.",
      SCENE_TEXT_PRESETS[language].skillHint,
    ].join(" ");
  }
  if (!enabled && options?.inWorldLabels) {
    return [
      "Voiceover captions are OFF: never quote, transcribe, or subtitle the spoken line on canvas.",
      IN_WORLD_LABELS_RULE,
      "Write each beat title and diagram label's exact wording inside 「」 in startScene / endScene so the still prompt can spell it; count the graph, labels, tags, and arrows toward the 3–4 visual devices per still.",
      lookLine,
      "Lettering follows that Look. Do not copy typography from the visual style.",
      `Label language: ${SCENE_TEXT_PRESETS[language].label}.`,
    ].join(" ");
  }
  if (!enabled) {
    return "On-canvas text is OFF. explainerScene, visualWorld, and motionCamera must contain NO written words, labels, numbers, captions, signage, or lettering — not even in quotes or 「」. Communicate only with images, props, and composition.";
  }
  if (options?.dualBeat) {
    return [
      `When on-canvas text is ON, the start still quotes ONLY startVo and the end still quotes ONLY endVo. ${lookLine} Not a bottom subtitle bar. Keep the spoken line's own casing. Two beats switch at the midpoint.`,
      "startScene and endScene may also name one short beat title that names this clip's idea, plus diagram labels, node names, and arrow names inside 「」 on the graph they belong to. Do not dump a second transcript of the spoken line into those fields.",
      "Subtitle placement stays with this director. Do not copy placement from the visual style.",
      markerLanguageHint(language),
    ].join(" ");
  }
  if (options?.reelSafeZone) {
    return [
      `When on-canvas text is ON, the ONLY writing in each still is that clip's englishVo as a subtitle inside the center safe area, clear of the top and bottom edges. ${lookLine}`,
      "explainerScene and motionCamera must describe pose, props, and environment only. Do NOT invent extra titles, quotes, 「Mental Health?」-style labels, signs, or any wording that is not englishVo.",
      SCENE_TEXT_PRESETS[language].skillHint,
    ].join(" ");
  }
  return [
    `When on-canvas text is ON, the ONLY writing in each still is that clip's englishVo voiceover line as a subtitle ${spokenSubtitlePlace(options?.aspectRatio)}, spelled character-for-character. ${lookLine}`,
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
      ? "Rewrite every clip's englishVo into Traditional Chinese (繁體中文) — that Chinese line is the subtitle."
      : language === "zh-Hans"
        ? "Rewrite every clip's englishVo into Simplified Chinese (简体中文) — that Chinese line is the subtitle."
        : "Keep each clip's englishVo as the spoken English line; that line is the subtitle.";
  const place =
    "On a 9:16 Instagram Reel place it a little below the vertical center. On a 16:9 landscape frame place it across the bottom.";
  return `On-canvas text is now ON (${SCENE_TEXT_PRESETS[language].label}). ${voScript} ${place} The ONLY writing in each still is that clip's englishVo. Rewrite every clip's explainerScene and motionCamera: pose, props, environment only — never invent short titles such as 「Mental Health?」 or any other quoted labels. Keep the same story, characters, and proposal titles.`;
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
  _language: SceneTextLanguage,
  _narration: string,
  options?: { look?: SubtitleLook },
) {
  return subtitleLookLine(options?.look);
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

// Cartoon-director stills: two short rows in the middle safe zone.
// A 4+ word line always splits so it does not become one caption. Casing stays with the spoken line.
export function formatVoiceoverForMarker(line: string) {
  const text = line.trim();
  if (!text) return { line1: "", line2: "" };
  const latin = voiceoverLineLooksLatin(text);
  const display = text;
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
    return "On-canvas text language: Traditional Chinese (繁體中文). Do not transliterate that beat's line into English. Lettering follows the selected text style.";
  }
  if (language === "zh-Hans") {
    return "On-canvas text language: Simplified Chinese (简体中文). Do not transliterate that beat's line into English. Lettering follows the selected text style.";
  }
  return "On-canvas text language: English. One short beat title and diagram labels named in the Scene are also allowed. Lettering follows the selected text style.";
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

// Frame prompts already have Canvas / Look / Typography / Motion from the style
// catalog. Drop those restated sentences so Visual world only keeps unique world-building.
export function stripVisualWorldStyleEcho(visualWorld: string) {
  const echo = /^(Canvas|Look|Typography|Motion|Never|Palette)\s*:/i;
  const chunks = visualWorld.match(/[^。.!?！？]+[。.!?！？]*\s*/g) || [visualWorld];
  return chunks
    .filter((sentence) => {
      const s = sentence.trim();
      return Boolean(s) && !echo.test(s);
    })
    .join("")
    .trim();
}

// Scene rows often repeat the voiceover lettering already spelled in Marker / Subtitle lines.
export function stripSceneVoiceoverRecap(description: string) {
  const stripped = description
    .replace(/[^.。]*On-canvas handwritten marker text[^.。]*[.。]?/gi, " ")
    .replace(/[^.。]*On-canvas (?:subtitles?|lettering)[^.。]*[.。]?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[，,、\s]+|[，,、\s]+$/g, "")
    .trim();
  return stripped || description.trim();
}

// Frame prompts: OFF = zero writing; ON = quote the clip narration (englishVo) exactly.
// OFF + inWorldLabels = no captions, but keep the short labels named in the scene.
export function sceneTextFrameLines(
  enabled: boolean,
  language: SceneTextLanguage,
  narration?: string,
  typography?: string,
  options?: {
    inWorldLabels?: boolean;
    markerSafeZone?: boolean;
    reelSafeZone?: boolean;
    subtitlePlace?: "below-center" | "bottom";
    look?: SubtitleLook;
    lookLine?: string;
    silentClip?: boolean;
  },
) {
  if (!enabled && options?.inWorldLabels) {
    return [
      "Voiceover captions OFF: no subtitle band, no transcript of the spoken line anywhere in the image.",
      IN_WORLD_LABELS_RULE,
      "Render ONLY the label words written in the Scene below (inside 「」 or quotes), spelled exactly; add no other writing.",
      options?.lookLine || subtitleLookLine(options?.look),
      "Lettering follows that Look. Do not copy typography from the visual style.",
      typography?.trim() ? typography.trim() : "",
    ].filter(Boolean);
  }
  if (!enabled) {
    return [
      "No on-canvas text, labels, captions, letters, numbers, or written words of any kind. Communicate only with images, props, and composition.",
      "Ignore any mention of words, labels, signs, or lettering in the scene description below; do NOT render writing in the image.",
    ];
  }
  if (options?.silentClip) {
    return ["This clip has no spoken line. No subtitle band and no letters anywhere in the frame."];
  }
  const line = narration?.trim();
  if (!line) {
    return [
      sceneTextTypographyHint(language),
      "On-canvas text must quote this clip's voiceover line exactly, but none was provided.",
    ];
  }
  const marker = Boolean(options?.markerSafeZone);
  const belowCenter = options?.subtitlePlace === "below-center" && !marker;
  const reel = Boolean(options?.reelSafeZone) && !marker && !belowCenter;
  const formatted = marker ? formatVoiceoverForMarker(line) : formatVoiceoverForCanvas(line);
  // Typography belongs on the separate Lettering line; do not repeat it here.
  const letterStyle = options?.lookLine || sceneTextVoLetteringHint(language, line, { look: options?.look });
  if (marker) {
    const markerLines = formatted.line2
      ? [
          `Marker line 1 (spell exactly): "${formatted.line1}"`,
          `Marker line 2 (spell exactly): "${formatted.line2}"`,
        ]
      : [`Marker line (spell exactly): "${formatted.line1}"`];
    return [
      "On-canvas marker lettering ON — highest priority.",
      ...markerLines,
      letterStyle,
      "These quoted line(s) are the voiceover lettering. Also draw a short beat title only if the Scene already writes one inside 「」. Draw the diagram labels already written in the Scene inside 「」 (node names, arrow names). No bottom subtitle band.",
    ].filter(Boolean);
  }
  const subtitleLines = formatted.line2
    ? [
        `Subtitle line 1 (spell exactly): "${formatted.line1}"`,
        `Subtitle line 2 (spell exactly): "${formatted.line2}"`,
      ]
    : [`Subtitle (spell exactly): "${formatted.line1}"`];

  return [
    "On-canvas subtitles ON — highest priority.",
    belowCenter
      ? "Layout: one subtitle a little below the vertical center of the frame, centered horizontally, about 55% of the way down from the top. Clear of the face and clear of the bottom edge. Not a band glued to the bottom."
      : reel
        ? "Layout: one subtitle inside the center safe area, clear of the top and bottom edges. Not a bottom band."
        : "Layout: a band across the bottom 18% of the frame; the subtitle is centered in that band (not a tiny corner tag).",
    ...subtitleLines,
    letterStyle,
    "Only the subtitle line(s) above may appear as writing; no other letters, numbers, signs, or labels anywhere in the illustration.",
    "Ignore any storyboard mention of other wording (e.g. Mental Health); do not paint prompt instructions — only the quoted subtitle strings.",
  ].filter(Boolean);
}

export function sceneTextNegativePrompt(enabled: boolean, inWorldLabels = false) {
  if (enabled) return undefined;
  return inWorldLabels
    ? SCENE_TEXT_CAPTIONS_OFF_NEGATIVE_PROMPT
    : SCENE_TEXT_OFF_NEGATIVE_PROMPT;
}
