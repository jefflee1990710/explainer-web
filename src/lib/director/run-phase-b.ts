import { generateText, Output } from "ai";
import { skillPromptForPhaseB } from "@/lib/director/load-skill-prompt";
import { phaseBSchema } from "@/lib/director/schemas";
import type { PhaseAProposal, PhaseBPackage } from "@/types/project";
import type { Skill } from "@/types/skill";

const DIRECTOR_MODEL = process.env.DIRECTOR_MODEL || "anthropic/claude-sonnet-4.6";

export async function runPhaseB(input: {
  skill: Skill;
  phaseA: PhaseAProposal;
  characterImageUrl?: string;
}): Promise<PhaseBPackage> {
  const { output } = await generateText({
    model: DIRECTOR_MODEL,
    output: Output.object({ schema: phaseBSchema }),
    system: `${skillPromptForPhaseB(input.skill)}

You are executing Phase B only after explicit approval of the current Phase A.
Return standalone Wan 3 video prompts that follow the skill prompt contract. Do not invent new facts.`,
    prompt: `Approved Phase A JSON:
${JSON.stringify(input.phaseA, null, 2)}

Character reference image: ${input.characterImageUrl || "none"}

Write the Phase B production package now.`,
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  return output;
}
