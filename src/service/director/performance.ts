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
    "on every stressed word or number the eyes widen, the eyebrows pop up, and the mouth opens bigger for about half a second, then the face relaxes back into the smile",
  hookBeat: "eyebrows already lifting into a big warm smile",
  ctaBeat: "a softer, closer smile, eyebrows settling, the torso leaning a little toward the lens like sharing a secret",
  gestureLibrary:
    "a raised index finger or a small finger count on a list or a number, an open palm pushed out toward the lens on 'look at this', a two-handed open-palm shrug, a hand touching the chest or chin in thought, a palm facing the lens swaying side to side on a negative, fingers spread beside the face on a big claim, a palm turned up and offered to the lens on an invitation",
  headMotion:
    "a constant small side-to-side sway of a few degrees, distinct head turns and tilts left and right, brief thoughtful glances slightly off-camera or down at the hands before looking back into the lens, nods on stressed words, a chin drop then lift, leaning forward toward the lens on a key point then settling back or shifting seated weight slightly left and right on the sofa; shoulders rock",
  anchorProp: "",
  set: "the same sofa at home in every clip, a bookshelf behind the head",
  light: "ordinary daylight from a window to one side, no studio light",
};

const FACE_YUE: PerformanceSlots = {
  restingFace: "露少少牙嘅親切笑容，眉毛放鬆微微揚起，直望鏡頭好似同一個朋友傾偈",
  emphasisBeat: "每到重音字或者數字，眼睛睜大、眉毛快速上挑、口張大約半秒，然後放鬆返落笑容",
  hookBeat: "眉毛已經揚起、展開一個大笑容",
  ctaBeat: "更柔和、更親近嘅淺笑，眉毛放鬆，上身微微傾向鏡頭好似講緊秘密",
  gestureLibrary:
    "數數或者講數字時豎食指、「睇呢個」時掌心向鏡頭推出、雙手攤開聳肩、思考時手指輕觸下巴或心口、否定時掌心對鏡頭左右擺、誇張強調時五指張開喺臉旁、邀請時掌心向上遞向鏡頭",
  headMotion:
    "全程有幾度嘅細幅左右搖擺，頭部明顯左右轉向同傾斜、思考時眼神短暫望向側邊或者望一望雙手再望返鏡頭、重音位點頭、下巴跌一跌再抬起，講到重點時上身明顯前傾靠近鏡頭、再坐返後或者喺沙發微移重心；膊頭自然郁動",
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
  const system = skill?.performance ?? DEFAULT_PERFORMANCE[shot];
  const base = system[performanceLanguage(language)];
  const custom = skill?.customPerformance;
  if (!custom) return { ...base };
  const out = { ...base };
  for (const key of PERFORMANCE_KEYS) {
    const edited = custom[key] ?? "";
    const template = system.en[key];
    if (edited === template) continue;
    if (!edited.trim() && key !== "anchorProp") continue;
    out[key] = edited;
  }
  return out;
}
