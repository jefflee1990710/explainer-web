import { generateText, Output } from "ai";
import {
  DUAL_KEYFRAME_GLIDE_RULES,
  DUAL_KEYFRAME_MOTION_RULES,
  REALISTIC_SINGLE_FRAME_MOTION_RULES,
} from "@/service/director/dual-keyframe-motion";
import { clipSkipsEndStill } from "@/service/director/steady-stills";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { phaseBDetailRules } from "@/service/director/scene-detail";
import { isRealisticStyle } from "@/service/style/realistic-light";
import {
  cartoonClipAction,
  cartoonNarratorVideoLock,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
  skillBansNarration,
} from "@/service/director/skill-rules";
import { isDualBeatSkill } from "@/service/director/dual-beat";
import { lockedSpeakerLines } from "@/service/director/character-voice";
import { lockDialogueSpeech } from "@/service/director/spoken-line";
import { finalizePhaseBPrompt, phaseBAudioLock, resolveVoiceGender, VOICE_PRESETS } from "@/service/director/voice";
import { skillPromptForPhaseB } from "@/service/director/load-skill-prompt";
import { directorModel } from "@/service/director/model";
import {
  clipPhaseBUserPrompt,
  phaseBCharacterLine,
  phaseBWardrobeLock,
} from "@/service/director/phase-b-clip-prompt";
import { phaseBClipSchema } from "@/model/director";
import type { StylePromptSlice } from "@/service/style";
import type { CastMember } from "@/model/character";
import type { PhaseAProposal, PhaseBPrompt, SpeechPace, VoLanguage, VoiceGender } from "@/model/project";
import { speechPaceDelivery } from "@/service/director/speech-pace";
import type { Skill } from "@/model/skill";
import { resolvePerformance } from "@/service/director/performance";
import { isTalkingHeadSkill, TALKING_HEAD_SKILL_SLUG, talkingHeadPhaseBPrompt } from "@/service/director/talking-head";
import { NO_ONSCREEN_WRITING, storyboardAsksForSubtitle } from "@/service/director/scene-text";
import {
  OUTFIT_COVERED_SWAP,
  OUTFIT_VIDEO_MOTION_RULES,
  rewriteOutfitSafetyText,
} from "@/service/director/outfit-reel";
import { SURPRISE_VARIETY_VIDEO_RULES } from "@/service/director/surprise-interview";
import {
  talkingShotForSkill,
  talkingVideoMotionRules,
} from "@/service/director/talking-performance";

type PhaseBInput = {
  skill: Skill;
  style: StylePromptSlice & { id?: string; name?: string; baseStyleId?: string };
  phaseA: PhaseAProposal;
  language?: VoLanguage;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  characterImageUrl?: string;
  cast?: CastMember[];
  // Talking-head read: the end still shows the next clip's subtitle.
  subtitleHandoff?: boolean;
  // Brief chose None. Video prompts must not ask for writing.
  sceneTextOff?: boolean;
};

