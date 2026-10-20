import {
  PERFORMANCE_KEYS,
  type PerformanceLanguage,
  type PerformanceSlots,
  type SystemPerformance,
} from "@/model/director-performance";
import type { VoLanguage } from "@/model/project";
import type { Skill } from "@/model/skill";
import type { TalkingShot } from "@/service/director/talking-performance";

// Character limit for one performance slot (same as a profile field).
export const PERFORMANCE_FIELD_MAX = 600;

// Fallback slots when a skill carries no performance (unit tests, unseeded DB).
// Mirrors skills/<dir>/performance.json — the seeded copy is the editable source.
const FACE_EN: PerformanceSlots = {
  restingFace:
    "a warm, chatty smile with a hint of teeth, eyebrows relaxed and slightly lifted, eyes locked on the lens like talking to one friend",
  emphasisBeat:
    "a subtle brow lift and natural expressive articulation on key words, relaxing smoothly back into a warm smile",
  hookBeat: "eyebrows already lifting into a big warm smile",
  ctaBeat: "a softer, closer smile, eyebrows settling, the torso leaning a little toward the lens like sharing a secret",
  gestureLibrary:
    "one smooth, unhurried conversational hand gesture per sentence at lower-chest height — a gentle open palm or a soft finger point on the key word while the other hand rests calmly on the lap",
  headMotion:
    "a calm, subtle head tilt of 2–3 degrees and a gentle nod on stressed words while keeping the torso centered and both eyes locked directly on the lens the whole time",
  anchorProp: "",
  set: "the same sofa at home in every clip, a bookshelf behind the head",
  light: "ordinary daylight from a window to one side, no studio light",
};

const FACE_YUE: PerformanceSlots = {
  restingFace: "露少少牙嘅親切笑容，眉毛放鬆微微揚起，直望鏡頭好似同一個朋友傾偈",
  emphasisBeat: "講到重點字眼時眉毛自然微揚、眼神專注有神，語氣過渡平順自然",
  hookBeat: "眉毛已經揚起、展開一個大笑容",
  ctaBeat: "更柔和、更親近嘅淺笑，眉毛放鬆，上身微微傾向鏡頭好似講緊秘密",
  gestureLibrary:
    "每句只做一個從容自然嘅單手傾偈手勢（另一隻手自然放喺大髀保持穩定），講重點時掌心輕輕打開再自然收回，唔好頻繁切換手勢",
  headMotion:
    "面向鏡頭保持穩定坐姿，配合說話節奏有 2–3 度嘅輕微自然點頭，雙眼全程穩定直望鏡頭中心",
  anchorProp: "",
  set: "全程同一張屋企沙發，書架喺頭後面",
  light: "一邊窗嘅普通日光，冇影樓燈",
};

const FULL_BODY_EN: PerformanceSlots = {
  ...FACE_EN,
  anchorProp: "",
  set: "the same plain background in every clip, no new props",
  light: "ordinary daylight from a window to one side, unchanged",
};

const FULL_BODY_YUE: PerformanceSlots = {
  ...FACE_YUE,
  anchorProp: "",
  set: "全程同一個簡潔背景，冇新道具",
  light: "一邊窗嘅自然日光，不變",
};

export const DEFAULT_PERFORMANCE: Record<TalkingShot, SystemPerformance> = {
  face: { en: FACE_EN, yue: FACE_YUE },
  "full-body": { en: FULL_BODY_EN, yue: FULL_BODY_YUE },
};

// Prompt language for slot text: English, or Cantonese scaffolding for yue and zh.
export function performanceLanguage(language?: VoLanguage): PerformanceLanguage {
  return language === "en" || !language ? "en" : "yue";
}

export function emptyPerformance(): PerformanceSlots {
  return Object.fromEntries(PERFORMANCE_KEYS.map((key) => [key, ""])) as PerformanceSlots;
}

// Untrusted input → slots with every key as a string; unknown keys dropped.
export function parsePerformanceSlots(
  raw: unknown,
): { ok: true; slots: PerformanceSlots } | { ok: false; error: string } {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const slots = emptyPerformance();
  for (const key of PERFORMANCE_KEYS) {
    const value = source[key];
    slots[key] = value === undefined || value === null ? "" : String(value);
    if (slots[key].length > PERFORMANCE_FIELD_MAX) return { ok: false, error: "欄位內容過長" };
  }
  return { ok: true, slots };
}

// Seed: `{ en: slots, yue: slots }`. Every key present in both; anchorProp may be blank.
export function parseSystemPerformance(raw: unknown): SystemPerformance {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as SystemPerformance;
  for (const language of ["en", "yue"] as const) {
    const block = (source[language] && typeof source[language] === "object" ? source[language] : {}) as Record<
      string,
      unknown
    >;
    const slots = emptyPerformance();
    for (const key of PERFORMANCE_KEYS) {
      const value = block[key];
      if (typeof value !== "string") throw new Error(`performance.${language}.${key} is missing`);
      if (value.length > PERFORMANCE_FIELD_MAX) throw new Error(`performance.${language}.${key} is too long`);
      slots[key] = value;
    }
    out[language] = slots;
  }
  return out;
}

// Slots used at run time. A custom edit (English, differing from the template's English)
// wins for that key in every language; otherwise the template's own language text is used.
// `anchorProp` is the one slot a user may blank out on purpose, so it is compared as-is.
export function resolvePerformance(
  skill: Pick<Skill, "performance" | "customPerformance"> | undefined,
  shot: TalkingShot,
  language?: VoLanguage,
): PerformanceSlots {
  const system = DEFAULT_PERFORMANCE[shot];
  const base = system[performanceLanguage(language)];
  const custom = skill?.customPerformance;
  if (!custom) return { ...base };
  const out = { ...base };
  for (const key of PERFORMANCE_KEYS) {
    const edited = custom[key] ?? "";
    const template = system.en[key];
    const storedTemplate = skill?.performance?.en?.[key];
    if (edited === template || (storedTemplate && edited === storedTemplate)) continue;
    if (!edited.trim() && key !== "anchorProp") continue;
    out[key] = edited;
  }
  return out;
}
