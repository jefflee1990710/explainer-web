import { generateText, Output } from "ai";
import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { PHASE_B_DETAIL_RULES } from "@/service/director/scene-detail";
import {
  cartoonClipAction,
  cartoonNarratorVideoLock,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
  skillBansNarration,
} from "@/service/director/skill-rules";
import { lockedSpeakerLines } from "@/service/director/character-voice";
import { finalizePhaseBPrompt, phaseBAudioLock, resolveVoiceGender, VOICE_PRESETS } from "@/service/director/voice";
import { skillPromptForPhaseB } from "@/service/director/load-skill-prompt";
import { directorModel } from "@/service/director/model";
import {
  clipPhaseBUserPrompt,
  phaseBCharacterLine,
  phaseBLetteringLock,
  phaseBWardrobeLock,
} from "@/service/director/phase-b-clip-prompt";
import { phaseBClipSchema } from "@/model/director";
import type { StylePromptSlice } from "@/service/style";
import type { CastMember } from "@/model/character";
import type { PhaseAProposal, PhaseBPrompt, SpeechPace, VoLanguage, VoiceGender } from "@/model/project";
import { speechPaceDelivery } from "@/service/director/speech-pace";
import type { Skill } from "@/model/skill";
import { isTalkingHeadSkill } from "@/service/director/talking-head";
import {
  OUTFIT_COVERED_SWAP,
  OUTFIT_VIDEO_MOTION_RULES,
  rewriteOutfitSafetyText,
} from "@/service/director/outfit-reel";
import { SURPRISE_HOOK_VIDEO_RULES } from "@/service/director/surprise-interview";
import {
  talkingShotForSkill,
  talkingVideoMotionRules,
} from "@/service/director/talking-performance";

type PhaseBInput = {
  skill: Skill;
  style: StylePromptSlice;
  phaseA: PhaseAProposal;
  language?: VoLanguage;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  characterImageUrl?: string;
  cast?: CastMember[];
};

// Shared director contract for video prompts (batch and per-clip).
function phaseBSystemPrompt(input: PhaseBInput, languageLabel: string, languageSublabel: string) {
  return `${skillPromptForPhaseB(input.skill, input.style)}

You are executing Phase B only after explicit approval of the current Phase A.
Return standalone MiniMax H3 video prompts that follow the skill prompt contract. Do not invent new facts.
Each clip is dual-keyframe image-to-video: the approved START image is already attached as the first frame and the approved END image is already attached as the last frame. Describe only the motion that interpolates between those two locked images. Never call those stills a reference image. ${
    isTalkingHeadSkill(input.skill.slug)
      ? talkingVideoMotionRules(talkingShotForSkill(input.skill.slug) ?? "face")
      : isOutfitReelSkill(input.skill.slug)
        ? OUTFIT_VIDEO_MOTION_RULES
        : isSurpriseInterviewSkill(input.skill.slug)
          ? SURPRISE_HOOK_VIDEO_RULES
          : DUAL_KEYFRAME_MOTION_RULES
  } Do not invent a different final pose, camera, or composition.
${PHASE_B_DETAIL_RULES}
${
    isOutfitReelSkill(input.skill.slug)
      ? "This director is silent. Do not write a spoken line, a narrator, or lip-sync. No background music. One sound effect only."
      : `Spoken lines in every prompt must be quoted verbatim from the approved englishVo field, which is in ${languageLabel} (${languageSublabel}).`
  } ${
    isOutfitReelSkill(input.skill.slug)
      ? "Do not copy a narrator voice."
      : lockedSpeakerLines(input.cast).length
        ? "Copy each character voice lock verbatim into every clip prompt. Do not invent or rephrase a timbre from the look."
        : `Copy the locked adult ${VOICE_PRESETS[resolveVoiceGender(input.voiceGender)].en} voice fingerprint verbatim into every clip prompt. Do not invent a timbre from the look or the keyframes.`
  } ${cartoonNarratorVideoLock(input.skill.slug, { hasCharacter: Boolean(input.cast?.length || input.characterImageUrl) })} ${
    isOutfitReelSkill(input.skill.slug) ? "" : `Every speaker delivers at a ${speechPaceDelivery(input.speechPace)}. `
  }Never request background music, BGM, a musical score, or an underscore. ${
    isOutfitReelSkill(input.skill.slug) ? "Sound effects only. No voice." : "Voice and short synced SFX only."
  }`;
}

function characterLine(input: PhaseBInput) {
  return phaseBCharacterLine({
    cast: input.cast,
    characterImageUrl: input.characterImageUrl,
    skillSlug: input.skill.slug,
  });
}

// Per-clip Phase B: one video prompt, with the neighbouring clips as hand-off context.
export async function runPhaseBForClip(
  input: PhaseBInput & { clipNumber: number },
): Promise<PhaseBPrompt> {
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: phaseBClipSchema }),
    system: phaseBSystemPrompt(input, language.label, language.sublabel),
    prompt: clipPhaseBUserPrompt({
      phaseA: input.phaseA,
      clipNumber: input.clipNumber,
      languageLabel: language.label,
      languageSublabel: language.sublabel,
      voiceGender: input.voiceGender,
      speechPace: input.speechPace,
      bansNarration: skillBansNarration(input.skill.slug),
      speakers: input.cast,
      characterLine: characterLine(input),
      skillSlug: input.skill.slug,
    }),
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  const lock = phaseBAudioLock({
    voiceGender: input.voiceGender,
    languageLabel: language.label,
    bansNarration: skillBansNarration(input.skill.slug),
    speechPace: input.speechPace,
    speakers: input.cast,
    silent: isOutfitReelSkill(input.skill.slug),
  });
  const row = input.phaseA.clips.find((clip) => clip.clipNumber === input.clipNumber);
  // Audio, narrator, wardrobe, and lettering locks ride on every clip; empty locks are skipped.
  // Rewrite the model action first so "Never pull" locks appended below stay intact.
  const modelPrompt = isOutfitReelSkill(input.skill.slug)
    ? rewriteOutfitSafetyText(output.prompt)
    : output.prompt;
  const prompt = [
    lock,
    cartoonNarratorVideoLock(input.skill.slug, {
      hasCharacter: Boolean(input.cast?.length || input.characterImageUrl),
      action: cartoonClipAction(row?.motionCamera),
    }),
    phaseBWardrobeLock({
      cast: input.cast,
      characterImageUrl: input.characterImageUrl,
      skillSlug: input.skill.slug,
    }),
    phaseBLetteringLock({
      skillSlug: input.skill.slug,
      durationSeconds: row?.durationSeconds ?? output.durationSeconds,
    }),
    isOutfitReelSkill(input.skill.slug) ? OUTFIT_COVERED_SWAP : "",
  ]
    .filter(Boolean)
    .reduce(finalizePhaseBPrompt, modelPrompt);
  // The model may echo a wrong number; trust the caller.
  return {
    ...output,
    clipNumber: input.clipNumber,
    prompt,
  };
}
