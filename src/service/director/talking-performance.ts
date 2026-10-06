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

export const TALKING_FACE_LOCK =
  "On-camera speech: eyes stay on the lens. The mouth articulates every syllable of the spoken line with visible lip-sync, never a frozen smile. Soft natural blinks. Eyebrows lift slightly on the stressed word. After the last syllable the mouth closes into a warm small smile.";

export function talkingVideoMotionRules(shot: TalkingShot) {
  const gesture =
    shot === "full-body"
      ? "Feet stay planted. One conversational gesture only: one hand rises to waist height with an open palm, then settles toward the end still. Never a greeting wave, never both hands up, never a finger jab at the lens."
      : "Shoulders stay quiet. Hands stay out of frame or still. No greeting wave.";
  return [
    "This clip is on-camera speech, not a snap action.",
    TALKING_FACE_LOCK,
    "Head: one small affirmative nod on the first stressed word, then a tiny settle. No look-away.",
    gesture,
    "Do not write snaps, flicks, whips, or pops for the face or body. Speech is conversational and sustained through the line.",
  ].join(" ");
}

function speakEnd(seconds: number) {
  return Math.max(seconds - 0.8, Math.round(seconds * 0.7 * 10) / 10);
}

function gestureHand(clipNumber?: number) {
  return (clipNumber ?? 1) % 2 === 1 ? "right" : "left";
}

export function talkingMotionLine(input: {
  language?: VoLanguage;
  seconds: number;
  line: string;
  previousLine?: string;
  shot: TalkingShot;
  clipNumber?: number;
}) {
  const close = speakEnd(input.seconds);
  const hand = gestureHand(input.clipNumber);
  if (input.language === "en" || !input.language) {
    const subtitle = input.previousLine
      ? `Bottom subtitle changes from "${input.previousLine}" to "${input.line}".`
      : `Bottom subtitle stays "${input.line}".`;
    const body =
      input.shot === "full-body"
        ? `speaks "${input.line}" with continuous lip-sync, a small nod on the first stressed word, a slight eyebrow lift, and the ${hand} hand rising to waist height with an open palm; feet stay planted`
        : `speaks "${input.line}" with continuous lip-sync, a small nod on the first stressed word, and a slight eyebrow lift`;
    return `0–0.4s she inhales, blinks once, eyes on the lens, mouth opening; 0.4–${close}s she ${body}; ${close}–${input.seconds}s the mouth closes into a warm small smile and the motion settles; camera locked. ${subtitle}`;
  }
  const subtitle = input.previousLine
    ? `底部字幕由「${input.previousLine}」換成「${input.line}」。`
    : `底部字幕保持「${input.line}」。`;
  const body =
    input.shot === "full-body"
      ? `口型跟住講「${input.line}」，重音位置輕微點頭、眉眼微抬，${hand === "right" ? "右手" : "左手"}喺腰際攤掌；頭到腳留喺畫面`
      : `口型跟住講「${input.line}」，重音位置輕微點頭、眉眼微抬`;
  return `0–0.4s 吸一口氣、眨眼、望住鏡頭準備開口；0.4–${close}s ${body}；${close}–${input.seconds}s 口部合上變成溫暖淺笑，動作收定；鏡頭鎖定。${subtitle}`;
}
