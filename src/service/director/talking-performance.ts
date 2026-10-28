import type { PerformanceSlots } from "@/model/director-performance";
import type { VoLanguage } from "@/model/project";
import { getDirectorBySlug } from "@/service/director/catalog";
import { DEFAULT_PERFORMANCE } from "@/service/director/performance";
import { toWrittenChinese } from "@/service/director/written-chinese";

const TALKING_HEAD_SLUG = "talking-head-director";
const FULL_BODY_TALKING_HEAD_SLUG = "full-body-talking-head-director";

export type TalkingShot = "face" | "full-body";

export function talkingShotForSkill(skillSlug?: string): TalkingShot | undefined {
  const director = getDirectorBySlug(skillSlug);
  if (director) return director.behavior.talkingHeadShot;
  if (skillSlug === FULL_BODY_TALKING_HEAD_SLUG) return "full-body";
  if (skillSlug === TALKING_HEAD_SLUG) return "face";
  return undefined;
}

export function clipUsesTalkingPerformance(skillSlug?: string) {
  return Boolean(talkingShotForSkill(skillSlug));
}

// A prop in the anchor hand (e.g. a handheld mic) means only the other hand gestures.
export function hasAnchorProp(perf: PerformanceSlots) {
  return Boolean(perf.anchorProp.trim());
}

function slots(shot: TalkingShot, perf?: PerformanceSlots) {
  return perf ?? DEFAULT_PERFORMANCE[shot].en;
}

// Phone-front-camera reel: look straight at the lens and stay alive.
// Expression pattern (resting face, emphasis beat) comes from the performance slots.
export function talkingFaceLock(perf: PerformanceSlots) {
  return `On-camera speech like a real person filming a vertical reel on a handheld phone at natural 1.0x real-time conversational speed: eyes stay locked on the lens the whole time (both pupils centered on the camera lens, never glancing off-camera, upward, sideways, or down at the hands), talking to one friend, never a news-anchor statue and never in slow-motion. The mouth articulates every syllable of the spoken line with visible lip-sync driven by speech energy (stronger syllables open a bit more; quieter syllables and pauses close with moist lip highlight and slight left/right smile asymmetry — never a frozen presenter half-smile while talking), precise restrained lip articulation, and small natural jaw movement (~30–40% conversational mouth opening, clean lip closure on bilabial m/b/p sounds, and natural upper-face eyebrow and eye micro-expressions — no exaggerated mouth opening, no excessive jaw swing, no rubbery cheeks, no changing teeth). Natural blinks. Resting face: ${perf.restingFace}. Emphasis: ${perf.emphasisBeat} — a resting, emphasis, resting cycle on every sentence. Between sentences a brief lip press, a sideways head tilt, or a blink marks the pause so the face never holds one shape. After the last syllable the mouth closes cleanly but the face stays engaged.`;
}

// Kept for callers that want the default face lock without a skill in hand.
export const TALKING_FACE_LOCK = talkingFaceLock(DEFAULT_PERFORMANCE.face.en);

