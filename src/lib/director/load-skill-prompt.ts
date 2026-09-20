import { styleBlockForDirector, type Style } from "@/lib/styles";
import type { Skill, SkillReference } from "@/types/skill";

// Reference routing by filename convention (shared by every skill directory):
// - `*prompt-contract.md`  → Phase B only (per-clip video prompt rules)
// - `examples.md`          → never attached (too long; SKILL.md may cite it)
// - everything else        → Phase A (hooks, proposal / storyboard contract)
function isPhaseBRef(ref: SkillReference) {
  return ref.path.endsWith("prompt-contract.md");
}

function isExampleRef(ref: SkillReference) {
  return ref.path.endsWith("examples.md");
}

function attachReferences(skill: Skill, keep: (ref: SkillReference) => boolean) {
  const extras = skill.references
    .filter(keep)
    .map((ref) => `\n\n# ${ref.path}\n\n${ref.content}`)
    .join("");
  return `${skill.systemPrompt}${extras}`;
}

export function skillPromptForPhaseA(skill: Skill, style: Style) {
  const prompt = attachReferences(
    skill,
    (ref) => !isPhaseBRef(ref) && !isExampleRef(ref),
  );
  return `${prompt}\n\n${styleBlockForDirector(style)}`;
}

export function skillPromptForPhaseB(skill: Skill, style: Style) {
  return `${attachReferences(skill, isPhaseBRef)}\n\n${styleBlockForDirector(style)}`;
}
