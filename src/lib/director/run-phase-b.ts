import { generateText, Output } from "ai";
import { castLineForPhaseB } from "@/lib/characters/cast-prompt";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { skillPromptForPhaseB } from "@/lib/director/load-skill-prompt";
import { directorModel } from "@/lib/director/model";
import { clipPhaseBUserPrompt } from "@/lib/director/phase-b-clip-prompt";
import { phaseBClipSchema } from "@/lib/director/schemas";
import type { Style } from "@/lib/styles";
import type { CastMember } from "@/types/character";
import type { PhaseAProposal, PhaseBPrompt, VoLanguage } from "@/types/project";
import type { Skill } from "@/types/skill";

type PhaseBInput = {
  skill: Skill;
  style: Style;
  phaseA: PhaseAProposal;
  language?: VoLanguage;
  characterImageUrl?: string;
  cast?: CastMember[];
};

// Shared director contract for video prompts (batch and per-clip).
function phaseBSystemPrompt(input: PhaseBInput, languageLabel: string, languageSublabel: string) {
  return `${skillPromptForPhaseB(input.skill, input.style)}

You are executing Phase B only after explicit approval of the current Phase A.
Return standalone Wan 3 video prompts that follow the skill prompt contract. Do not invent new facts.
Each clip is dual-keyframe image-to-video: the approved START image is already attached as the first frame and the approved END image is already attached as the last frame. Describe only the motion that interpolates between those two locked images. The video MUST open on the start image and MUST resolve onto the end image — do not invent a different final pose, camera, or composition.
Spoken dialogue in every prompt must be quoted verbatim from the approved englishVo lines, which are in ${languageLabel} (${languageSublabel}). Tell the video model explicitly that the narrator speaks ${languageLabel}.`;
}

function characterLine(input: PhaseBInput) {
  return input.cast && input.cast.length > 0
    ? castLineForPhaseB(input.cast)
    : `Character reference image: ${input.characterImageUrl || "none"}`;
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
      characterLine: characterLine(input),
    }),
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  // The model may echo a wrong number; trust the caller.
  return { ...output, clipNumber: input.clipNumber };
}
