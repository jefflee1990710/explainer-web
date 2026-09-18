import { styleBlockForDirector, type Style } from "@/lib/styles";
import type { Skill } from "@/types/skill";

const PHASE_A_REFS = [
  "references/traffic-and-hooks.md",
  "references/storyboard-template.md",
];

const PHASE_B_REFS = ["references/omni-flash-prompt-contract.md"];

function attachReferences(skill: Skill, paths: string[]) {
  const extras = skill.references
    .filter((ref) => paths.some((path) => ref.path.endsWith(path)))
    .map((ref) => `\n\n# ${ref.path}\n\n${ref.content}`)
    .join("");
  return `${skill.systemPrompt}${extras}`;
}

export function skillPromptForPhaseA(skill: Skill, style: Style) {
  return `${attachReferences(skill, PHASE_A_REFS)}\n\n${styleBlockForDirector(style)}`;
}

export function skillPromptForPhaseB(skill: Skill, style: Style) {
  return `${attachReferences(skill, PHASE_B_REFS)}\n\n${styleBlockForDirector(style)}`;
}
