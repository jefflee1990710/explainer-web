import { styleBlockForDirector, type StylePromptSlice } from "@/service/style";
import { explainerCanvasKind, isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { isSelfShotCreatorSkill, styleForSelfShotSkill } from "@/service/style/realistic-light";
import type { Skill, SkillReference } from "@/model/skill";

function styleForExplainerSkill<
  T extends StylePromptSlice & { id?: string; baseStyleId?: string },
>(style: T): T {
  return {
    ...style,
    motion:
      "100% locked stationary square-on camera (no zoom, no pan, no tilt, no jump cut). Animate every element transition and pointing gesture smoothly and continuously from the start frame to the end frame with natural ease-in-out motion.",
  };
}

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
  const canvasKind = explainerCanvasKind(skill.slug);
  const effectiveStyle = isSelfShotCreatorSkill(skill.slug)
    ? styleForSelfShotSkill(style)
    : isDiagramExplainerSkill(skill.slug) && canvasKind !== "papercraft-diorama"
      ? styleForExplainerSkill(style)
      : style;
  return `${prompt}\n\n${styleBlockForDirector(effectiveStyle)}`;
}

export function skillPromptForPhaseB(
  skill: Skill,
  style: StylePromptSlice & { id?: string; baseStyleId?: string },
) {
  const canvasKind = explainerCanvasKind(skill.slug);
  if (isDiagramExplainerSkill(skill.slug)) {
    return styleBlockForDirector(
      canvasKind === "papercraft-diorama" ? style : styleForExplainerSkill(style),
    );
  }
  const effectiveStyle = isSelfShotCreatorSkill(skill.slug)
    ? styleForSelfShotSkill(style)
    : style;
  return `${attachReferences(skill, isPhaseBRef)}\n\n${styleBlockForDirector(effectiveStyle)}`;
}