function talkingBodyRules(shot: TalkingShot, perf: PerformanceSlots) {
  const anchored = hasAnchorProp(perf);
  const head = `Head keeps moving while gaze stays locked directly on the lens: ${perf.headMotion}. Both eyes look straight into the camera lens center at all times — never glance off-camera, upward, sideways, or down at the gesturing hands.`;
  const hands = anchored
    ? [
        `One hand holds ${perf.anchorProp} the whole time. That hand barely moves and never swaps hands. Never a greeting wave. Never a finger jab at the lens.`,
        `The other hand rests on the lap ~90% of the time and makes one brief ~0.5s co-speech gesture excursion on the single main key word (preparation lift from the lap, stroke on the stressed word, brief hold, then smooth retraction back to the lap): ${perf.gestureLibrary}. Never float aimlessly in mid-air.`,
      ].join(" ")
    : /rest calmly on the lap/i.test(perf.gestureLibrary)
      ? `Hands: ${perf.gestureLibrary}. Never alternate right then left hands in mid-air, never float aimlessly, and never a greeting wave or finger jab.`
      : `Hands rest calmly on the lap ~90% of the time in a neutral rest position; only on the single main key word of the sentence, one dominant hand makes a brief ~0.5s co-speech gesture excursion (preparation lift from the lap, stroke on the stressed word, brief hold, then smooth retraction back to rest on the lap) while the other hand stays completely still — ${perf.gestureLibrary}. Never alternate right then left hands in mid-air, never float aimlessly, and never a greeting wave or finger jab.`;
  if (shot === "full-body") {
    return [
      head,
      hands,
      "Whole body keeps moving: weight shifts hip to hip, torso angles slightly left or right, a small step or lean forward on a key point, one knee soft. Feet stay in frame. Not marching, not standing at attention.",
    ].join(" ");
  }
  return [
    "Proximal torso, pelvis, and shoulders stay anchored in the same seated spot with only subtle natural breathing movement.",
    hands,
    head,
    "Do not rock or shift torso weight side to side on the sofa, and do not stand up.",
  ].join(" ");
}

export function talkingVideoMotionRules(shot: TalkingShot, perf?: PerformanceSlots) {
  const p = slots(shot, perf);
  return [
    "This clip is on-camera speech, like a real person recording a reel at natural 1.0x real-time speed, not a snap action, not slow-motion, and not a frozen pose.",
    talkingFaceLock(p),
    talkingBodyRules(shot, p),
    "Do not write snaps, flicks, whips, or pops for the face or body. Move at natural real-time conversational pace — never slow-motion or drifting hands. Speech is conversational and sustained through the line. Camera: organic handheld iPhone selfie micro-sway of about 1–2 degrees (tiny irregular drift and settle — never a locked tripod statue).",
  ].join(" ");
}

// Old plans quote the previous subtitle ("changes from A to B"), so the model speaks A again.
export function speakOnlyThisClip(motion: string, line: string, language?: VoLanguage) {
  const spoken = line.trim();
  if (!spoken || !/換成「|changes from "/.test(motion)) return motion;
  const belowCenter = /中線下面|below the vertical center/.test(motion);
  const body = motion
    .replace(/\s*(?:中線下面少少嘅字幕|底部字幕)由「[^」]*」換成「[^」]*」。/g, "")
    .replace(/\s*Subtitle [^.]*changes from "[^"]*" to "[^"]*"\./g, "")
    .trim();
  return `${body} ${thisClipOnlySubtitle({ language, line: spoken, belowCenter })}`.replace(/\s{2,}/g, " ");
}

function thisClipOnlySubtitle(input: { language?: VoLanguage; line: string; belowCenter: boolean }) {
  if (input.language !== "yue" && input.language !== "zh") {
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    return `Subtitle stays ${place}, this clip's line only: "${input.line}". Keep the subtitle as one single block — never duplicate, stack, or draw a second copy of the subtitle line. If the opening frame still shows other words, replace them at once and do not read them. The voice says this line once and no earlier sentence.`;
  }
  const painted = toWrittenChinese(input.line);
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  return `${place}全程只係呢句「${painted}」，只顯示一組字幕，唔好重複疊兩行一樣嘅字。如果開頭畫面仲係上一段嘅字，即刻改成呢句，唔好讀出舊字。把聲只講呢句一次，唔好再講上一段。`;
}

function speakEnd(seconds: number) {
  return Math.max(seconds - 0.3, Math.round(seconds * 0.85 * 10) / 10);
}

function leadHand(clipNumber?: number) {
  return (clipNumber ?? 1) % 2 === 1 ? "right" : "left";
}

function clipHeadMotionEn(clipNumber: number | undefined, baseHeadMotion: string) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const isDefault = baseHeadMotion === DEFAULT_PERFORMANCE.face.en.headMotion;
  const coreHead = isDefault
    ? "a calm, subtle head tilt of 2–3 degrees with gentle nods on stressed words, both eyes locked directly on the lens center the whole time"
    : baseHeadMotion;
  const beats = [
    `keeping torso centered on the seat, tilting the head gently 2–3 degrees to the left and nodding softly on stressed words while keeping eyes locked directly on the lens (${coreHead})`,
    `staying centered and relaxed on the sofa, tilting the head gently 2–3 degrees to the right and nodding softly on stressed words with both eyes locked straight on the lens center — never glancing upward or off-camera (${coreHead})`,
    `staying comfortably seated and centered, head tilting gently 2–3 degrees to the right while keeping eyes locked on the lens (${coreHead})`,
    `facing the camera straight-on with a gentle nod on the key words and eyes locked directly on the lens (${coreHead})`,
    `staying centered on the cushion, tilting the head gently 2–3 degrees to the left with a subtle brow lift then nodding toward the lens (${coreHead})`,
    `leaning in slightly toward the camera as if confiding in a friend, head upright with a warm nod and expressive eyes locked on the lens (${coreHead})`,
  ];
  return beats[variant];
}

