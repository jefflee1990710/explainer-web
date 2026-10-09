import type { PerformanceSlots } from "@/model/director-performance";
import type { VoLanguage } from "@/model/project";
import { DEFAULT_PERFORMANCE } from "@/service/director/performance";
import { toWrittenChinese } from "@/service/director/written-chinese";

const TALKING_HEAD_SLUG = "talking-head-director";
const FULL_BODY_TALKING_HEAD_SLUG = "full-body-talking-head-director";

export type TalkingShot = "face" | "full-body";

export function talkingShotForSkill(skillSlug?: string): TalkingShot | undefined {
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
  return `On-camera speech like a real person filming a vertical reel on a phone: eyes stay locked on the lens the whole time, talking to one friend, never a news-anchor statue. The mouth articulates every syllable of the spoken line with visible lip-sync. Natural blinks. Resting face: ${perf.restingFace}. Emphasis: ${perf.emphasisBeat} — a resting, emphasis, resting cycle on every sentence. Between sentences a brief lip press, a sideways head tilt, or a blink marks the pause so the face never holds one shape. After the last syllable the mouth closes but the face stays engaged.`;
}

// Kept for callers that want the default face lock without a skill in hand.
export const TALKING_FACE_LOCK = talkingFaceLock(DEFAULT_PERFORMANCE.face.en);

function talkingBodyRules(shot: TalkingShot, perf: PerformanceSlots) {
  const anchored = hasAnchorProp(perf);
  const head = `Head keeps moving: ${perf.headMotion}. Never look away from the lens.`;
  const hands = anchored
    ? [
        `One hand holds ${perf.anchorProp} the whole time as a fixed visual anchor; that hand barely moves. It may tip the prop a little on a stressed word, then bring it back. Never put it down. Never a greeting wave. Never a finger jab at the lens.`,
        `The other hand does all the gesturing and changes shape every 1–2 seconds in time with the words: ${perf.gestureLibrary}. It may enter and leave the frame edge between gestures. It never stays still through a whole sentence.`,
      ].join(" ")
    : `Hands keep moving at chest height and change shape every 1–2 seconds in time with the words: one hand leads, the other follows — ${perf.gestureLibrary}. A hand may enter and leave the frame edge between gestures. Never freeze both arms at the sides. Never a greeting wave. Never a finger jab at the lens.`;
  if (shot === "full-body") {
    return [
      head,
      hands,
      "Whole body keeps moving: weight shifts hip to hip, a slight torso sway, one knee soft. Feet stay in frame. Not marching, not standing at attention.",
    ].join(" ");
  }
  return [
    "The character stays seated.",
    hands,
    head,
    "Upper body keeps moving: a small lean in on the key point, then settle back into the seat. Do not freeze the neck and shoulders. Do not stand up.",
  ].join(" ");
}

