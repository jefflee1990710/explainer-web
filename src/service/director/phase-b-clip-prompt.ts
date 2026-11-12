import type { CharacterVoice } from "@/model/character-voice";
import type { PerformanceSlots } from "@/model/director-performance";
import { CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE } from "@/service/director/camera-first-prompt";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { firstClipHookPerformanceVideoLine } from "@/service/director/hook-title";
import { getDirectorRuleModule } from "@/service/director/rules";
import { isOutfitChangeSkill, isOutfitReelSkill, isSilentOutfitSkill } from "@/service/director/skill-rules";
import { isSurpriseInterviewSkill } from "@/service/director/clip-continuity";
import { surpriseVarietyPlan } from "@/service/director/surprise-interview";
import { clampClipSeconds } from "@/service/director/keyframe-delta";
import { spatialBlockingLockParagraph } from "@/service/higgsfield/object-sheet";
import { phaseBAudioLock } from "@/service/director/voice";
import type { PhaseAProposal, SpeechPace, VoiceGender } from "@/model/project";
import { clipUsesTalkingPerformance } from "@/service/director/talking-performance";

// Director-only note. Do not pass character sheet URLs — MiniMax H3 only
// receives this clip's first and last frames.
export function phaseBCharacterLine(input: {
  cast?: Array<{ name: string }>;
  characterImageUrl?: string;
  skillSlug?: string;
}) {
  const names = input.cast?.map((member) => member.name).filter(Boolean).join(", ");
  if (names && isOutfitChangeSkill(input.skillSlug)) {
    return `Keep ${names}'s face, hair, and proportions as in the first and last frames. THIS clip's look is already complete in both frames and must stay identical, including style and colour. Do not dress her. Do not keep the previous clip's clothes. Do not mention reference images or reference sheets — MiniMax H3 only receives this clip's first and last frames.`;
  }
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
  if (isOutfitChangeSkill(input.skillSlug)) {
    return "Wardrobe: this clip's frames already show THIS clip's complete look from its clothing reference, same style and colour. Nothing goes on or comes off during the clip. Do not keep the previous clip's clothes. Do not change face or hair.";
  }
  if (isOutfitReelSkill(input.skillSlug)) {
    return "Wardrobe: both frames already show the complete outfit from the clothing reference, same style and colour. Nothing goes on or comes off during the clip. Do not change face or hair.";
  }
  return "Wardrobe: every character keeps exactly the outfit shown in the first and last frames for the whole clip. No added or changed clothing, layers, or gear.";
}