function clipGestureBeatEn(clipNumber: number | undefined, gestureLibrary: string) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  if (gestureLibrary !== DEFAULT_PERFORMANCE.face.en.gestureLibrary) return gestureLibrary;
  const beats = [
    "preparation lift from the lap just before the key word, a soft open-palm stroke at lower-chest height on the stressed word, a brief hold, then smooth retraction back to rest on the lap while the other hand stays still on the lap",
    "preparation lift from the lap, a relaxed open conversational palm stroke at lower-chest height on the main point, a brief hold, then smooth retraction back to rest on the lap while the other hand stays still on the lap",
    "preparation lift from the lap, a gentle open-palm stroke at lower-chest height on the stressed phrase, a brief hold, then smooth retraction back to rest on the lap while the other hand stays still on the lap",
    "preparation lift from the lap, a soft open-palm emphasis stroke at lower-chest height on the key word, a brief hold, then smooth retraction back to rest on the lap while the other hand stays still on the lap",
    "preparation lift from the lap, an open upward-palm stroke at lower-chest height on the claim, a brief hold, then smooth retraction back to rest on the lap while the other hand stays still on the lap",
    "preparation lift from the lap, a calm open-palm stroke at lower-chest height on the key point, a brief hold, then smooth retraction back to rest on the lap while the other hand stays still on the lap",
  ];
  return beats[variant];
}

