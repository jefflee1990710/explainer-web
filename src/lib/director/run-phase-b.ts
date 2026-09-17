import { generateText, Output } from "ai";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { skillPromptForPhaseB } from "@/lib/director/load-skill-prompt";
import { directorModel } from "@/lib/director/model";
import { phaseBSchema } from "@/lib/director/schemas";
import type { PhaseAProposal, PhaseBPackage, VoLanguage } from "@/types/project";
import type { Skill } from "@/types/skill";

export async function runPhaseB(input: {
  skill: Skill;
  phaseA: PhaseAProposal;
  language?: VoLanguage;
  characterImageUrl?: string;
}): Promise<PhaseBPackage> {
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: phaseBSchema }),
    system: `${skillPromptForPhaseB(input.skill)}

You are executing Phase B only after explicit approval of the current Phase A.
Return standalone Wan 3 video prompts that follow the skill prompt contract. Do not invent new facts.
Each clip is image-to-video: the approved START storyboard frame is supplied as the first frame and the END frame as a reference, so describe the motion from the start state to the end state rather than re-describing the static scene.
Spoken dialogue in every prompt must be quoted verbatim from the approved englishVo lines, which are in ${language.label} (${language.sublabel}). Tell the video model explicitly that the narrator speaks ${language.label}.`,
    prompt: `Approved Phase A JSON:
${JSON.stringify(input.phaseA, null, 2)}

Voiceover language: ${language.label} (${language.sublabel})
Character reference image: ${input.characterImageUrl || "none"}

Write the Phase B production package now.`,
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  return output;
}
