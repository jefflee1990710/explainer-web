import { generateText, Output } from "ai";
import { castBlockForPhaseA } from "@/lib/characters/cast-prompt";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { skillPromptForPhaseA } from "@/lib/director/load-skill-prompt";
import { directorModel } from "@/lib/director/model";
import { phaseASchema } from "@/lib/director/schemas";
import type { Style } from "@/lib/styles";
import type { CastMember } from "@/types/character";
import type {
  AspectRatio,
  DurationPreset,
  PhaseAProposal,
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
  characterImageUrl?: string;
  cast?: CastMember[];
  // Existing user-edited draft; regenerate from this instead of inventing anew.
  currentDraft?: PhaseAProposal;
  revisionNote?: string;
}): Promise<PhaseAProposal> {
  const preset = DURATION_PRESETS[input.durationPreset];
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const characterNote =
    castBlockForPhaseA(input.cast) ||
    (input.characterImageUrl
      ? `A character reference image is provided at ${input.characterImageUrl}. Extract and lock that character.`
      : "No character reference image. Use the default locked everyman from the skill.");
  const draftNote = input.currentDraft
    ? `\nCurrent Phase A draft (the user may have edited this; keep their wording unless the revision notes contradict it):\n${JSON.stringify(input.currentDraft, null, 2)}\n`
    : "";
  const revisionNote = input.revisionNote
    ? `\nRevision notes from user:\n${input.revisionNote}\n`
    : "";

  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: phaseASchema }),
    system: `${skillPromptForPhaseA(input.skill, input.style)}

You are executing Phase A only. Return structured JSON that matches the schema.
Planning explanations (narrativeJob, explainerScene, motionCamera, hookStrategy, coreMessage, etc.) must be Traditional Chinese (繁體中文).
${language.skillHint}
The englishVo field always carries the spoken voiceover line in the chosen voiceover language above, regardless of the field name.
${language.translationHint}
The englishWordCount field holds the total spoken unit count (words for English, characters for Chinese/Cantonese).
Never skip the setup gate values already supplied.`,
    prompt: `Source material:
${input.source}

Aspect ratio: ${input.aspectRatio}
Duration preset: ${preset.skillHint}
Voiceover language: ${language.label} (${language.sublabel})
${characterNote}
${draftNote}${revisionNote}
Produce a complete Phase A director proposal now.`,
  });

  if (!output) {
    throw new Error("解說提案產生失敗");
  }
  return output;
}
