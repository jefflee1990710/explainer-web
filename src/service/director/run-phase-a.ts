import { generateText, Output } from "ai";
import {
  castBlockForPhaseA,
  characterLockFromCast,
  soloCharacterLock,
  characterReferenceUrls,
  directorBlueprintSceneRules,
  loadDirectorImageParts,
  phaseASoloCharacterNote,
} from "@/service/character/cast-prompt";
import { LANGUAGE_PRESETS, sceneDescriptionLanguageLock } from "@/service/director/languages";
import { lockedSpeakerLines } from "@/service/director/character-voice";
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
  comparisonCardDirectorBlock,
  DIALOGUE_QA_SKILL_SLUG,
  dialogueOnlyDirectorBlock,
  dialogueQaDirectorBlock,
  isComparisonCardSkill,
  followShotDirectorBlock,
  isFollowShotSkill,
  isOutfitReelSkill,
  isSurpriseInterviewSkill,
  isTalkingBrollSkill,
  listicleDirectorBlock,
  outfitReelDirectorBlock,
  skillBansNarration,
  skillForcesSceneText,
  STORY_SHORT_SKILL_SLUG,
  storyShortDirectorBlock,
  surpriseInterviewDirectorBlock,
  talkingBrollDirectorBlock,
} from "@/service/director/skill-rules";
import { keyframeDeltaDirectorBlock } from "@/service/director/keyframe-delta";
import { sceneDetailDirectorBlock } from "@/service/director/scene-detail";
import {
  CARTOON_EXPLAINER_SKILL_SLUG,
  dualBeatDirectorBlock,
  isDualBeatSkill,
  normalizeDualBeatRow,
} from "@/service/director/dual-beat";
import { loadReferenceImageContent } from "@/service/director/reference-image-content";
import { directorModel } from "@/service/director/model";
import {
  instructionFollowsReferenceClothes,
  phaseAReferenceImageRules,
  sanitizeClipReferenceIds,
} from "@/service/project/reference-images";
import { cartoonPhaseASchema, phaseASchema, talkingHeadPhaseASchema } from "@/model/director";
import {
  isTalkingHeadSkill,
  planTalkingHeadClips,
  spokenUnits,
  talkingHeadDirectorBlock,
  talkingHeadShot,
  talkingHeadSpokenError,
  talkingHeadSourceError,
} from "@/service/director/talking-head";
import { sanitizeOutfitPhaseA } from "@/service/director/outfit-reel";
import { sanitizeSurprisePhaseA } from "@/service/director/surprise-interview";
import type { Style } from "@/service/style";
import { resolveSubtitleLook, textStyleSampleHint } from "@/service/director/subtitle-look";
import type { RenderableStyle } from "@/service/style/renderable-style";
import type { CastMember } from "@/model/character";
import type { ProductShot } from "@/model/product";
import { productReferenceUrls } from "@/service/product/blueprint-prompt";
import type {
  AspectRatio,
  DurationPreset,
  PhaseAProposal,
  ReferenceImage,
  SceneTextLanguage,
  SpeechPace,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import type { Skill } from "@/model/skill";

// Gemini sometimes returns PROHIBITED_CONTENT and no JSON for a normal
// talking-head brief. Clips are planned locally, so the storyboard can
// still be built from the script and the room note.
function talkingHeadBriefWithoutModel(input: {
  source: string;
  spokenScript?: string;
  aspectRatio: AspectRatio;
  styleName: string;
}): PhaseAProposal {
  const line = (input.spokenScript || "").replace(/\s+/g, " ").trim();
  const sentence = line.split(/(?<=[.!?。！？])\s/)[0] || line;
  const title = sentence
    ? sentence.length > 80
      ? `${sentence.slice(0, 77)}…`
      : sentence
    : "Talking-head read";
  const room = input.source.replace(/\s+/g, " ").trim();
  return {
    englishTitle: title,
    localizedTitle: title,
    targetDuration: "5s",
    clipCount: 1,
    loopMode: "linear",
    coreMessage: title,
    hookStrategy: "Opens on the first spoken line.",
    aspectRatio: input.aspectRatio,
    visualWorld: room
      ? `${input.styleName}. Room from the instruction: ${room}`
      : input.styleName,
    narrator: "The on-screen character speaks.",
    englishWordCount: 1,
    characterLock: "Appearance follows the attached blueprint.",
    palette: "From the visual style.",
    bgmDirection: "none",
    narrativeArc: "The spoken script, in order.",
    clips: [
      {
        clipNumber: 1,
        timeRange: "0–5s",
        durationSeconds: 5,
        narrativeJob: "Read the script.",
        explainerScene: "Seated read.",
        motionCamera: "Locked camera.",
        englishVo: line || title,
        bgmSfx: "none",
      },
    ],
  };
}

export async function runPhaseA(input: {
  skill: Skill;
  // System styles and user forks. Style.id is a catalog id, so a user hex cannot be Style.
  style: Style | RenderableStyle;
  source: string;
  // Talking-head: exact words the character reads. Ignored for other skills.
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language?: VoLanguage;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  subtitleLook?: string;
  textStyleImageUrl?: string;
  characterImageUrl?: string;
  cast?: CastMember[];
  // Real products. Attached after characters and before the logo.
  products?: ProductShot[];
  // Opening / Ending brand logo, attached after the character references.
  logoUrl?: string;
  // Brief scene references; the director tags clips with their ids.
  referenceImages?: ReferenceImage[];
  // Talking-head room photos. When present, the bookshelf set is not used.
  backgroundImageUrls?: string[];
  // Existing user-edited draft; regenerate from this instead of inventing anew.
  currentDraft?: PhaseAProposal;
  revisionNote?: string;
  // Rewrite clip rows from the locked proposal; do not invent a new brief.
  clipsOnly?: boolean;
}): Promise<PhaseAProposal> {
  const bookend = isBookendSkill(input.skill.slug);
  const talkingHead = isTalkingHeadSkill(input.skill.slug);
  if (talkingHead) {
    const sourceError = talkingHeadSourceError(input.source);
    if (sourceError) throw new Error(sourceError);
    const spokenError = talkingHeadSpokenError(input.spokenScript || "", input.speechPace);
    if (spokenError) throw new Error(spokenError);
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
  const wardrobeBuild = isOutfitReelSkill(input.skill.slug);
  const clothingFromReference =
    !wardrobeBuild &&
    instructionFollowsReferenceClothes([
      input.source,
      input.revisionNote,
      ...(input.referenceImages || []).map((image) => image.description),
    ]);
  const look = { wardrobeBuild, clothingFromReference };
  const characterNote =
    castBlockForPhaseA(input.cast, look) || phaseASoloCharacterNote(input.characterImageUrl, look);
  const subtitleLook = resolveSubtitleLook(input.subtitleLook);
  const sampleLookLine = input.textStyleImageUrl ? textStyleSampleHint() : undefined;
  const dualBeat = isDualBeatSkill(input.skill.slug);
  const dialogueOnly = skillBansNarration(input.skill.slug);
  const speakerLocks = lockedSpeakerLines(input.cast);
  const voice = VOICE_PRESETS[resolveVoiceGender(input.voiceGender)];
  const hasCharacter = Boolean(input.cast?.length || input.characterImageUrl);
  const characterImages = await loadDirectorImageParts(
    characterReferenceUrls({
      cast: input.cast,
      characterImageUrl: input.characterImageUrl,
    }),
  );
  const logoUrl = bookend ? input.logoUrl : undefined;
  const logoImages = logoUrl ? await loadDirectorImageParts([logoUrl]) : [];
  const productUrls = productReferenceUrls(input.products);
  const productImages = productUrls.length ? await loadDirectorImageParts(productUrls) : [];
  const productNames = (input.products ?? []).map((item) => item.name).filter(Boolean).join(", ");
  const references = await loadReferenceImageContent(input.referenceImages);
  // R ids are positional, so ids from an older draft may now name a different image;
  // drop them and let the director assign against the current list.
  const draftForPrompt = input.currentDraft && {
    ...input.currentDraft,
    clips: input.currentDraft.clips.map((clip) => {
      const { referenceImageIds: _ids, ...rest } = clip;
      void _ids;
      return rest;
    }),
  };
  const draftNote = draftForPrompt
    ? `\nCurrent Phase A draft (the user may have edited this; keep their wording unless the revision notes contradict it):\n${JSON.stringify(draftForPrompt, null, 2)}\n`
    : "";
  const revisionNote = input.revisionNote
    ? `\nRevision notes from user:\n${input.revisionNote}\n`
    : "";
  const clipsOnlyNote = input.clipsOnly
    ? `\nRegenerate ONLY the clips array (and clipCount / narrativeArc / englishWordCount / bgmDirection as needed). Copy localizedTitle, englishTitle, coreMessage, hookStrategy, narrator, visualWorld, characterLock, palette, aspectRatio, loopMode, and targetDuration verbatim from the current draft. Do not change the proposal brief.\n`
    : "";

  const generated = await generateText({
    model: directorModel(),
    output: Output.object({
      schema: dualBeat ? cartoonPhaseASchema : talkingHead ? talkingHeadPhaseASchema : phaseASchema,
    }),
    system: `${skillPromptForPhaseA(input.skill, input.style)}

You are executing Phase A only. Return structured JSON that matches the schema.
${language.planningSkillHint}
${keyframeDeltaDirectorBlock({ separateStills: dualBeat, language: input.language, performance: dualBeat && hasCharacter })}
${sceneDetailDirectorBlock()}
${dualBeat ? dualBeatDirectorBlock(sceneText.enabled, { inWorldLabels: sceneText.inWorldLabels, language: input.language, look: subtitleLook, lookLine: sampleLookLine, hasCharacter }) : ""}
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
        wardrobeBuild
          ? "characterLock must ONLY name the cast and say face, hair, and proportions follow the attached blueprint. Do not lock clothing to the blueprint. Garments copied from the clothing references are named in explainerScene."
          : clothingFromReference
            ? "characterLock must ONLY name the cast and say face and hair follow the attached blueprint. Do not invent hair or face. Clothes follow the reference image only because the instruction says so."
            : "characterLock must ONLY name the cast and say appearance follows the attached blueprint — never invent hair, face, clothing, or accessories.",
        wardrobeBuild
          ? "In explainerScene and motionCamera describe pose, the room, and the garments copied from the clothing references. Do not invent a replacement hero, hair, or face, and do not copy the person in a clothing photo."
          : clothingFromReference
            ? "In explainerScene and motionCamera describe pose, props, and the garments the instruction copies from the reference. Do not invent a replacement hero, hair, or face, and do not copy the person in the reference photo."
            : "In explainerScene and motionCamera describe pose, props, labels, and environment only. Plan each scene around those characters as the subject. Do not invent a replacement hero. A scene reference never replaces their face or hair.",
        ...directorBlueprintSceneRules(look),
      ].join(" ")
    : ""
}
${phaseAReferenceImageRules(references.attached, { clothingOnly: wardrobeBuild, clothingFromInstruction: clothingFromReference })}
${
  [
    dialogueOnly ? dialogueOnlyDirectorBlock() : "",
    input.skill.slug === STORY_SHORT_SKILL_SLUG ? storyShortDirectorBlock() : "",
    input.skill.slug === CARTOON_EXPLAINER_SKILL_SLUG
      ? cartoonExplainerDirectorBlock({ hasCharacter })
      : "",
    input.skill.slug === DIALOGUE_QA_SKILL_SLUG ? dialogueQaDirectorBlock() : "",
    skillForcesSceneText(input.skill.slug) ? listicleDirectorBlock() : "",
    isComparisonCardSkill(input.skill.slug) ? comparisonCardDirectorBlock(input.aspectRatio) : "",
    isTalkingBrollSkill(input.skill.slug) ? talkingBrollDirectorBlock() : "",
    bookend
      ? bookendDirectorBlock(input.skill.slug, logoImages.length > 0, { lockLength: lockBookendLength })
      : "",
    talkingHead ? talkingHeadDirectorBlock(input.skill.slug, input.aspectRatio) : "",
    isSurpriseInterviewSkill(input.skill.slug) ? surpriseInterviewDirectorBlock() : "",
    wardrobeBuild ? outfitReelDirectorBlock() : "",
    isFollowShotSkill(input.skill.slug) ? followShotDirectorBlock() : "",
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
${phaseAAudioHint(input.voiceGender, { bansNarration: dialogueOnly, speakers: input.cast })}
${sceneTextSkillHint(sceneText.enabled, sceneText.language, {
  dualBeat,
  listicle: skillForcesSceneText(input.skill.slug),
  comparison: isComparisonCardSkill(input.skill.slug),
  inWorldLabels: sceneText.inWorldLabels,
  aspectRatio: input.aspectRatio,
  look: subtitleLook,
  lookLine: sampleLookLine,
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
            text: `Director instruction (planning notes — not spoken unless this skill has no separate script):
${input.source}
${
  talkingHead
    ? `\nSpoken script the character must read verbatim. Keep every word in order. Clips share a similar length; do not force one sentence per clip:\n${input.spokenScript}\n`
    : ""
}
Aspect ratio: ${input.aspectRatio}
Duration preset: ${durationHint}
${dialogueOnly ? "Dialogue language" : "Voiceover language"}: ${language.label} (${language.sublabel})
${sceneDescriptionLanguageLock(input.language)}
Speaking pace: ${resolveSpeechPace(input.speechPace)} (${SPEECH_PACE_PRESETS[resolveSpeechPace(input.speechPace)].delivery})
${
  speakerLocks.length
    ? `Voice lock: copy these character locks verbatim into every spoken clip. Do not invent a timbre from the look:\n${speakerLocks.join("\n")}\nAny speaker without a lock uses: adult ${voice.en}, ${voice.fingerprint}`
    : dialogueOnly
      ? `Voice lock: every speaker uses this verbatim: adult ${voice.en}, ${voice.fingerprint}. Do not invent a timbre from the look. No narrator.`
      : `Narrator voice lock: ${voice.label} (adult ${voice.en}), ${voice.fingerprint}. Copy it verbatim. Do not invent a timbre from the look.`
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
${productImages.length ? `Product references (${productNames}) are attached after the character blueprints and before any brand logo. Keep the product photorealistic and identical to those images in every scene that shows it. Do not restyle the product into the visual style.\n` : ""}${logoImages.length ? `Brand logo: the LAST attached image is the brand logo (after any scene, character, and product references). Use it as-is in startScene / endScene.\n` : ""}${draftNote}${revisionNote}${clipsOnlyNote}
Produce a complete Phase A director proposal now.`,
          },
          ...references.parts,
          ...(references.parts.length && characterImages.length
            ? [{ type: "text" as const, text: "Character blueprints follow (not scene references):" }]
            : []),
          ...characterImages,
          ...productImages,
          ...logoImages,
        ],
      },
    ],
  });

  // content-filter throws on `.output` and stores "No output generated."
  // Talking-head clips do not come from the model, so keep the storyboard.
  let output: PhaseAProposal | undefined;
  if (generated.finishReason === "stop") {
    output = generated.output ?? undefined;
  }
  if (!output) {
    if (talkingHead) {
      output = talkingHeadBriefWithoutModel({
        source: input.source,
        spokenScript: input.spokenScript,
        aspectRatio: input.aspectRatio,
        styleName: input.style.name,
      });
    } else if (generated.finishReason === "content-filter") {
      throw new Error("這次題材被模型拒絕，請改寫場景描述後再試。");
    } else {
      throw new Error("解說提案產生失敗");
    }
  }
  // Always linear: finales end cleanly; never invent a loop bridge.
  let next: PhaseAProposal = {
    ...output,
    loopMode: "linear",
    clips: sanitizeClipReferenceIds(
      dualBeat ? output.clips.map(normalizeDualBeatRow) : output.clips,
      references.attached,
    ),
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
  // Talking-head timing is deterministic; spoken lines come from spokenScript.
  if (talkingHead) {
    const clips = planTalkingHeadClips({
      source: input.spokenScript || "",
      pace: input.speechPace,
      language: input.language,
      aspectRatio: input.aspectRatio,
      shot: talkingHeadShot(input.skill.customProfile?.visual || input.skill.profile?.visual),
      background: Boolean(input.backgroundImageUrls?.length),
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
    next = { ...next, characterLock: characterLockFromCast(input.cast, look) };
  } else if (input.characterImageUrl) {
    next = { ...next, characterLock: soloCharacterLock(look) };
  }
  if (wardrobeBuild) {
    next = sanitizeOutfitPhaseA(next, Math.random, {
      lenses: input.style.id === "realistic" || input.style.name === "Cinematic realistic",
    });
  }
  if (isSurpriseInterviewSkill(input.skill.slug)) next = sanitizeSurprisePhaseA(next);
  return next;
}