// Shared director contract for video prompts (batch and per-clip).
function phaseBSystemPrompt(input: PhaseBInput, languageLabel: string, languageSublabel: string) {
  const steady = clipSkipsEndStill({ skillSlug: input.skill.slug, styleId: input.style.id });
  const realistic = isRealisticStyle(input.style);
  return `${skillPromptForPhaseB(input.skill, input.style)}

You are executing Phase B only after explicit approval of the current Phase A.
Return standalone video prompts that follow the skill prompt contract. Do not invent new facts.
${
  steady
    ? "Each clip is image-to-video from the approved START image only. That image is attached as the first frame. There is no end image. Reply with the start scene and the camera motion. endScene is the landing the motion reaches; write that landing into the motion, and do not treat it as a frame the model can see."
    : "Each clip is dual-keyframe image-to-video: the approved START image is already attached as the first frame and the approved END image is already attached as the last frame. Describe only the motion that interpolates between those two locked images. Never call those stills a reference image."
} ${
    isTalkingHeadSkill(input.skill.slug)
      ? talkingVideoMotionRules(
          talkingShotForSkill(input.skill.slug) ?? "face",
          resolvePerformance(input.skill, talkingShotForSkill(input.skill.slug) ?? "face", "en"),
        )
      : isOutfitReelSkill(input.skill.slug)
        ? OUTFIT_VIDEO_MOTION_RULES
        : isSurpriseInterviewSkill(input.skill.slug)
          ? SURPRISE_VARIETY_VIDEO_RULES
          : steady && realistic && !isDualBeatSkill(input.skill.slug)
            ? REALISTIC_SINGLE_FRAME_MOTION_RULES
            : steady
              ? DUAL_KEYFRAME_GLIDE_RULES
              : DUAL_KEYFRAME_MOTION_RULES
  } Do not invent a different final pose, camera, or composition.
${phaseBDetailRules({ realistic })}
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
  } ${cartoonNarratorVideoLock(input.skill.slug, {
    hasCharacter: Boolean(input.cast?.length || input.characterImageUrl),
    smoothMotion: steady,
  })} ${
    isOutfitReelSkill(input.skill.slug) ? "" : `Every speaker delivers at a ${speechPaceDelivery(input.speechPace)}. `
  }${
    input.sceneTextOff
      ? "On-screen text is OFF. Do not ask for letters, subtitles, captions, signs, labels, or numbers. The picture stays free of writing. "
      : ""
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
  const talkingHead = isTalkingHeadSkill(input.skill.slug);
  // All non-talking-head directors generate video from the start still + camera motion only.
  const steady = clipSkipsEndStill({ skillSlug: input.skill.slug, styleId: input.style.id });
  let output = talkingHead
    ? talkingHeadPhaseBPrompt({
        phaseA: input.phaseA,
        clipNumber: input.clipNumber,
        language: input.language,
        subtitleHandoff:
          input.subtitleHandoff === true && input.skill.slug === TALKING_HEAD_SKILL_SLUG,
      })
    : undefined;
  if (talkingHead && !output) {
    throw new Error("口播鏡頭缺少動作描述，請重新生成分鏡。");
  }
  if (!output) {
    const generated = await generateText({
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
        performance: resolvePerformance(input.skill, talkingShotForSkill(input.skill.slug) ?? "face", "en"),
        smoothMotion: steady,
        realistic: isRealisticStyle(input.style),
      }),
    });
    // Avoid NoOutputGeneratedError on `.output` when the model returns nothing or is filtered.
    if (generated.finishReason === "stop") {
      output = generated.output ?? undefined;
    }
    if (!output) {
      if (generated.finishReason === "content-filter") {
        throw new Error("這次題材被模型拒絕，請改寫場景描述後再試。");
      }
      throw new Error("產片 prompt 產生失敗");
    }
  }
  const lock = phaseBAudioLock({
    voiceGender: input.voiceGender,
    languageLabel: language.label,
    bansNarration: skillBansNarration(input.skill.slug) || talkingHead,
    speechPace: input.speechPace,
    speakers: input.cast,
    silent: isOutfitReelSkill(input.skill.slug),
    noSfx: talkingHead,
  });
  const row = input.phaseA.clips.find((clip) => clip.clipNumber === input.clipNumber);
  // Overlay-era talking-head stills say "no extra writing" and have no Subtitle sentence.
  // Do not put the spoken line back on screen in the video prompt.
  const talkingHeadWithoutSubtitle =
    isTalkingHeadSkill(input.skill.slug) &&
    !storyboardAsksForSubtitle(row?.startScene, row?.endScene, row?.explainerScene);
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
      clipNumber: input.clipNumber,
      smoothMotion: steady,
    }),
    phaseBWardrobeLock({
      cast: input.cast,
      characterImageUrl: input.characterImageUrl,
      skillSlug: input.skill.slug,
    }),
    input.sceneTextOff || talkingHeadWithoutSubtitle || isTalkingHeadSkill(input.skill.slug)
      ? NO_ONSCREEN_WRITING
      : "No subtitles or voiceover captions on screen.",
    isOutfitReelSkill(input.skill.slug) ? OUTFIT_COVERED_SWAP : "",
  ]
    .filter(Boolean)
    .reduce(finalizePhaseBPrompt, modelPrompt);
  // The model may echo a wrong number; trust the caller.
  return {
    ...output,
    clipNumber: input.clipNumber,
    prompt: lockDialogueSpeech(
      prompt,
      input.skill.slug,
      row?.englishVo,
      input.cast?.map((member) => member.name),
      resolvePerformance(input.skill, talkingShotForSkill(input.skill.slug) ?? "face", "en"),
      {
        voiceGender: input.voiceGender,
        speakers: input.cast,
      },
    ),
  };
}
