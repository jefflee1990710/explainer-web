import { listicleListEntries, skillForcesSceneText } from "@/service/director/skill-rules";
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

export function isSceneTextLanguage(value: string): value is SceneTextLanguage {
  return SCENE_TEXT_IDS.includes(value as SceneTextLanguage);
}

export function resolveSceneText(input: {
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  skillSlug?: string;
}) {
  const language = input.sceneTextLanguage && isSceneTextLanguage(input.sceneTextLanguage)
    ? input.sceneTextLanguage
    : "en";
  // Listicle stills always show the item list; the form toggle cannot turn that off.
  const enabled = skillForcesSceneText(input.skillSlug) || input.sceneTextEnabled === true;
  return { enabled, language };
}

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
  options?: { dualBeat?: boolean; listicle?: boolean },
) {
  if (options?.listicle) {
    return [
      "On-canvas text is REQUIRED for this director. Every still must show a readable numbered list of the item titles (each item clip's englishVo).",
      "Highlight the current item. The list is a primary graphic in the scene, not a tiny subtitle bar.",
      SCENE_TEXT_PRESETS[language].skillHint,
    ].join(" ");
  }
  if (!enabled) {
    return "On-canvas text is OFF. explainerScene, visualWorld, and motionCamera must contain NO written words, labels, numbers, captions, signage, or lettering — not even in quotes or 「」. Communicate only with images, props, and composition.";
  }
  if (options?.dualBeat) {
    return [
      "When on-canvas text is ON, the start still quotes ONLY startVo and the end still quotes ONLY endVo as bottom subtitles, spelled character-for-character. Two subtitle beats switch at the midpoint.",
      "startScene, endScene, and motionCamera must describe pose, props, and environment only. Do NOT invent extra titles besides that beat's voiceover.",
      "Lettering look follows the selected visual style — do not force whiteboard marker lettering unless that style asks for it.",
      SCENE_TEXT_PRESETS[language].skillHint,
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

export function sceneTextVoLetteringHint(language: SceneTextLanguage, narration: string) {
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

// Frame prompts: OFF = zero writing; ON = quote the clip narration (englishVo) exactly.
export function sceneTextFrameLines(
  enabled: boolean,
  language: SceneTextLanguage,
  narration?: string,
  typography?: string,
) {
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
  const formatted = formatVoiceoverForCanvas(line);
  const letterStyle = [
    sceneTextVoLetteringHint(language, line),
    typography?.trim() ? typography.trim() : "",
  ]
    .filter(Boolean)
    .join(" ");
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

export function sceneTextNegativePrompt(enabled: boolean) {
  return enabled ? undefined : SCENE_TEXT_OFF_NEGATIVE_PROMPT;
}