function clipCloseLandingEn(
  clipNumber: number | undefined,
  last: boolean,
  ctaBeat: string,
  anchored: boolean,
  hand: string,
  other: string,
  anchorProp: string,
) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const closeFaces = [
    "the mouth closes into a small real smile, eyebrows relaxed, head tilted gently 1–2 degrees to the left while staying centered on the seat, facing the camera with eyes on the lens",
    "the mouth closes into a thoughtful half-smile, facing the camera straight-on with head tilted gently 1–2 degrees to the right and both eyes locked on the lens",
    "the mouth closes into an engaged warm smile, seated centered and relaxed on the sofa with head tilted gently 1–2 degrees to the right, eyes on the lens",
    "the mouth closes into a lively knowing smile, facing the camera with head tilted gently 1–2 degrees left, eyes locked on the lens",
    "the mouth closes into a confident smile, eyebrows softly lifted, seated centered with head upright, eyes locked on the lens",
    "the mouth closes into a warm conversational smile, head tilted gently 1–2 degrees to the left with a soft nod, eyes locked on the lens",
  ];
  const closeFace = last ? `the mouth closes into ${ctaBeat}` : closeFaces[variant];
  if (anchored) {
    const anchoredHands = [
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand resting calmly on the lap, the body stays in the frame`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand resting calmly on the lap`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand resting calmly on the lap`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand resting calmly on the lap, facing the camera`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand resting calmly on the lap`,
      `the ${hand} hand still holding ${anchorProp}, the ${other} hand resting calmly on the lap`,
    ];
    return { closeFace, closeBeat: anchoredHands[variant] };
  }
  const unanchoredHands = [
    "both hands resting calmly on the lap in a neutral rest position",
    "both hands resting calmly on the lap in a neutral rest position",
    "both hands resting calmly on the lap in a neutral rest position",
    "both hands resting calmly on the lap in a neutral rest position, facing the camera",
    "both hands resting calmly on the lap in a neutral rest position",
    "both hands resting calmly on the lap in a neutral rest position",
  ];
  return { closeFace, closeBeat: unanchoredHands[variant] };
}

function clipHeadMotionYue(clipNumber: number | undefined, baseHeadMotion: string) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const isDefault = baseHeadMotion === DEFAULT_PERFORMANCE.face.yue.headMotion;
  const coreHead = isDefault
    ? "腰部、軀幹同雙肩保持固定喺同一位置，頭部正對鏡頭只喺重音字有 1–2 度嘅微幅點頭，雙眼全程穩定直望鏡頭中心"
    : baseHeadMotion;
  const beats = [
    `坐姿同雙肩保持置中穩定、頭向左微傾 1–2 度同喺重音位輕輕點頭，雙眼全程直望鏡頭（${coreHead}）`,
    `坐姿同雙肩保持置中穩定、頭向右微傾 1–2 度同喺重音位輕輕點頭，雙眼全程穩定直望鏡頭中心、唔好望向側邊或上方（${coreHead}）`,
    `上身同雙肩保持自然穩定、頭向右微傾 1–2 度同輕輕點頭，雙眼直望鏡頭（${coreHead}）`,
    `坐姿同雙肩保持置中穩定、頭向左微傾 1–2 度同喺重音位輕輕點頭，正面對住鏡頭、雙眼全程直望鏡頭（${coreHead}）`,
    `坐姿同雙肩保持置中穩定，頭向左微傾 1–2 度再向鏡頭輕輕點頭，雙眼直望鏡頭（${coreHead}）`,
    `上身微微傾向鏡頭好似同朋友傾偈，頭擺正溫柔點頭，雙眼直望鏡頭（${coreHead}）`,
  ];
  return beats[variant];
}

function clipGestureBeatYue(clipNumber: number | undefined, gestureLibrary: string) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  if (gestureLibrary !== DEFAULT_PERFORMANCE.face.yue.gestureLibrary) return gestureLibrary;
  const beats = [
    "起手由大髀微抬 → 喺核心重點詞做約 0.5 秒掌心微開拍點 → 短暫停留 → 自然收返落大髀休息位，另一隻手全程放喺大髀唔郁",
    "起手由大髀微抬 → 喺核心重點詞做約 0.5 秒掌心向鏡頭微開拍點 → 短暫停留 → 自然收返落大髀休息位，另一隻手全程放喺大髀唔郁",
    "起手由大髀微抬 → 喺核心重點詞做約 0.5 秒自然微開拍點 → 短暫停留 → 自然收返落大髀休息位，另一隻手全程放喺大髀唔郁",
    "起手由大髀微抬 → 喺核心重點詞做約 0.5 秒輕微強調拍點 → 短暫停留 → 自然收返落大髀休息位，另一隻手全程放喺大髀唔郁",
    "起手由大髀微抬 → 喺核心重點詞做約 0.5 秒掌心向上微開拍點 → 短暫停留 → 自然收返落大髀休息位，另一隻手全程放喺大髀唔郁",
    "起手由大髀微抬 → 喺核心重點詞做約 0.5 秒掌心自然微開邀請拍點 → 短暫停留 → 自然收返落大髀休息位，另一隻手全程放喺大髀唔郁",
  ];
  return beats[variant];
}

function clipCloseLandingYue(
  clipNumber: number | undefined,
  last: boolean,
  ctaBeat: string,
  anchored: boolean,
  zhHand: string,
  zhOther: string,
  anchorProp: string,
) {
  const variant = ((clipNumber ?? 1) - 1) % 6;
  const closeFaces = [
    "口部合上變成自然淺笑，眉毛放鬆，坐姿保持置中、頭向左邊微傾 1–2 度，正面直望鏡頭",
    "口部合上帶住思考嘅淺笑，正面對住鏡頭、頭向右微傾 1–2 度，雙眼直望鏡頭",
    "口部合上變成有神嘅淺笑，坐姿保持置中放鬆、頭向右邊微傾 1–2 度，直望鏡頭",
    "口部合上變成親切笑容，正面對住鏡頭，雙眼直望鏡頭",
    "口部合上帶住自信微笑，坐姿保持置中、頭擺正望住鏡頭",
    "口部合上變成溫柔淺笑，頭向左微傾 1–2 度點頭，直望鏡頭",
  ];
  const closeFace = last ? `口部合上變成${ctaBeat}` : closeFaces[variant];
  if (anchored) {
    return {
      closeFace,
      closeBeat: `${anchorProp}仍然喺${zhHand}，${zhOther}已經自然收返落大髀休息位，身體留喺畫面入面`,
    };
  }
  const unanchoredHands = [
    "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
    "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
    "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
    "雙手已經自然收返落大髀休息位置，正面對住鏡頭，坐姿保持置中穩定",
    "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
    "雙手已經自然收返落大髀休息位置，坐姿同雙肩保持置中穩定",
  ];
  return { closeFace, closeBeat: unanchoredHands[variant] };
}
function anchorSide() {
  return "right" as const;
}

export function talkingMotionLine(input: {
  language?: VoLanguage;
  seconds: number;
  line: string;
  previousLine?: string;
  shot: TalkingShot;
  clipNumber?: number;
  // Total planned clips. The last clip ends on the CTA beat.
  totalClips?: number;
  belowCenter?: boolean;
  // Resolved slots in the prompt language. Defaults to the shot's English set.
  performance?: PerformanceSlots;
  // True when a later pass burns the subtitle on. Motion keeps the spoken line and skips caption fades.
  overlay?: boolean;
  // Brief chose None. Do not mention an on-screen subtitle at all.
  noText?: boolean;
  // Next clip's spoken line. Talking-head overlay ends on this subtitle.
  nextLine?: string;
}) {
  const close = speakEnd(input.seconds);
  const pEn = input.performance ?? DEFAULT_PERFORMANCE[input.shot].en;
  const anchoredEn = hasAnchorProp(pEn);
  // Unanchored clips still alternate which hand leads. The mic hand stays put.
  const hand = anchoredEn ? anchorSide() : leadHand(input.clipNumber);
  const other = hand === "right" ? "left" : "right";
  // Clip 1 opens on the hook beat; the last clip closes on the CTA beat.
  const first = (input.clipNumber ?? 1) === 1;
  const last = Boolean(input.totalClips && input.clipNumber === input.totalClips);
  const seated = input.shot !== "full-body";
  // Subtitles are never generated into scene stills or videos.
  const hideSubtitle = true;
  if (input.language !== "yue" && input.language !== "zh") {
    const p = pEn;
    const anchored = anchoredEn;
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    // Quoting the previous line makes the model speak it again.
    const subtitle = input.previousLine
      ? thisClipOnlySubtitle({ language: "en", line: input.line, belowCenter: Boolean(input.belowCenter) })
      : `The large subtitle holds ${place}: "${input.line}".`;
    const face = `a live ${seated ? "real-person" : "reel-person"} face — ${p.restingFace}, and ${p.emphasisBeat}`;
    const head = `head tilting and nodding on the stresses — ${clipHeadMotionEn(input.clipNumber, p.headMotion)}`;
    const gestureBeat = clipGestureBeatEn(input.clipNumber, p.gestureLibrary);
    const hands = anchored
      ? `the ${hand} hand holding ${p.anchorProp} as a fixed anchor while the ${other} hand makes one brief ~0.5s co-speech gesture excursion on the key word (${gestureBeat})`
      : `the ${hand} hand makes one brief ~0.5s co-speech gesture excursion on the key word (${gestureBeat})`;
    const body = seated
      ? `speaks "${input.line}" with continuous lip-sync and active syllable-by-syllable visible mouth and jaw movement at natural 1.0x real-time human speed (every word clearly articulated with visible mouth opening and closing — never hold a frozen smile or closed mouth while speaking, never slow-motion, no exaggerated mouth opening or excessive jaw swing), ${face}, seated the whole time, ${head}, ${hands}`
      : `speaks "${input.line}" with continuous lip-sync and active syllable-by-syllable visible mouth and jaw movement at natural 1.0x real-time human speed (every word clearly articulated with visible mouth opening and closing — never hold a frozen smile or closed mouth while speaking, never slow-motion, no exaggerated mouth opening or excessive jaw swing), ${face}, ${head}, ${hands}, and weight shifting hip to hip; feet stay in frame`;
    const hook = first ? `${p.hookBeat} as the hook` : "eyebrows lifting into a warm half-smile";
    const propReady = anchored ? `, the ${hand} hand already holding ${p.anchorProp}` : "";
    const fadeIn = `the large subtitle fades and slides up into place ${place}`;
    const fadeInClause = hideSubtitle ? "" : `, ${fadeIn}`;
    const open = !first
      ? `0–0.4s she stays in the exact framing of the first frame, ${seated ? "seated, " : ""}same crop, same distance, eyes locked on the lens, ${hook}${propReady}, mouth immediately opening into this line (never holding the first frame frozen)${fadeInClause}, no cut and no jump`
      : seated
        ? `0–0.4s she inhales, blinks once, seated, eyes locked on the lens, ${hook}${propReady}, both hands resting calmly on the lap, mouth opening${fadeInClause}`
        : `0–0.4s she inhales, blinks once, eyes locked on the lens as if talking into a phone, ${hook}${propReady}, head already tilting, mouth opening${fadeInClause}`;
    const { closeFace, closeBeat } = clipCloseLandingEn(
      input.clipNumber,
      last,
      p.ctaBeat,
      anchored,
      hand,
      other,
      p.anchorProp,
    );
    const fadeOut = `the large subtitle fades and slides down out`;
    const cameraTail = seated
      ? "camera holds the same 30–40cm collarbone-up selfie framing at 24mm f/1.8 from the first frame to the last frame with organic handheld 1–2° micro-sway, no zoom, no reframe, no jump."
      : "camera holds the same framing from the first frame to the last frame with organic handheld 1–2° micro-sway, no zoom, no reframe, no jump.";
    const hold = hideSubtitle ? "" : ", and the large subtitle holds still";
    const fadeOutClause = hideSubtitle ? "" : `, ${fadeOut}`;
    const subtitleTail = hideSubtitle ? "" : ` ${subtitle}`;
    const transition = "";
    const speakStart = first ? "0.4" : "0";
    return `${open}; ${speakStart}–${close}s she ${body}${hold}; ${close}–${input.seconds}s ${closeFace}, ${closeBeat}${fadeOutClause}${transition}; ${cameraTail}${subtitleTail}`;
  }
  const p = input.performance ?? DEFAULT_PERFORMANCE[input.shot].yue;
  const anchored = hasAnchorProp(p);
  const painted = toWrittenChinese(input.line);
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  // 唔好引用上一段。引用會令模型再唸一次。
  const subtitle = input.previousLine
    ? thisClipOnlySubtitle({ language: input.language, line: input.line, belowCenter: Boolean(input.belowCenter) })
    : `大字幕保持${place}「${painted}」。`;
  const zhHand = hand === "right" ? "右手" : "左手";
  const zhOther = hand === "right" ? "左手" : "右手";
  const face = `神情似真人${seated ? "喺屋企拍手機片" : "拍 Reel"}，${p.restingFace}，${p.emphasisBeat}`;
  const head = `頭部左右傾同重音位點頭，${clipHeadMotionYue(input.clipNumber, p.headMotion)}`;
  const gestureBeat = clipGestureBeatYue(input.clipNumber, p.gestureLibrary);
  const hands = anchored
    ? `${zhHand}拎住${p.anchorProp}作為固定錨點幾乎唔郁，${zhOther}只喺核心重點詞做一次約 0.5 秒嘅自然拍點手勢（${gestureBeat}）`
    : `${zhHand}只喺核心重點詞做一次約 0.5 秒嘅自然拍點手勢（${gestureBeat}）`;
  const body = seated
    ? `坐住唔起身，以自然 1.0x 真人說話速度（唔好慢動作）全程持續清晰口型跟住講「${input.line}」（每個字都有清晰明顯嘅嘴唇同下巴開合對嘴動作，絕對唔好合埋口唔郁或者定格露齒微笑；口型精準克制、下巴同唇部開合細緻自然、無誇張大嘴或歪嘴變形），${face}，${head}，${hands}`
    : `以自然 1.0x 真人說話速度（唔好慢動作）全程持續清晰口型跟住講「${input.line}」（每個字都有清晰明顯嘅嘴唇同下巴開合對嘴動作，絕對唔好合埋口唔郁或者定格露齒微笑；口型精準克制、下巴同唇部開合細緻自然、無誇張大嘴或歪嘴變形），${face}，${head}，${hands}，重心左右移；頭到腳留喺畫面`;
  const hook = first ? `${p.hookBeat}做 hook` : "眉毛揚起、帶住半笑";
  const propReady = anchored ? `、${p.anchorProp}已經喺${zhHand}` : "";
  const fadeIn = `大字幕由下向上淡入到${place}`;
  const fadeInClause = hideSubtitle ? "" : `、${fadeIn}`;
  const open = !first
    ? `0–0.4s 保持第一幀嘅構圖，${seated ? "坐住、" : ""}同一個裁切、同一距離、直望鏡頭、${hook}${propReady}、第一幀即刻開口講呢句（唔好將第一幀定格）${fadeInClause}、冇切鏡、冇跳鏡`
    : seated
      ? `0–0.4s 坐住、吸一口氣、眨眼、直望鏡頭、${hook}${propReady}、雙手自然放喺大髀休息位、準備開口${fadeInClause}`
      : `0–0.4s 吸一口氣、眨眼、直望鏡頭好似對住手機講、${hook}${propReady}、頭已經微傾、準備開口${fadeInClause}`;
  const { closeFace, closeBeat } = clipCloseLandingYue(
    input.clipNumber,
    last,
    p.ctaBeat,
    anchored,
    zhHand,
    zhOther,
    p.anchorProp,
  );
  const cameraTail = seated
    ? "鏡頭由第一幀到最後一幀保持 30–40cm 鎖骨以上自拍構圖，24mm f/1.8，有機手持微晃 1–2 度，唔好變焦、唔好換鏡、唔好跳鏡。"
    : "鏡頭由第一幀到最後一幀保持同一構圖，有機手持微晃 1–2 度，唔好變焦、唔好換鏡、唔好跳鏡。";
  const hold = hideSubtitle ? "" : "，大字幕保持唔郁";
  const fadeOutClause = hideSubtitle ? "" : "，大字幕向下淡出";
  const subtitleTail = hideSubtitle ? "" : subtitle;
  const transition = "";
  const speakStart = first ? "0.4" : "0";
  return `${open}；${speakStart}–${close}s ${body}${hold}；${close}–${input.seconds}s ${closeFace}，${closeBeat}${fadeOutClause}${transition}；${cameraTail}${subtitleTail}`;
}