export function talkingVideoMotionRules(shot: TalkingShot, perf?: PerformanceSlots) {
  const p = slots(shot, perf);
  return [
    "This clip is on-camera speech, like a real person recording a reel, not a snap action and not a frozen pose.",
    talkingFaceLock(p),
    talkingBodyRules(shot, p),
    "Do not write snaps, flicks, whips, or pops for the face or body. Speech is conversational and sustained through the line. Camera locked.",
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
  if (input.language === "en" || !input.language) {
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    return `Subtitle stays ${place}, this clip's line only: "${input.line}". If the opening frame still shows other words, replace them at once and do not read them. The voice says this line once and no earlier sentence.`;
  }
  const painted = toWrittenChinese(input.line);
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  return `${place}全程只係呢句「${painted}」。如果開頭畫面仲係上一段嘅字，即刻改成呢句，唔好讀出舊字。把聲只講呢句一次，唔好再講上一段。`;
}

function speakEnd(seconds: number) {
  return Math.max(seconds - 0.8, Math.round(seconds * 0.7 * 10) / 10);
}

function leadHand(clipNumber?: number) {
  return (clipNumber ?? 1) % 2 === 1 ? "right" : "left";
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
}) {
  const close = speakEnd(input.seconds);
  const hand = leadHand(input.clipNumber);
  const other = hand === "right" ? "left" : "right";
  // Clip 1 opens on the hook beat; the last clip closes on the CTA beat.
  const first = (input.clipNumber ?? 1) === 1;
  const last = Boolean(input.totalClips && input.clipNumber === input.totalClips);
  const seated = input.shot !== "full-body";
  if (input.language === "en" || !input.language) {
    const p = input.performance ?? DEFAULT_PERFORMANCE[input.shot].en;
    const anchored = hasAnchorProp(p);
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    // Quoting the previous line makes the model speak it again.
    const subtitle = input.previousLine
      ? thisClipOnlySubtitle({ language: "en", line: input.line, belowCenter: Boolean(input.belowCenter) })
      : `Subtitle stays ${place}: "${input.line}".`;
    const face = `a live ${seated ? "real-person" : "reel-person"} face — ${p.restingFace}, and ${p.emphasisBeat}`;
    const head = `head tilting and nodding on the stresses — ${p.headMotion}`;
    const hands = anchored
      ? `the ${hand} hand holding ${p.anchorProp} as a fixed anchor while the ${other} hand does all the gesturing at chest height and changes shape every 1–2 seconds in time with the words (${p.gestureLibrary})`
      : `the ${hand} then ${other} hand gesturing at chest height and changing shape every 1–2 seconds in time with the words (${p.gestureLibrary})`;
    const body = seated
      ? `speaks "${input.line}" with continuous lip-sync, ${face}, seated the whole time, ${head}, ${hands}`
      : `speaks "${input.line}" with continuous lip-sync, ${face}, ${head}, ${hands}, and weight shifting hip to hip; feet stay in frame`;
    const hook = first ? `${p.hookBeat} as the hook` : "eyebrows lifting into a warm half-smile";
    const propReady = anchored ? `, the ${hand} hand already holding ${p.anchorProp}` : "";
    const open = seated
      ? `0–0.4s she inhales, blinks once, seated, eyes locked on the lens, ${hook}${propReady}, the ${other} hand already rising to chest height, mouth opening`
      : `0–0.4s she inhales, blinks once, eyes locked on the lens as if talking into a phone, ${hook}${propReady}, head already tilting, one hand already rising, mouth opening`;
    const closeFace = last
      ? `the mouth closes into ${p.ctaBeat}`
      : "the mouth closes into an engaged small smile, eyebrows settling";
    const closeBeat = anchored
      ? `the ${hand} hand still holding ${p.anchorProp}, the ${other} hand lowers to chest height, the body still has a little residual sway`
      : "the raised hand settles at chest height, the body still has a little residual sway";
    return `${open}; 0.4–${close}s she ${body}; ${close}–${input.seconds}s ${closeFace}, ${closeBeat}; camera locked. ${subtitle}`;
  }
  const p = input.performance ?? DEFAULT_PERFORMANCE[input.shot].yue;
  const anchored = hasAnchorProp(p);
  const painted = toWrittenChinese(input.line);
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  // 唔好引用上一段。引用會令模型再唸一次。
  const subtitle = input.previousLine
    ? thisClipOnlySubtitle({ language: input.language, line: input.line, belowCenter: Boolean(input.belowCenter) })
    : `${place}保持「${painted}」。`;
  const zhHand = hand === "right" ? "右手" : "左手";
  const zhOther = hand === "right" ? "左手" : "右手";
  const face = `神情似真人${seated ? "喺屋企拍手機片" : "拍 Reel"}，${p.restingFace}，${p.emphasisBeat}`;
  const head = `頭部左右傾同重音位點頭，${p.headMotion}`;
  const hands = anchored
    ? `${zhHand}拎住${p.anchorProp}作為固定錨點幾乎唔郁，${zhOther}負責晒所有手勢喺胸前比畫，每 1–2 秒換一個手勢跟住說話節奏（${p.gestureLibrary}）`
    : `${zhHand}再${zhOther}喺胸前比畫，每 1–2 秒換一個手勢跟住說話節奏（${p.gestureLibrary}）`;
  const body = seated
    ? `坐住唔起身，口型跟住講「${input.line}」，${face}，${head}，${hands}`
    : `口型跟住講「${input.line}」，${face}，${head}，${hands}，重心左右移；頭到腳留喺畫面`;
  const hook = first ? `${p.hookBeat}做 hook` : "眉毛揚起、帶住半笑";
  const propReady = anchored ? `、${p.anchorProp}已經喺${zhHand}` : "";
  const open = seated
    ? `0–0.4s 坐住、吸一口氣、眨眼、直望鏡頭、${hook}${propReady}、${zhOther}已經提到胸前、準備開口`
    : `0–0.4s 吸一口氣、眨眼、直望鏡頭好似對住手機講、${hook}${propReady}、頭已經微傾、一隻手已經提起、準備開口`;
  const closeFace = last ? `口部合上變成${p.ctaBeat}` : "口部合上變成有神嘅淺笑，眉毛放鬆";
  const closeBeat = anchored
    ? `${p.anchorProp}仍然喺${zhHand}，${zhOther}放低到胸前，身體仲有少少餘勢`
    : "手慢慢放低到胸前，身體仲有少少餘勢";
  return `${open}；0.4–${close}s ${body}；${close}–${input.seconds}s ${closeFace}，${closeBeat}；鏡頭鎖定。${subtitle}`;
}
