import type { CharacterVoice } from "@/model/character-voice";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { isOutfitReelSkill } from "@/service/director/skill-rules";
import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";
import { OUTFIT_VIDEO_MOTION_RULES } from "@/service/director/outfit-reel";
import { clampClipSeconds } from "@/service/director/keyframe-delta";
import { phaseBAudioLock } from "@/service/director/voice";
import type { PhaseAProposal, SpeechPace, VoiceGender } from "@/model/project";
import {
  clipUsesTalkingPerformance,
  talkingShotForSkill,
  talkingVideoMotionRules,
} from "@/service/director/talking-performance";

// Director-only note. Do not pass character sheet URLs — MiniMax H3 only
// receives this clip's first and last frames.
export function phaseBCharacterLine(input: {
  cast?: Array<{ name: string }>;
  characterImageUrl?: string;
  skillSlug?: string;
}) {
  const names = input.cast?.map((member) => member.name).filter(Boolean).join(", ");
  if (names && isOutfitReelSkill(input.skillSlug)) {
    return `Keep ${names}'s face, hair, and proportions as in the first and last frames. The outfit is already complete in both frames and must stay identical, including style and colour. Do not dress her. Do not mention reference images or reference sheets — MiniMax H3 only receives this clip's first and last frames.`;
  }
  if (names) {
    return `Keep ${names} identical to Phase A characterLock. Do not mention reference images or reference sheets in the MiniMax H3 prompt — MiniMax H3 only receives this clip's first and last frames. Never describe clothing, wardrobe, or gear (no "winter coat", "boots", "backpack"); say only that the outfit stays exactly as in the first and last frames.`;
  }
  return "Keep the Phase A characterLock. Do not mention reference images in the MiniMax H3 prompt — MiniMax H3 only receives this clip's first and last frames.";
}

// Appended to every clip video prompt that has a cast or character image.
export function phaseBWardrobeLock(input: {
  cast?: Array<{ name: string }>;
  characterImageUrl?: string;
  skillSlug?: string;
}) {
  if (!input.cast?.length && !input.characterImageUrl) return "";
  if (isOutfitReelSkill(input.skillSlug)) {
    return "Wardrobe: both frames already show the complete outfit from the clothing reference, same style and colour. Nothing goes on or comes off during the clip. Do not change face or hair.";
  }
  return "Wardrobe: every character keeps exactly the outfit shown in the first and last frames for the whole clip. No added or changed clothing, layers, or gear.";
}

// Dual-beat stills always carry startVo / endVo marker lettering, so the video
// must swap it at the midpoint rather than erase it as a "caption".
export function phaseBLetteringLock(input: { skillSlug: string; durationSeconds: number }) {
  if (!isDualBeatSkill(input.skillSlug)) return "";
  const midpoint = clampClipSeconds(input.durationSeconds) / 2;
  return `On-canvas lettering: the marker line drawn in the first frame stays until about ${midpoint}s, then wipes off and the marker line drawn in the last frame writes on in the same spot. Keep both lines exactly as the frames show; this is in-scene lettering from the keyframes, not a caption or subtitle.`;
}

// User prompt asking the director for ONE clip's video prompt. The whole
// approved Phase A is included for context; the neighbouring rows are quoted
// explicitly so the motion hands off cleanly between independently generated clips.
export function clipPhaseBUserPrompt(input: {
  phaseA: PhaseAProposal;
  clipNumber: number;
  languageLabel: string;
  languageSublabel: string;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  bansNarration?: boolean;
  speakers?: Array<{ name: string; voice?: CharacterVoice | null }>;
  characterLine: string;
  skillSlug?: string;
}) {
  const rows = input.phaseA.clips;
  const index = rows.findIndex((row) => row.clipNumber === input.clipNumber);
  if (index < 0) throw new Error(`找不到 clip ${input.clipNumber}`);
  const row = rows[index];
  const prev = rows[index - 1];
  const next = rows[index + 1];

  const opening = prev
    ? isOutfitReelSkill(input.skillSlug)
      ? `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene}. The outfit stays the same. This clip is a hard cut to a DIFFERENT camera move. Open on THIS clip's START frame.`
      : `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene} (${prev.motionCamera}). Start from that resting state.`
    : "It is the first clip; open cold on the START frame.";
  const closing = next
    ? isOutfitReelSkill(input.skillSlug)
      ? `The next clip will hard-cut to a different camera move. End this clip on its own end camera. No voice. No background music.`
      : `It hands off to clip ${next.clipNumber}, which opens with: ${next.explainerScene}. End on a state that leads into it.`
    : "It is the last clip; end on a clean resting payoff. Do not bridge back to clip 1 or plan a seamless loop.";

  return [
    `Approved Phase A JSON:\n${JSON.stringify(input.phaseA, null, 2)}`,
    `${input.bansNarration ? "Dialogue language" : "Voiceover language"}: ${input.languageLabel} (${input.languageSublabel})`,
    phaseBAudioLock({
      voiceGender: input.voiceGender,
      languageLabel: input.languageLabel,
      bansNarration: input.bansNarration,
      speechPace: input.speechPace,
      speakers: input.speakers,
    }),
    input.characterLine,
    `Write the Phase B video prompt for clip ${row.clipNumber} ONLY (${row.timeRange}, ${row.durationSeconds}s).`,
    clipUsesTalkingPerformance(input.skillSlug)
      ? talkingVideoMotionRules(talkingShotForSkill(input.skillSlug) ?? "face")
      : isOutfitReelSkill(input.skillSlug)
        ? OUTFIT_VIDEO_MOTION_RULES
        : DUAL_KEYFRAME_MOTION_RULES,
    opening,
    closing,
    "Return a single object { clipNumber, durationSeconds, prompt }.",
  ].join("\n\n");
}
