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
    "a relaxed, friendly half-smile with lips gently closed or softly parted (no wide toothy grin), eyebrows relaxed and slightly lifted, eyes locked on the lens like talking to one friend",
  emphasisBeat:
    "a subtle brow lift and restrained, phoneme-accurate lip articulation with small natural jaw movement (no exaggerated mouth opening or wide jaw drop), relaxing smoothly back into a warm half-smile",
  hookBeat: "eyebrows softly lifted, a relaxed warm half-smile with lips gently closed or barely parted ready to speak (no wide toothy grin)",
  ctaBeat: "a softer, closer smile, eyebrows settling, the torso leaning a little toward the lens like sharing a secret",
  gestureLibrary:
    "most of the time (~90%) both hands rest calmly on the lap in a neutral rest position; only on the single main key word of the sentence, one dominant hand makes a brief ~0.5s co-speech gesture excursion (preparation lift from the lap, a soft open-palm stroke at lower-chest height on the stressed word, a brief hold, then smooth retraction back to rest on the lap) while the other hand stays completely still",
  headMotion:
    "proximal torso, pelvis, and shoulders stay anchored and stable in the exact same spot with only subtle breathing movement; the head stays facing the camera with a subtle 1–2 degree prosodic nod on stressed words and both eyes locked directly on the lens center the whole time",
  anchorProp: "",
  set: "the same lived-in bedroom corner in every clip, a soft bedhead or door frame and a side window softly blurred behind the head",
  light: "soft, even, diffused ambient indoor light or gentle window daylight with a low, gradual tonal transition across the face and soft natural eye catchlights — no harsh side-light contrast, no flat beauty-ring glare, no studio light",
};

const FACE_YUE: PerformanceSlots = {
  restingFace: "自然放鬆嘅柔和淺笑、雙唇輕合或自然微啟（唔好張開口露晒牙大笑）、下巴自然放鬆，眉毛放鬆微微揚起，直望鏡頭好似同一個朋友傾偈",
  emphasisBeat: "講到重點字眼時眉毛自然微揚、眼神專注有神，口型精準克制、下巴同嘴部開合幅度自然細緻（無誇張張大嘴），語氣過渡平順自然",
  hookBeat: "眉毛微微揚起、神情自然放鬆帶柔和淺笑、雙唇輕合或微啟準備講嘢（唔好張開口露齒大笑）",
  ctaBeat: "更柔和、更親近嘅淺笑，眉毛放鬆，上身微微傾向鏡頭好似講緊秘密",
  gestureLibrary:
    "近九成時間雙手自然放鬆放喺大髀休息位（Neutral Rest）；只喺整句最核心嗰一個重點詞出現時，單一慣用手由大髀輕輕抬起做一個約 0.5 秒嘅自然拍點手勢（起手 → 重音拍點 → 短暫停留 → 自然收返落大髀原位），另一隻手全程放喺大髀唔郁，絕對唔好雙手輪流喺半空比畫",
  headMotion:
    "腰部、軀幹同雙肩保持固定喺同一位置（僅有自然呼吸微幅起伏，唔好左右挪動或前後搖晃）；頭部正對鏡頭，只喺重音字有 1–2 度嘅微幅點頭，雙眼全程穩定直望鏡頭中心",
  anchorProp: "",
  set: "全程同一個有生活感嘅睡房角落，頭後面係柔和虛化嘅床頭或門框同側窗",
  light: "柔和均勻嘅室內漫射環境光配自然窗光，面部光暗過渡柔和自然、無誇張陰陽面反差——唔好正面美顏環形燈，冇影樓燈",
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

// Prompt language for slot text: Cantonese scaffolding for yue and zh, English for all other languages.
export function performanceLanguage(language?: VoLanguage): PerformanceLanguage {
  return language === "yue" || language === "zh" ? "yue" : "en";
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
