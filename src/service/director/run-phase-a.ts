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
  isOutfitChangeSkill,
  isOutfitReelSkill,
  isStreetLookbookSkill,
  isSurpriseInterviewSkill,
  isWardrobeBuildSkill,
  isTalkingBrollSkill,
  isEditorialInterviewSkill,
  isWorkflowPromoSkill,
  isStyleSwitchSkill,
  listicleDirectorBlock,
  outfitChangeDirectorBlock,
  outfitReelDirectorBlock,
  streetLookbookDirectorBlock,
  skillBansNarration,
  skillForcesSceneText,
  STORY_SHORT_SKILL_SLUG,
  storyShortDirectorBlock,
  styleSwitchDirectorBlock,
  surpriseInterviewDirectorBlock,
  talkingBrollDirectorBlock,
  editorialInterviewDirectorBlock,
  verticalSafeAreaDirectorLine,
  workflowPromoDirectorBlock,
} from "@/service/director/skill-rules";
import { keyframeDeltaDirectorBlock } from "@/service/director/keyframe-delta";
import { sceneDetailDirectorBlock } from "@/service/director/scene-detail";
import { sanitizeOutfitChangePhaseA } from "@/service/director/outfit-change";
import { isRealisticStyle, isSelfShotCreatorSkill } from "@/service/style/realistic-light";
import {
  dualBeatDirectorBlock,
  isDualBeatSkill,
  normalizeDualBeatRow,
} from "@/service/director/dual-beat";
import {
  explainerCanvasKind,
  isDiagramExplainerSkill,
} from "@/service/director/explainer-family";
import { loadReferenceImageContent } from "@/service/director/reference-image-content";
import { rewriteEndScenes } from "@/service/director/end-scene-rewrite";
import { withSpokenClipDurations } from "@/service/director/clip-seconds";
import { storyboardModel, storyboardProviderOptions } from "@/service/director/model";
import {
  instructionFollowsReferenceClothes,
  phaseAReferenceImageRules,
  sanitizeClipReferenceIds,
} from "@/service/project/reference-images";
import { cartoonPhaseASchema, phaseASchema, talkingHeadPhaseASchema } from "@/model/director";
import { resolvePerformance } from "@/service/director/performance";
import { talkingShotForSkill } from "@/service/director/talking-performance";
import {
  isTalkingHeadSkill,
  planTalkingHeadClips,
  TALKING_HEAD_SKILL_SLUG,
  spokenUnits,
  talkingHeadDirectorBlock,
  talkingHeadShot,
  talkingHeadSpokenError,
  talkingHeadSourceError,
} from "@/service/director/talking-head";
import { sanitizeOutfitPhaseA } from "@/service/director/outfit-reel";
import { sanitizeSurprisePhaseA } from "@/service/director/surprise-interview";
import { usesSteadyStills } from "@/service/director/steady-stills";
import { usesTalkingHeadSubtitleOverlay } from "@/service/director/subtitle-plate";
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
  SceneTextChoice,
  SpeechPace,
  StoryboardClipDraft,
  VoLanguage,
  VoiceGender,
} from "@/model/project";
import { buildStoryboardDraftPhaseABlock } from "@/service/director/storyboard-draft-chat";
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
  // Ordered visual styles when a multi-style director is selected (up to maxStyleCount).
  styles?: Array<Style | RenderableStyle>;
  source: string;
  // Talking-head: exact words the character reads. Ignored for other skills.
  spokenScript?: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language?: VoLanguage;
  narrationEnabled?: boolean;
  voiceGender?: VoiceGender;
  speechPace?: SpeechPace;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextChoice;
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
  // Optional user-sketched or AI-drafted clip breakdowns created in the brief wizard.
  clipDrafts?: StoryboardClipDraft[];
  // Talking-head room photos. When present, the bookshelf set is not used.
  backgroundImageUrls?: string[];
  // Talking-head preset background & pose ids.
  talkingHeadBackgroundId?: string;
  talkingHeadPoseId?: string;
  // Talking-head read + Cinematic realistic. Clip 1's start matches this photo.
  startImageUrl?: string;
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
  const wardrobeBuild = isWardrobeBuildSkill(input.skill.slug);
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
  // Cinematic realistic whiteboard: locked camera and one subtitle per clip so the video glides.
  const steadyStills = usesSteadyStills(input.skill.slug, input.style);
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
  const clipDraftsBlock = buildStoryboardDraftPhaseABlock(input.clipDrafts);
  const sketchDrafts = (input.clipDrafts ?? []).filter((d) => Boolean(d.sketchUrl));
  const sketchImageParts = sketchDrafts.length
    ? await loadDirectorImageParts(sketchDrafts.map((d) => d.sketchUrl!))
    : [];
  const sketchPartsWithLabels = sketchDrafts.flatMap((draft, index) => {
    const imgPart = sketchImageParts[index];
    if (!imgPart) return [];
    return [
      {
        type: "text" as const,
        text: `[Clip ${draft.clipNumber} Hand-Drawn Sketch]${draft.explanation ? ` — ${draft.explanation}` : ""}:`,
      },
      imgPart,
    ];
  });
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
  // Talking-head paints the spoken line into the still. Overlay plates stay off.
  const subtitleOverlay = usesTalkingHeadSubtitleOverlay({
    skillSlug: input.skill.slug,
    styleId: input.style.id,
    baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
  });

  const generated = await generateText({
    model: storyboardModel(),
    providerOptions: storyboardProviderOptions(),
    output: Output.object({
      schema: dualBeat ? cartoonPhaseASchema : talkingHead ? talkingHeadPhaseASchema : phaseASchema,
    }),
    system: `${skillPromptForPhaseA(input.skill, input.style)}

You are executing Phase A only. Return structured JSON that matches the schema.
${language.planningSkillHint}
${verticalSafeAreaDirectorLine(input.aspectRatio)}
${keyframeDeltaDirectorBlock({ separateStills: dualBeat, language: input.language, performance: dualBeat && hasCharacter, steadyStills })}
${sceneDetailDirectorBlock({
  realistic: isRealisticStyle({
    id: input.style.id,
    baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
  }),
  selfShot: isSelfShotCreatorSkill(input.skill.slug),
})}
${dualBeat ? dualBeatDirectorBlock(sceneText.enabled, { inWorldLabels: sceneText.inWorldLabels, language: input.language, look: subtitleLook, lookLine: sampleLookLine, hasCharacter, steadyStills }) : ""}
${
  sceneText.enabled && skillForcesSceneText(input.skill.slug)
    ? "On-canvas text is required: a numbered item list must appear in every still. Never write spoken subtitles."
    : sceneText.enabled
      ? "On-canvas text is allowed for short in-scene labels, signs, or diagram elements only — never write Subtitle: or caption the spoken line on screen."
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
          ? `In explainerScene and motionCamera describe ${isRealisticStyle(input.style) ? "natural, calm facial expressions" : "vivid facial expressions"}, pose, the room, and the garments copied from the clothing references. Do not invent a replacement hero, hair, or face, and do not copy the person in a clothing photo.`
          : clothingFromReference
            ? `In explainerScene and motionCamera describe ${isRealisticStyle(input.style) ? "natural, calm facial expressions" : "vivid facial expressions"}, pose, props, and the garments the instruction copies from the reference. Do not invent a replacement hero, hair, or face, and do not copy the person in the reference photo.`
            : `In explainerScene and motionCamera describe ${isRealisticStyle(input.style) ? "natural, calm facial expressions" : "vivid facial expressions"}, pose, props, labels, and environment only. Plan each scene around those characters as the subject. Do not invent a replacement hero. A scene reference never replaces their face or hair.`,
        ...directorBlueprintSceneRules(look),
      ].join(" ")
    : ""
}
${phaseAReferenceImageRules(references.attached, { clothingOnly: wardrobeBuild, clothingFromInstruction: clothingFromReference })}
${
  [
    dialogueOnly ? dialogueOnlyDirectorBlock() : "",
    input.skill.slug === STORY_SHORT_SKILL_SLUG ? storyShortDirectorBlock() : "",
    isDiagramExplainerSkill(input.skill.slug)
      ? cartoonExplainerDirectorBlock({
          hasCharacter,
          smoothMotion: steadyStills,
          canvas: explainerCanvasKind(input.skill.slug) ?? "whiteboard",
          realistic: isRealisticStyle({
            id: input.style.id,
            baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
          }),
        })
      : "",
    input.skill.slug === DIALOGUE_QA_SKILL_SLUG ? dialogueQaDirectorBlock() : "",
    sceneText.enabled && skillForcesSceneText(input.skill.slug) ? listicleDirectorBlock() : "",
    sceneText.enabled && isComparisonCardSkill(input.skill.slug) ? comparisonCardDirectorBlock(input.aspectRatio) : "",
    isTalkingBrollSkill(input.skill.slug) ? talkingBrollDirectorBlock() : "",
    isEditorialInterviewSkill(input.skill.slug) ? editorialInterviewDirectorBlock() : "",
    bookend
      ? bookendDirectorBlock(input.skill.slug, logoImages.length > 0, { lockLength: lockBookendLength })
      : "",
    talkingHead
      ? talkingHeadDirectorBlock(
          input.skill.slug,
          input.aspectRatio,
          resolvePerformance(input.skill, talkingShotForSkill(input.skill.slug) ?? "face", "en"),
          subtitleOverlay,
          !sceneText.enabled,
          isRealisticStyle({
            id: input.style.id,
            baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
          }),
        )
      : "",
    isSurpriseInterviewSkill(input.skill.slug) ? surpriseInterviewDirectorBlock() : "",
    isOutfitReelSkill(input.skill.slug) ? outfitReelDirectorBlock() : "",
    isOutfitChangeSkill(input.skill.slug) ? outfitChangeDirectorBlock() : "",
    isStreetLookbookSkill(input.skill.slug) ? streetLookbookDirectorBlock() : "",
    isFollowShotSkill(input.skill.slug) ? followShotDirectorBlock() : "",
    isWorkflowPromoSkill(input.skill.slug) ? workflowPromoDirectorBlock() : "",
    isStyleSwitchSkill(input.skill.slug)
      ? styleSwitchDirectorBlock(
          (input.styles && input.styles.length > 0 ? input.styles : [input.style]).map((s) => ({
            id: s.id,
            name: s.name,
          })),
        )
      : "",
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
${phaseAAudioHint(input.voiceGender, {
  bansNarration: dialogueOnly,
  speakers: input.cast,
  silent: input.narrationEnabled === false && !talkingHead && !dialogueOnly,
})}
${sceneTextSkillHint(sceneText.enabled, sceneText.language, {
  dualBeat,
  steadyStills,
  listicle: sceneText.enabled && skillForcesSceneText(input.skill.slug),
  comparison: sceneText.enabled && isComparisonCardSkill(input.skill.slug),
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
  input.narrationEnabled === false && !talkingHead && !dialogueOnly
    ? 'Voiceover / Narration: OFF — every clip englishVo MUST be "(no dialogue)" (leave startVo and endVo empty if present). No narrator and no spoken words.'
    : speakerLocks.length
      ? `Voice lock: copy these character locks verbatim into every spoken clip. Do not invent a timbre from the look:\n${speakerLocks.join("\n")}\nAny speaker without a lock uses: adult ${voice.en}, ${voice.fingerprint}`
      : dialogueOnly
        ? `Voice lock: every speaker uses this verbatim: adult ${voice.en}, ${voice.fingerprint}. Do not invent a timbre from the look. No narrator.`
        : `Narrator voice lock: ${voice.label} (adult ${voice.en}), ${voice.fingerprint}. Copy it verbatim. Do not invent a timbre from the look.`
}
Audio: no background music and no sound effects (no dings, chimes, pops, whooshes, or Foley SFX). bgmDirection and each clip bgmSfx MUST be "none". Clean spoken voiceover only.
On-canvas text: ${
  sceneText.enabled
    ? SCENE_TEXT_PRESETS[sceneText.language].label
    : sceneText.inWorldLabels
      ? "voiceover captions off; short in-world labels allowed"
      : "off"
}
${characterNote}
${productImages.length ? `Product references (${productNames}) are attached after the character blueprints and before any brand logo. Keep the product photorealistic and identical to those images in every scene that shows it. Do not restyle the product into the visual style.\n` : ""}${logoImages.length ? `Brand logo: the LAST attached image is the brand logo (after any scene, character, and product references). Use it as-is in startScene / endScene.\n` : ""}${clipDraftsBlock}${draftNote}${revisionNote}${clipsOnlyNote}
Produce a complete Phase A director proposal now.`,
          },
          ...references.parts,
          ...sketchPartsWithLabels,
          ...((references.parts.length || sketchPartsWithLabels.length) && characterImages.length
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
  // Auto bookends stay one clip. Spoken length is applied to every non-talking-head clip below.
  if (lockBookendLength) {
    const clips = normalizeBookendClips(next.clips);
    next = {
      ...next,
      clips,
      clipCount: clips.length,
      targetDuration: clips[0] ? `${clips[0].durationSeconds}s` : next.targetDuration,
    };
  }
  // Flash writes the storyboard. Pro rewrites only the end still from the opening and the motion.
  if (!talkingHead) {
    next = {
      ...next,
      clips: await rewriteEndScenes({
        clips: next.clips,
        language: input.language,
        skillSlug: input.skill.slug,
        lockedCamera: steadyStills,
      }),
    };
  }
  // Talking-head timing is deterministic; spoken lines come from spokenScript,
  // while Argon's sentence-by-sentence facial expression choreography is preserved from `next.clips`.
  if (talkingHead) {
    const clips = planTalkingHeadClips({
      source: input.spokenScript || "",
      directorInstruction: input.source,
      visualWorld: next.visualWorld,
      argonClips: next.clips,
      pace: input.speechPace,
      language: input.language,
      aspectRatio: input.aspectRatio,
      shot: talkingHeadShot(input.skill.customProfile?.visual || input.skill.profile?.visual),
      background: Boolean(input.backgroundImageUrls?.length),
      talkingHeadBackgroundId: input.talkingHeadBackgroundId,
      talkingHeadPoseId: input.talkingHeadPoseId,
      openingPhoto:
        input.skill.slug === TALKING_HEAD_SKILL_SLUG && Boolean(input.startImageUrl),
      // Custom directors override template slots per key; see resolvePerformance.
      performance: resolvePerformance(input.skill, talkingShotForSkill(input.skill.slug) ?? "face", input.language),
      overlay: subtitleOverlay,
      noText: !sceneText.enabled,
      realistic: isRealisticStyle({
        id: input.style.id,
        baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
      }),
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
  if (input.narrationEnabled === false && !talkingHead && !dialogueOnly) {
    next = {
      ...next,
      narrator: "No narrator — voiceover disabled.",
      englishWordCount: 0,
      clips: next.clips.map((clip) => ({
        ...clip,
        englishVo: "(no dialogue)",
        ...(clip.startVo !== undefined ? { startVo: "" } : {}),
        ...(clip.endVo !== undefined ? { endVo: "" } : {}),
      })),
    };
  }
  // Overwrite any invented look text so frame prompts never inherit a wrong outfit.
  if (input.cast && input.cast.length > 0) {
    next = { ...next, characterLock: characterLockFromCast(input.cast, look) };
  } else if (input.characterImageUrl) {
    next = { ...next, characterLock: soloCharacterLock(look) };
  }
  if (isOutfitReelSkill(input.skill.slug)) {
    next = sanitizeOutfitPhaseA(next, Math.random, {
      lenses: isRealisticStyle({
        id: input.style.id,
        baseStyleId: "baseStyleId" in input.style ? input.style.baseStyleId : undefined,
      }),
    });
  }
  if (isOutfitChangeSkill(input.skill.slug)) {
    next = sanitizeOutfitChangePhaseA(next);
  }
  if (isSurpriseInterviewSkill(input.skill.slug)) next = sanitizeSurprisePhaseA(next);
  if (isStyleSwitchSkill(input.skill.slug)) {
    const allowedStyles =
      input.styles && input.styles.length > 0 ? input.styles : [input.style];
    const allowedIds = allowedStyles.map((s) => s.id);
    next = {
      ...next,
      clips: next.clips.map((clip, index) => {
        const fallbackId = allowedIds[index % allowedIds.length] || input.style.id;
        const validStyleId =
          clip.styleId && allowedIds.includes(clip.styleId) ? clip.styleId : fallbackId;
        return { ...clip, styleId: validStyleId };
      }),
    };
  }
  // Talking-head seconds already follow the spoken script. Every other director
  // gets duration from the line and pace here, so a model that always writes 5 is corrected.
  if (!talkingHead) {
    const clips = withSpokenClipDurations(next.clips, input.speechPace);
    const totalSeconds = clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
    next = { ...next, clips, targetDuration: `${totalSeconds}s` };
  }
  return next;
}
