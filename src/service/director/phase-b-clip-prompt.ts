import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";
import { phaseBAudioLock } from "@/service/director/voice";
import type { PhaseAProposal, SpeechPace, VoiceGender } from "@/model/project";

// Director-only note. Do not pass character sheet URLs — MiniMax H3 only
// receives this clip's first and last frames.
export function phaseBCharacterLine(input: {
  cast?: Array<{ name: string }>;
  characterImageUrl?: string;
}) {
  const names = input.cast?.map((member) => member.name).filter(Boolean).join(", ");
  if (names) {
    return `Keep ${names} identical to Phase A characterLock. Do not mention reference images or reference sheets in the MiniMax H3 prompt — MiniMax H3 only receives this clip's first and last frames. Never describe clothing, wardrobe, or gear (no "winter coat", "boots", "backpack"); say only that the outfit stays exactly as in the first and last frames.`;
  }
  return "Keep the Phase A characterLock. Do not mention reference images in the MiniMax H3 prompt — MiniMax H3 only receives this clip's first and last frames.";
}

// Appended to every clip video prompt that has a cast or character image.
export function phaseBWardrobeLock(input: {
  cast?: Array<{ name: string }>;
  characterImageUrl?: string;
}) {
  if (!input.cast?.length && !input.characterImageUrl) return "";
  return "Wardrobe: every character keeps exactly the outfit shown in the first and last frames for the whole clip. No added or changed clothing, layers, or gear.";
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
  characterLine: string;
}) {
  const rows = input.phaseA.clips;
  const index = rows.findIndex((row) => row.clipNumber === input.clipNumber);
  if (index < 0) throw new Error(`找不到 clip ${input.clipNumber}`);
  const row = rows[index];
  const prev = rows[index - 1];
  const next = rows[index + 1];

  const opening = prev
    ? `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene} (${prev.motionCamera}). Start from that resting state.`
    : "It is the first clip; open cold on the START frame.";
  const closing = next
    ? `It hands off to clip ${next.clipNumber}, which opens with: ${next.explainerScene}. End on a state that leads into it.`
    : "It is the last clip; end on a clean resting payoff. Do not bridge back to clip 1 or plan a seamless loop.";

  return [
    `Approved Phase A JSON:\n${JSON.stringify(input.phaseA, null, 2)}`,
    `${input.bansNarration ? "Dialogue language" : "Voiceover language"}: ${input.languageLabel} (${input.languageSublabel})`,
    phaseBAudioLock({
      voiceGender: input.voiceGender,
      languageLabel: input.languageLabel,
      bansNarration: input.bansNarration,
      speechPace: input.speechPace,
    }),
    input.characterLine,
    `Write the Phase B video prompt for clip ${row.clipNumber} ONLY (${row.timeRange}, ${row.durationSeconds}s).`,
    DUAL_KEYFRAME_MOTION_RULES,
    opening,
    closing,
    "Return a single object { clipNumber, durationSeconds, prompt }.",
  ].join("\n\n");
}
