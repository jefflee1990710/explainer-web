import { generateText, Output } from "ai";
import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { PHASE_B_DETAIL_RULES } from "@/service/director/scene-detail";
import {
  cartoonClipAction,
  cartoonNarratorVideoLock,
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
Each clip is dual-keyframe image-to-video: the approved START image is already attached as the first frame and the approved END image is already attached as the last frame. Describe only the motion that interpolates between those two locked images. Never call those stills a reference image. ${DUAL_KEYFRAME_MOTION_RULES} Do not invent a different final pose, camera, or composition.
${PHASE_B_DETAIL_RULES}
Spoken lines in every prompt must be quoted verbatim from the approved englishVo field, which is in ${languageLabel} (${languageSublabel}). ${
    skillBansNarration(input.skill.slug)
      ? lockedSpeakerLines(input.cast).length
        ? "There is no narrator. Characters speak those lines. Copy each character voice lock verbatim. Do not invent or rephrase a timbre."
        : "There is no narrator. Characters speak those lines. Do not copy a male/female narrator fingerprint. Infer each NAME's voice from that character in the keyframes."
      : `Copy the locked adult ${VOICE_PRESETS[resolveVoiceGender(input.voiceGender)].en} voice fingerprint verbatim into every clip prompt. Do not invent a new narrator.`
  } ${cartoonNarratorVideoLock(input.skill.slug, { hasCharacter: Boolean(input.cast?.length || input.characterImageUrl) })} Every speaker delivers at a ${speechPaceDelivery(input.speechPace)}. Never request background music, BGM, a musical score, or an underscore. Voice and short synced SFX only.`;
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
  });
  const row = input.phaseA.clips.find((clip) => clip.clipNumber === input.clipNumber);
  // Audio, narrator, wardrobe, and lettering locks ride on every clip; empty locks are skipped.
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
  ]
    .filter(Boolean)
    .reduce(finalizePhaseBPrompt, output.prompt);
  // The model may echo a wrong number; trust the caller.
  return {
    ...output,
    clipNumber: input.clipNumber,
    prompt,
  };
}
