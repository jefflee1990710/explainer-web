import { styleBlockForDirector, type StylePromptSlice } from "@/service/style";
import { isSelfShotCreatorSkill, styleForSelfShotSkill } from "@/service/style/realistic-light";
import type { Skill, SkillReference } from "@/model/skill";

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

export function skillPromptForPhaseA(
  skill: Skill,
  style: StylePromptSlice & { id?: string; baseStyleId?: string },
) {
  const prompt = attachReferences(
    skill,
    (ref) => !isPhaseBRef(ref) && !isExampleRef(ref),
  );
  const effectiveStyle = isSelfShotCreatorSkill(skill.slug) ? styleForSelfShotSkill(style) : style;
  return `${prompt}\n\n${styleBlockForDirector(effectiveStyle)}`;
}

export function skillPromptForPhaseB(
  skill: Skill,
  style: StylePromptSlice & { id?: string; baseStyleId?: string },
) {
  const effectiveStyle = isSelfShotCreatorSkill(skill.slug) ? styleForSelfShotSkill(style) : style;
  return `${attachReferences(skill, isPhaseBRef)}\n\n${styleBlockForDirector(effectiveStyle)}`;
}
