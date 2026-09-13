import { generateText, Output } from "ai";
import { DURATION_PRESETS } from "@/lib/director/duration-presets";
import { skillPromptForPhaseA } from "@/lib/director/load-skill-prompt";
import { phaseASchema } from "@/lib/director/schemas";
import type { AspectRatio, DurationPreset, PhaseAProposal } from "@/types/project";
import type { Skill } from "@/types/skill";

const DIRECTOR_MODEL = process.env.DIRECTOR_MODEL || "anthropic/claude-sonnet-4.6";

export async function runPhaseA(input: {
  skill: Skill;
  source: string;
  aspectRatio: AspectRatio;
  durationPreset: DurationPreset;
  characterImageUrl?: string;
}): Promise<PhaseAProposal> {
  const preset = DURATION_PRESETS[input.durationPreset];
  const characterNote = input.characterImageUrl
    ? `A character reference image is provided at ${input.characterImageUrl}. Extract and lock that character.`
    : "No character reference image. Use the default locked everyman from the skill.";

  const { output } = await generateText({
    model: DIRECTOR_MODEL,
    output: Output.object({ schema: phaseASchema }),
    system: `${skillPromptForPhaseA(input.skill)}

You are executing Phase A only. Return structured JSON that matches the schema.
Planning explanations and reference translations must be Traditional Chinese (繁體中文).
Voiceover must stay in natural American English.
Never skip the setup gate values already supplied.`,
    prompt: `Source material:
${input.source}

Aspect ratio: ${input.aspectRatio}
Duration preset: ${preset.skillHint}
${characterNote}

Produce a complete Phase A director proposal now.`,
  });

  if (!output) {
    throw new Error("導演提案產生失敗");
  }
  return output;
}