// Dual-beat stills carry marker lettering. Diagram explainers draw the explanation
// once on the start still and keep those words; other dual-beat clips may swap at the midpoint.
export function phaseBLetteringLock(input: {
  skillSlug: string;
  durationSeconds: number;
  // Cinematic realistic: the start frame carries the whole line, and nothing is swapped.
  fixedLettering?: boolean;
}) {
  if (!isDualBeatSkill(input.skillSlug)) return "";
  if (isDiagramExplainerSkill(input.skillSlug)) {
    return "On-canvas lettering: the start frame already draws the explanation. Keep those exact words sharp and in the same place for the whole clip. Do not morph, erase, rewrite, or duplicate that explanation. Do not paint a second copy on an end frame. This is board lettering, not a caption or subtitle.";
  }
  if (input.fixedLettering) {
    return "On-canvas lettering: the start frame carries the marker line and it stays exactly as drawn for the whole clip: no wipe, no rewrite, no new words. There is no end frame to match. This is in-scene lettering from the keyframe, not a caption or subtitle.";
  }
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
  // Resolved talking-head performance slots (English). Default set when omitted.
  performance?: PerformanceSlots;
  // Cinematic realistic whiteboard: accelerate through the change, then decelerate.
  smoothMotion?: boolean;
  // Cinematic realistic style: use live-action physics for non-whiteboard skills.
  realistic?: boolean;
}) {
  const rows = input.phaseA.clips;
  const index = rows.findIndex((row) => row.clipNumber === input.clipNumber);
  if (index < 0) throw new Error(`找不到 clip ${input.clipNumber}`);
  const row = rows[index];
  const prev = rows[index - 1];
  const next = rows[index + 1];

  const surprise = isSurpriseInterviewSkill(input.skillSlug);
  const opening = prev
    ? isOutfitChangeSkill(input.skillSlug)
      ? `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene}. This clip is a hard cut to a DIFFERENT complete look. Same locked camera, same empty room. Open on THIS clip's START frame.`
      : isOutfitReelSkill(input.skillSlug)
      ? `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene}. The outfit stays the same. This clip is a hard cut to a DIFFERENT camera move. Open on THIS clip's START frame.`
      : surprise
        ? `Open on clip ${prev.clipNumber}'s end still. Same camera angle, same crop, same body pose. Only the mouth and vivid, expressive facial expressions move.`
        : `It follows clip ${prev.clipNumber}, which ends on: ${prev.explainerScene} (${prev.motionCamera}). Start from that resting state.`
    : "It is the first clip; open cold on the START frame.";
  const closing = next
    ? isOutfitChangeSkill(input.skillSlug)
      ? `The next clip will hard-cut to a different complete look. End this clip on the same locked camera. No voice. No background music.`
      : isOutfitReelSkill(input.skillSlug)
      ? `The next clip will hard-cut to a different camera move. End this clip on its own end camera. No voice. No background music.`
      : surprise
        ? `The next clip opens on this clip's end still. Keep this angle and pose. Do not hard-cut to a new setup.`
        : `It hands off to clip ${next.clipNumber}, which opens with: ${next.explainerScene}. End on a state that leads into it.`
    : "It is the last clip; end on a clean resting payoff. Do not bridge back to clip 1 or plan a seamless loop.";

  const silent = isSilentOutfitSkill(input.skillSlug);
  // Missing slug still resolves to the cartoon explainer module, so treat that fallback the same.
  const diagramExplainer =
    isDiagramExplainerSkill(input.skillSlug) ||
    isDiagramExplainerSkill(getDirectorRuleModule(input.skillSlug).slug);
  return [
    `Approved Phase A JSON:\n${JSON.stringify(input.phaseA, null, 2)}`,
    `${input.bansNarration ? "Dialogue language" : "Voiceover language"}: ${input.languageLabel} (${input.languageSublabel})`,
    phaseBAudioLock({
      voiceGender: input.voiceGender,
      languageLabel: input.languageLabel,
      bansNarration: input.bansNarration,
      speechPace: input.speechPace,
      speakers: input.speakers,
      silent,
      noSfx: true,
    }),
    input.characterLine,
    spatialBlockingLockParagraph(input.phaseA),
    `Write the Phase B video prompt for clip ${row.clipNumber} ONLY (${row.timeRange}, ${row.durationSeconds}s).`,
    diagramExplainer
      ? "BOARD CAMERA: describe the board camera first. Do not point it at the character's face. On every clip, including Clip 1, the character's eyes and hands stay on the teaching element (point, tap, place, slide, flip, or pick up). Never walk toward the lens, never look into the lens, and never turn the face toward the camera. Lips and jaw stay sealed. No lip-sync and no greeting wave."
      : CAMERA_FIRST_AND_RELATIVE_DIRECTION_RULE,
    getDirectorRuleModule(input.skillSlug).phaseBMotionRules({
      smoothMotion: Boolean(input.smoothMotion),
      realistic: Boolean(input.realistic),
      clipNumber: row.clipNumber,
      place: surprise
        ? surpriseVarietyPlan(input.phaseA).find((item) => item.clipNumber === row.clipNumber)?.place
        : undefined,
      performance: input.performance,
    }),
    opening,
    row.clipNumber === 1
      ? firstClipHookPerformanceVideoLine(
          Boolean(input.realistic),
          !input.bansNarration && !clipUsesTalkingPerformance(input.skillSlug),
          diagramExplainer,
        )
      : "",
    closing,
    input.bansNarration && !silent
      ? 'Mouth: only the character named in this clip\'s englishVo lip-syncs every syllable of their line with vivid, expressive facial acting. Every other on-screen character keeps their mouth closed and only reacts with expressive facial expressions. Paste each supplied voice lock verbatim. Do not invent a timbre.'
      : "",
    "Return a single object { clipNumber, durationSeconds, prompt }.",
  ].join("\n\n");
}
