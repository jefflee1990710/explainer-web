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
    "a calm, composed, relaxed neutral expression with lips gently closed or softly parted (no constant smile, no wide toothy grin, no raised apple-cheek smile tension, no squinting eyes), eyebrows relaxed in a neutral resting position, facing the camera directly with calm open eyes locked on the lens like talking to one friend",
  emphasisBeat:
    "clear, readable, text-driven facial expression shifts matching each clause's meaning without ever laughing or smiling blankly through serious lines: inquisitive brow lift and alert open eyes on questions; serious un-smiled expression with a clear brow furrow and 2–3° head shake on problems/pain points; earnest confident look with a 2–3° nod on solutions; warm closed-lip half-smile only on positive CTA — paired with natural co-articulated lip-sync (~25–30% jaw opening, lower teeth covered)",
  hookBeat:
    "eyebrows relaxed, facing the camera directly with calm open eyes locked on the lens, a composed relaxed neutral expression with lips gently closed or barely parted ready to speak (no wide toothy grin, no squinting eyes)",
  ctaBeat: "a subtle, warm, composed closed-lip half-smile only at the closing invitation, eyebrows settling, the torso leaning 1 degree toward the lens like sharing a secret",
  gestureLibrary:
    "most of the time (~90%) both hands rest calmly on the lap in a neutral rest position (or one hand holds a compact handheld wireless lavalier microphone near the chin/upper chest when a mic prop is used); only on the single main key word of the sentence, one dominant hand makes a brief ~0.5s co-speech gesture excursion (preparation lift from the lap, a soft open-palm stroke at lower-chest height on the stressed word, a brief hold, then smooth retraction back to rest on the lap) while the other hand stays completely still",
  headMotion:
    "proximal torso, pelvis, and shoulders stay anchored and stable facing the camera; the head faces the camera with clear, natural 2–3 degree content-driven movements (a 2–3° nod on key points, a 2–3° head shake on negative/problem clauses, a slight 2° head tilt on questions) and both eyes locked directly on the lens center the whole time",
  anchorProp: "",
  set: "a richly layered cozy indie creative studio room: seated in a textured olive-green velvet armchair in the midground, a warm cream wall with a mustard-yellow round wall clock and two small wooden-framed abstract art prints behind on the left, and a warm wooden bookshelf with books, vinyl records, and a glowing warm table lamp softly blurred in the background on the right",
  light: "warm-toned (3400K–4200K golden-amber indoor warmth), soft, even, diffused ambient indoor light balanced with a warm tungsten table lamp glow and a low, gradual tonal transition across the face and soft natural eye catchlights — no cold blue/grey cast, no harsh side-light contrast, no flat beauty-ring glare, no studio light",
};

const FACE_YUE: PerformanceSlots = {
  restingFace: "平靜自然、放鬆克制嘅中性神情，雙唇輕合或自然微啟（唔好全程傻笑或掛住固定笑容、絕對唔好張開口露齒大笑、唔好擠蘋果肌或瞇眼笑）、下巴自然放鬆，正面向住鏡頭，眼神平穩專注直望鏡頭",
  emphasisBeat: "面部微表情要清晰可見、有層次感（Clearly readable micro-expressions，約 3–4mm 自然眉眼幅度與 2–3 度頭部動作），嚴格跟隨台詞內容轉換情緒，絕對唔好由頭笑到尾或木口木面：（a）問句或好奇位——眉頭明顯自然微揚、雙眼微睜帶出好奇探問神情、頭微傾 2–3 度；（b）痛點、危機或否定句（如市況唔好、冇安全感）——收起笑容轉為認真凝重神情、眉心清晰微蹙聚攏配 2–3 度自然搖頭；（c）解決方案或重點教學位——眉心舒展、眼神堅定篤定、配 2–3 度肯定點頭；（d）驚喜亮點或結尾正面呼籲——雙眼提亮有神、講到「完全免費」等亮點時眉毛自然微揚，句尾帶出溫暖柔和嘅閉唇淺笑。口型連貫流暢唔逐字啪嘴、下巴開合自然克制（約 25–30% 自然開合，下唇遮住下排牙齒，無誇張張大嘴）",
  hookBeat: "正面向住鏡頭、直望鏡頭中心，神情平靜自然、雙唇輕合或微啟準備講嘢（唔好張開口露齒大笑或誇張表情）",
  ctaBeat: "只喺最後結尾邀請時帶出溫暖柔和、清晰可見嘅閉唇淺笑，眉毛舒展放鬆，上身微微傾向鏡頭好似講緊秘密",
  gestureLibrary:
    "近九成時間雙手自然放鬆放喺大髀休息位（Neutral Rest，或一隻手兩指輕捏住迷你手提無線收音咪停喺胸口前做支點）；只喺整句最核心嗰一個重點詞出現時，單一慣用手由大髀輕輕抬起做一個約 0.5 秒嘅自然拍點手勢（起手 → 重音拍點 → 短暫停留 → 自然收返落大髀原位），另一隻手全程放喺大髀唔郁，絕對唔好雙手輪流喺半空比畫",
  headMotion:
    "腰部、軀幹同雙肩保持固定正面向住鏡頭（僅有自然呼吸微幅起伏，唔好左右挪動或前後搖晃）；頭部正對鏡頭，隨台詞語義做出清晰自然嘅 2–3 度點頭（肯定重點位）、2–3 度輕微搖頭（否定／痛點位）或 2–3 度微傾（好奇提問位），雙眼全程穩定直望鏡頭中心",
  anchorProp: "",
  set: "層次豐富嘅溫暖文青創作工作室：坐喺橄欖綠絲絨扶手椅上面，左後方米白色牆身掛住芥末黃圓形簡約掛鐘同兩幅細木框抽象畫，右後方係溫暖木書架擺滿書本、黑膠唱片同一盞亮起暖黃光嘅檯燈柔和虛化",
  light: "溫暖柔和嘅暖色調（3400K–4200K 暖黃琥珀色溫）室內漫射環境光配背景暖光檯燈，面部光暗過渡柔和自然、膚色溫暖紅潤、無冷白偏藍感、無誇張陰陽面反差——唔好正面美顏環形燈，冇影樓燈",
};

const FULL_BODY_EN: PerformanceSlots = {
  ...FACE_EN,
  anchorProp: "",
  set: "the same plain background in every clip, no new props",
  light: "warm golden-amber daylight from a window to one side (3400K–4200K warm indoor tone), unchanged",
};

const FULL_BODY_YUE: PerformanceSlots = {
  ...FACE_YUE,
  anchorProp: "",
  set: "全程同一個簡潔背景，冇新道具",
  light: "一邊窗嘅溫暖暖色調自然日光（3400K–4200K 暖色溫），不變",
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
