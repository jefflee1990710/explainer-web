import { generateText, Output } from "ai";
import { castLineForPhaseB } from "@/lib/characters/cast-prompt";
import { LANGUAGE_PRESETS } from "@/lib/director/languages";
import { skillPromptForPhaseB } from "@/lib/director/load-skill-prompt";
import { directorModel } from "@/lib/director/model";
import { clipPhaseBUserPrompt } from "@/lib/director/phase-b-clip-prompt";
import { phaseBClipSchema, phaseBSchema } from "@/lib/director/schemas";
import type { Style } from "@/lib/styles";
import type { CastMember } from "@/types/character";
import type {
  PhaseAProposal,
  PhaseBPackage,
  PhaseBPrompt,
  VoLanguage,
} from "@/types/project";
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
Each clip is image-to-video: the approved START storyboard frame is supplied as the first frame and the END frame as a reference, so describe the motion from the start state to the end state rather than re-describing the static scene.
Spoken dialogue in every prompt must be quoted verbatim from the approved englishVo lines, which are in ${languageLabel} (${languageSublabel}). Tell the video model explicitly that the narrator speaks ${languageLabel}.`;
}

function characterLine(input: PhaseBInput) {
  return input.cast && input.cast.length > 0
    ? castLineForPhaseB(input.cast)
    : `Character reference image: ${input.characterImageUrl || "none"}`;
}

// Legacy batch runner: kept for reading old projects; the per-clip flow uses runPhaseBForClip.
export async function runPhaseB(input: PhaseBInput): Promise<PhaseBPackage> {
  const language = LANGUAGE_PRESETS[input.language || "en"];
  const { output } = await generateText({
    model: directorModel(),
    output: Output.object({ schema: phaseBSchema }),
    system: phaseBSystemPrompt(input, language.label, language.sublabel),
    prompt: `Approved Phase A JSON:
${JSON.stringify(input.phaseA, null, 2)}

Voiceover language: ${language.label} (${language.sublabel})
${characterLine(input)}

Write the Phase B production package now.`,
  });

  if (!output) {
    throw new Error("產片 prompt 產生失敗");
  }
  return output;
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
