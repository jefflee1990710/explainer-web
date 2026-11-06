import { styleBlockForDirector, type StylePromptSlice } from "@/service/style";
import { isDiagramExplainerSkill } from "@/service/director/explainer-family";
import { isSelfShotCreatorSkill, styleForSelfShotSkill } from "@/service/style/realistic-light";
import type { Skill, SkillReference } from "@/model/skill";

function styleForExplainerSkill<
  T extends StylePromptSlice & { id?: string; baseStyleId?: string },
>(style: T): T {
  return {
    ...style,
    motion:
      "100% locked stationary square-on camera on tripod (ZERO zoom-in, ZERO push-in, ZERO pull-out, ZERO focal-length change, ZERO handheld drift) paired with fast, high-energy speed-ramped (變速) on-board cutout transitions and presenter pointing gestures: every 1.0–1.5s beat uses a quick 0.2s anticipation, a sharp 2x–3x high-velocity whip/snap acceleration (sliding in/out, unfolding flat 摺開, tearing/peeling open 撕開, rapid stroke-by-stroke drawing 畫出, or flipping 翻轉), and a crisp sudden stop at the focus point.",
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
  const effectiveStyle = isSelfShotCreatorSkill(skill.slug)
    ? styleForSelfShotSkill(style)
    : isDiagramExplainerSkill(skill.slug)
      ? styleForExplainerSkill(style)
      : style;
  return `${prompt}\n\n${styleBlockForDirector(effectiveStyle)}`;
}

export function skillPromptForPhaseB(
  skill: Skill,
  style: StylePromptSlice & { id?: string; baseStyleId?: string },
) {
  const effectiveStyle = isSelfShotCreatorSkill(skill.slug)
    ? styleForSelfShotSkill(style)
    : isDiagramExplainerSkill(skill.slug)
      ? styleForExplainerSkill(style)
      : style;
  return `${attachReferences(skill, isPhaseBRef)}\n\n${styleBlockForDirector(effectiveStyle)}`;
}
