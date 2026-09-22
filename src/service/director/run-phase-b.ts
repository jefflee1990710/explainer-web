import { generateText, Output } from "ai";
import { DUAL_KEYFRAME_MOTION_RULES } from "@/service/director/dual-keyframe-motion";
import { LANGUAGE_PRESETS } from "@/service/director/languages";
import { skillPromptForPhaseB } from "@/service/director/load-skill-prompt";
import { directorModel } from "@/service/director/model";
import { clipPhaseBUserPrompt, phaseBCharacterLine } from "@/service/director/phase-b-clip-prompt";
import { phaseBClipSchema } from "@/model/director";
import type { Style } from "@/service/style";
import type { CastMember } from "@/model/character";
import type { PhaseAProposal, PhaseBPrompt, VoLanguage } from "@/model/project";
import type { Skill } from "@/model/skill";

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
Return standalone MiniMax H3 video prompts that follow the skill prompt contract. Do not invent new facts.
Each clip is dual-keyframe image-to-video: the approved START image is already attached as the first frame and the approved END image is already attached as the last frame. Describe only the motion that interpolates between those two locked images. Never call those stills a reference image. ${DUAL_KEYFRAME_MOTION_RULES} Do not invent a different final pose, camera, or composition.
Spoken lines in every prompt must be quoted verbatim from the approved englishVo field, which is in ${languageLabel} (${languageSublabel}). ${
    input.skill.slug === "story-short-director"
      ? "There is no narrator. Characters speak those lines."
      : `Tell the video model explicitly that the narrator speaks ${languageLabel}.`
  }`;
}

function characterLine(input: PhaseBInput) {
  return phaseBCharacterLine({
    cast: input.cast,
    characterImageUrl: input.characterImageUrl,
  });
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
