import type { VoLanguage } from "@/model/project";

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

// Phone-front-camera reel: look straight at the lens and stay alive.
export const TALKING_FACE_LOCK =
  "On-camera speech like a real person filming a vertical reel on a phone: eyes stay locked on the lens the whole time, talking to one friend, never a news-anchor statue. The mouth articulates every syllable of the spoken line with visible lip-sync. Natural blinks. Eyebrows, cheeks, and jaw move with the meaning — thinking, emphasizing, a live half-smile. After the last syllable the mouth closes but the face stays engaged.";

function talkingBodyRules(shot: TalkingShot) {
  if (shot === "full-body") {
    return [
      "Head keeps moving: small tilts left and right, nods on stressed words, a chin drop then lift. Never look away from the lens.",
      "Hands keep moving at chest height: one hand then the other, open-palm explain, a small count. Never freeze both arms at the sides. Never a greeting wave. Never a finger jab at the lens.",
      "Whole body keeps moving: weight shifts hip to hip, a slight torso sway, one knee soft. Feet stay in frame. Not marching, not standing at attention.",
    ].join(" ");
  }
  return [
    "The character stays seated. One hand holds a small homemade microphone — a thin stick with a fluffy fuzzy windscreen — near the mouth the whole time. The mic hand may tip it a little on a stressed word, then bring it back. Never put the mic down. Never a greeting wave. Never a finger jab at the lens.",
    "Head keeps moving: small tilts, nods on stressed words, a chin drop then lift. Never look away from the lens.",
    "Upper body keeps moving: shoulders rock, a small lean in on the point, then settle back into the seat. Do not freeze the neck and shoulders. Do not stand up.",
  ].join(" ");
}

export function talkingVideoMotionRules(shot: TalkingShot) {
  return [
    "This clip is on-camera speech, like a real person recording a reel, not a snap action and not a frozen pose.",
    TALKING_FACE_LOCK,
    talkingBodyRules(shot),
    "Do not write snaps, flicks, whips, or pops for the face or body. Speech is conversational and sustained through the line. Camera locked.",
  ].join(" ");
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
  belowCenter?: boolean;
}) {
  const close = speakEnd(input.seconds);
  const hand = leadHand(input.clipNumber);
  const other = hand === "right" ? "left" : "right";
  if (input.language === "en" || !input.language) {
    const place = input.belowCenter ? "a little below the vertical center" : "at the bottom";
    const subtitle = input.previousLine
      ? `Subtitle ${place} changes from "${input.previousLine}" to "${input.line}".`
      : `Subtitle stays ${place}: "${input.line}".`;
    const seated = input.shot !== "full-body";
    const body = seated
      ? `speaks "${input.line}" with continuous lip-sync, a live real-person face, seated the whole time, head tilting and nodding on the stresses, shoulders rocking, the ${hand} hand keeping a small homemade microphone near the mouth`
      : `speaks "${input.line}" with continuous lip-sync, a live reel-person face, head tilting and nodding on the stresses, the ${hand} then ${other} hand gesturing at chest height, and weight shifting hip to hip; feet stay in frame`;
    const open = seated
      ? "0–0.4s she inhales, blinks once, seated, eyes locked on the lens, the homemade microphone already near her mouth, mouth opening"
      : "0–0.4s she inhales, blinks once, eyes locked on the lens as if talking into a phone, head already tilting, mouth opening";
    const closeBeat = seated
      ? "the homemade microphone stays near the mouth, the body still has a little residual sway"
      : "the raised hand settles, the body still has a little residual sway";
    return `${open}; 0.4–${close}s she ${body}; ${close}–${input.seconds}s the mouth closes into an engaged small smile, ${closeBeat}; camera locked. ${subtitle}`;
  }
  const place = input.belowCenter ? "中線下面少少嘅字幕" : "底部字幕";
  const subtitle = input.previousLine
    ? `${place}由「${input.previousLine}」換成「${input.line}」。`
    : `${place}保持「${input.line}」。`;
  const zhHand = hand === "right" ? "右手" : "左手";
  const zhOther = hand === "right" ? "左手" : "右手";
  const seated = input.shot !== "full-body";
  const body = seated
    ? `坐住唔起身，口型跟住講「${input.line}」，神情似真人喺屋企拍手機片，頭部左右傾同重音位點頭，膊頭郁，${zhHand}拎住自製咪（幼棒加毛毛防風罩）靠近個口`
    : `口型跟住講「${input.line}」，神情似真人拍 Reel，頭部左右傾同重音位點頭，${zhHand}再${zhOther}喺胸前比畫，重心左右移；頭到腳留喺畫面`;
  const open = seated
    ? "0–0.4s 坐住、吸一口氣、眨眼、直望鏡頭、自製咪已經靠近個口、準備開口"
    : "0–0.4s 吸一口氣、眨眼、直望鏡頭好似對住手機講、頭已經微傾、準備開口";
  const closeBeat = seated ? "自製咪仍然靠近個口，身體仲有少少餘勢" : "手慢慢放下，身體仲有少少餘勢";
  return `${open}；0.4–${close}s ${body}；${close}–${input.seconds}s 口部合上變成有神嘅淺笑，${closeBeat}；鏡頭鎖定。${subtitle}`;
}
