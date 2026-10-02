import { generateText, Output } from "ai";
import {
  castBlockForPhaseA,
  characterLockFromCast,
  characterReferenceUrls,
  directorBlueprintSceneRules,
  loadDirectorImageParts,
  phaseASoloCharacterNote,
} from "@/service/character/cast-prompt";
import { LANGUAGE_PRESETS, sceneDescriptionLanguageLock } from "@/service/director/languages";
import { phaseAAudioHint, VOICE_PRESETS, resolveVoiceGender } from "@/service/director/voice";
import { SPEECH_PACE_PRESETS, resolveSpeechPace, speechPaceSkillHint } from "@/service/director/speech-pace";
import {
  resolveSceneText,
  SCENE_TEXT_PRESETS,
  sceneTextSkillHint,
} from "@/service/director/scene-text";
import { skillPromptForPhaseA } from "@/service/director/load-skill-prompt";
import {
  bookendDirectorBlock,
  bookendLocksLength,
  isBookendSkill,
  normalizeBookendClips,
  phaseADurationHint,
  cartoonExplainerDirectorBlock,
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
  listicleDirectorBlock,
  requiredCastCount,
  skillBansNarration,
  skillForcesSceneText,
  STORY_SHORT_SKILL_SLUG,
  storyShortDirectorBlock,
} from "@/service/director/skill-rules";
import { keyframeDeltaDirectorBlock } from "@/service/director/keyframe-delta";
import { sceneDetailDirectorBlock } from "@/service/director/scene-detail";
import {
  CARTOON_EXPLAINER_SKILL_SLUG,
  dualBeatDirectorBlock,
  isDualBeatSkill,
  normalizeDualBeatRow,
} from "@/service/director/dual-beat";
import { directorModel } from "@/service/director/model";
import { cartoonPhaseASchema, phaseASchema, talkingHeadPhaseASchema } from "@/model/director";
import {
  isTalkingHeadSkill,
  planTalkingHeadClips,
  spokenUnits,
  talkingHeadDirectorBlock,
  talkingHeadPlanError,
} from "@/service/director/talking-head";
import type { Style } from "@/service/style";
import type { CastMember } from "@/model/character";
import type {
  AspectRatio,
  DurationPreset,
  PhaseAProposal,
  SceneTextLanguage,
  SpeechPace,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import type { Skill } from "@/model/skill";

export async function runPhaseA(input: {
  skill: Skill;
  style: Style;
  source: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language?: VoLanguage;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  characterImageUrl?: string;
  cast?: CastMember[];
  // Opening / Ending brand logo, attached after the character references.
  logoUrl?: string;
  // Existing user-edited draft; regenerate from this instead of inventing anew.
  currentDraft?: PhaseAProposal;
  revisionNote?: string;
  // Rewrite clip rows from the locked proposal; do not invent a new brief.
  clipsOnly?: boolean;
}): Promise<PhaseAProposal> {
  const bookend = isBookendSkill(input.skill.slug);
  const talkingHead = isTalkingHeadSkill(input.skill.slug);
  if (talkingHead) {
    const planError = talkingHeadPlanError(input.source, input.speechPace);
    if (planError) throw new Error(planError);
  }
  const durationHint = phaseADurationHint({
    skillSlug: input.skill.slug,
    durationPreset: input.durationPreset,
    speechPace: input.speechPace,
  });
  const lockBookendLength = bookendLocksLength(input.skill.slug, input.durationPreset);
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const sceneText = resolveSceneText({
    ...input,
    skillSlug: input.skill.slug,
  });
  const characterNote =
    castBlockForPhaseA(input.cast) || phaseASoloCharacterNote(input.characterImageUrl);
  const dualBeat = isDualBeatSkill(input.skill.slug);
  const dialogueOnly = skillBansNarration(input.skill.slug);
  const characterImages = await loadDirectorImageParts(
    characterReferenceUrls({
      cast: input.cast,
      characterImageUrl: input.characterImageUrl,
    }),
  );
  const logoUrl = bookend ? input.logoUrl : undefined;
  const logoImages = logoUrl ? await loadDirectorImageParts([logoUrl]) : [];
  const draftNote = input.currentDraft
    ? `\nCurrent Phase A draft (the user may have edited this; keep their wording unless the revision notes contradict it):\n${JSON.stringify(input.currentDraft, null, 2)}\n`
    : "";
  const revisionNote = input.revisionNote
    ? `\nRevision notes from user:\n${input.revisionNote}\n`
    : "";
  const clipsOnlyNote = input.clipsOnly
    ? `\nRegenerate ONLY the clips array (and clipCount / narrativeArc / englishWordCount / bgmDirection as needed). Copy localizedTitle, englishTitle, coreMessage, hookStrategy, narrator, visualWorld, characterLock, palette, aspectRatio, loopMode, and targetDuration verbatim from the current draft. Do not change the proposal brief.\n`
    : "";

  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({
      schema: dualBeat ? cartoonPhaseASchema : talkingHead ? talkingHeadPhaseASchema : phaseASchema,
    }),
    system: `${skillPromptForPhaseA(input.skill, input.style)}

You are executing Phase A only. Return structured JSON that matches the schema.
${language.planningSkillHint}
${keyframeDeltaDirectorBlock({ separateStills: dualBeat, language: input.language })}
${sceneDetailDirectorBlock()}
${dualBeat ? dualBeatDirectorBlock(sceneText.enabled, { inWorldLabels: sceneText.inWorldLabels, language: input.language }) : ""}
${
  skillForcesSceneText(input.skill.slug)
    ? "On-canvas text is required: a numbered item list must appear in every still."
    : sceneText.enabled
      ? dualBeat
        ? "On-canvas text: start still quotes only startVo; end still quotes only endVo."
        : "On-canvas text may stay the same line from start to end; motion is pose, props, and lettering placement only."
      : sceneText.inWorldLabels
        ? "Motion is pose, props, and short in-world labels / tags popping or snapping in — never a voiceover caption."
        : "Motion is pose and props only — no written labels."
}
visualWorld and palette describe rendering only: canvas, line, fill, and colour roles. Never write a text, label, caption, or subtitle policy into visualWorld — on-canvas text rules are given separately and injected into every still prompt.
The next clip's start inherits the previous clip's end environment.
loopMode MUST always be "linear". The final clip must end on a clean resting payoff — never bridge Clip N back to Clip 1, never plan a seamless loop or infinite cycle.
${
  characterImages.length
    ? [
        "Character reference images / blueprints are attached to the user message. You MUST inspect them.",
        "characterLock must ONLY name the cast and say appearance follows the attached blueprint — never invent hair, face, clothing, or accessories.",
        "In explainerScene and motionCamera describe pose, props, labels, and environment only. Plan each scene around those characters as the subject. Do not invent a replacement hero.",
        ...directorBlueprintSceneRules(),
      ].join(" ")
    : ""
}
${
  [
    dialogueOnly ? dialogueOnlyDirectorBlock() : "",
    input.skill.slug === STORY_SHORT_SKILL_SLUG ? storyShortDirectorBlock() : "",
    input.skill.slug === CARTOON_EXPLAINER_SKILL_SLUG ? cartoonExplainerDirectorBlock() : "",
    requiredCastCount(input.skill.slug) ? dialogueQaDirectorBlock() : "",
    skillForcesSceneText(input.skill.slug) ? listicleDirectorBlock() : "",
    bookend
      ? bookendDirectorBlock(input.skill.slug, logoImages.length > 0, { lockLength: lockBookendLength })
      : "",
    talkingHead ? talkingHeadDirectorBlock() : "",
  ]
    .filter(Boolean)
    .join("\n")
}
${language.skillHint}
${
  talkingHead
    ? "Speaking pace changes each sentence's durationSeconds. Do not keep a fixed clip length."
    : speechPaceSkillHint(input.speechPace)
}
${phaseAAudioHint(input.voiceGender, { bansNarration: dialogueOnly })}
${sceneTextSkillHint(sceneText.enabled, sceneText.language, {
  dualBeat,
  listicle: skillForcesSceneText(input.skill.slug),
  inWorldLabels: sceneText.inWorldLabels,
  reelSafeZone: input.skill.slug === STORY_SHORT_SKILL_SLUG && input.aspectRatio === "9:16",
})}
The englishVo field always carries the spoken line in the chosen language above (character dialogue when this skill bans narration), regardless of the field name.
Leave referenceTranslation empty. Do not invent a translation column.
The englishWordCount field holds the total spoken unit count (words for English, characters for Chinese/Cantonese).
Never skip the setup gate values already supplied.
${sceneDescriptionLanguageLock(input.language)}`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Source material:
${input.source}

Aspect ratio: ${input.aspectRatio}
Duration preset: ${durationHint}
${dialogueOnly ? "Dialogue language" : "Voiceover language"}: ${language.label} (${language.sublabel})
${sceneDescriptionLanguageLock(input.language)}
Speaking pace: ${resolveSpeechPace(input.speechPace)} (${SPEECH_PACE_PRESETS[resolveSpeechPace(input.speechPace)].delivery})
${
  dialogueOnly
    ? "Character voices: do not pick a narrator gender. MiniMax will match each named speaker when the clip video is generated."
    : `Narrator voice: ${VOICE_PRESETS[resolveVoiceGender(input.voiceGender)].label} (adult ${resolveVoiceGender(input.voiceGender)})`
}
Audio: no background music. bgmDirection and each clip bgmSfx are SFX-only.
On-canvas text: ${
  sceneText.enabled
    ? SCENE_TEXT_PRESETS[sceneText.language].label
    : sceneText.inWorldLabels
      ? "voiceover captions off; short in-world labels allowed"
      : "off"
}
${characterNote}
${logoImages.length ? `Brand logo: the LAST attached image is the brand logo (after any character references). Use it as-is in startScene / endScene.\n` : ""}${draftNote}${revisionNote}${clipsOnlyNote}
Produce a complete Phase A director proposal now.`,
          },
          ...characterImages,
          ...logoImages,
        ],
      },
    ],
  });

  if (!output) {
    throw new Error("解說提案產生失敗");
  }
  // Always linear: finales end cleanly; never invent a loop bridge.
  let next: PhaseAProposal = {
    ...output,
    loopMode: "linear",
    ...(dualBeat ? { clips: output.clips.map(normalizeDualBeatRow) } : {}),
  };
  // Auto bookends stay one 3–4s clip. A chosen length is left as the model planned it.
  if (lockBookendLength) {
    const clips = normalizeBookendClips(next.clips);
    next = {
      ...next,
      clips,
      clipCount: clips.length,
      targetDuration: clips[0] ? `${clips[0].durationSeconds}s` : next.targetDuration,
    };
  }
  // Talking-head clip count, lines, and seconds come from the script, not the model.
  if (talkingHead) {
    const clips = planTalkingHeadClips({
      source: input.source,
      pace: input.speechPace,
      language: input.language,
    });
    const spoken = clips.reduce((sum, clip) => {
      const units = spokenUnits(clip.englishVo);
      return sum + units.cjk + units.words;
    }, 0);
    const totalSeconds = clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
    next = {
      ...next,
      clips,
      clipCount: clips.length,
      englishWordCount: Math.max(1, spoken),
      targetDuration: `${totalSeconds}s`,
    };
  }
  // Overwrite any invented look text so frame prompts never inherit a wrong outfit.
  if (input.cast && input.cast.length > 0) {
    next = { ...next, characterLock: characterLockFromCast(input.cast) };
  } else if (input.characterImageUrl) {
    next = {
      ...next,
      characterLock:
        "角色外貌一律以附加參考圖為準；禁止另行描述或改動髮型、臉型、服裝或配件。",
    };
  }
  return next;
}
