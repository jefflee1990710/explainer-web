import { generateText, Output } from "ai";
import {
  castBlockForPhaseA,
  characterLockFromCast,
  characterReferenceUrls,
  directorImageParts,
  phaseASoloCharacterNote,
} from "@/lib/characters/cast-prompt";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import {
  resolveSceneText,
  SCENE_TEXT_PRESETS,
  sceneTextSkillHint,
} from "@/lib/director/scene-text";
import { skillPromptForPhaseA } from "@/lib/director/load-skill-prompt";
import { directorModel } from "@/lib/director/model";
import { phaseASchema } from "@/lib/director/schemas";
import type { Style } from "@/lib/styles";
import type { CastMember } from "@/types/character";
import type {
  AspectRatio,
  DurationPreset,
  PhaseAProposal,
  SceneTextLanguage,
  VoLanguage,
} from "@/types/project";
import type { Skill } from "@/types/skill";

export async function runPhaseA(input: {
  skill: Skill;
  style: Style;
  source: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  language?: VoLanguage;
  sceneTextEnabled?: boolean;
  sceneTextLanguage?: SceneTextLanguage;
  characterImageUrl?: string;
  cast?: CastMember[];
  // Existing user-edited draft; regenerate from this instead of inventing anew.
  currentDraft?: PhaseAProposal;
  revisionNote?: string;
  // Rewrite clip rows from the locked proposal; do not invent a new brief.
  clipsOnly?: boolean;
}): Promise<PhaseAProposal> {
  const preset = DURATION_PRESETS[input.durationPreset];
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const sceneText = resolveSceneText(input);
  const characterNote =
    castBlockForPhaseA(input.cast) || phaseASoloCharacterNote(input.characterImageUrl);
  const characterImages = directorImageParts(
    characterReferenceUrls({
      cast: input.cast,
      characterImageUrl: input.characterImageUrl,
    }),
  );
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
    output: Output.object({ schema: phaseASchema }),
    system: `${skillPromptForPhaseA(input.skill, input.style)}

You are executing Phase A only. Return structured JSON that matches the schema.
Planning explanations (narrativeJob, explainerScene, motionCamera, hookStrategy, coreMessage, etc.) must be Traditional Chinese (繁體中文).
Each clip's start and end are the SAME SHOT: explainerScene and motionCamera must describe a modest continuation (${
  sceneText.enabled
    ? "pose, props, labels sliding or morphing"
    : "pose and props sliding or morphing — no written labels"
}), not a new camera or a character teleporting across the frame. The next clip's start inherits the previous clip's end environment.
loopMode MUST always be "linear". The final clip must end on a clean resting payoff — never bridge Clip N back to Clip 1, never plan a seamless loop or infinite cycle.
${
  characterImages.length
    ? "Character reference images / blueprints are attached to the user message. You MUST inspect them. characterLock must ONLY name the cast and say appearance follows the attached blueprint — never invent hair, face, clothing, or accessories. In explainerScene and motionCamera describe pose, props, labels, and environment only. Plan each scene around those characters as the subject. Do not invent a replacement hero."
    : ""
}
${language.skillHint}
${sceneTextSkillHint(sceneText.enabled, sceneText.language)}
The englishVo field always carries the spoken voiceover line in the chosen voiceover language above, regardless of the field name.
Leave referenceTranslation empty. Do not invent a translation column.
The englishWordCount field holds the total spoken unit count (words for English, characters for Chinese/Cantonese).
Never skip the setup gate values already supplied.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Source material:
${input.source}

Aspect ratio: ${input.aspectRatio}
Duration preset: ${preset.skillHint}
Voiceover language: ${language.label} (${language.sublabel})
On-canvas text: ${sceneText.enabled ? SCENE_TEXT_PRESETS[sceneText.language].label : "off"}
${characterNote}
${draftNote}${revisionNote}${clipsOnlyNote}
Produce a complete Phase A director proposal now.`,
          },
          ...characterImages,
        ],
      },
    ],
  });

  if (!output) {
    throw new Error("解說提案產生失敗");
  }
  // Always linear: finales end cleanly; never invent a loop bridge.
  let next: PhaseAProposal = { ...output, loopMode: "linear" };
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
