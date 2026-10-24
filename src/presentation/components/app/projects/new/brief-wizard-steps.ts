import type { AspectRatio } from "@/model/project";
import type { ReferenceImageDraft } from "@/presentation/components/app/projects/new/reference-images-field";

export type BriefWizardStepIndex = 0 | 1 | 2 | 3;

export type BriefWizardStepMeta = {
  index: BriefWizardStepIndex;
  id: "style" | "script" | "drafts" | "specs";
  number: "01" | "02" | "03" | "04";
  titleKey: string;
  subtitleKey: string;
};

// Ordered 4-step structure for the create-video brief wizard (Step 04 Storyboard Drafts is optional and uses the aspect ratio chosen in Step 03).
export const BRIEF_WIZARD_STEPS: readonly BriefWizardStepMeta[] = [
  {
    index: 0,
    id: "style",
    number: "01",
    titleKey: "brief.wizard.step1Title",
    subtitleKey: "brief.wizard.step1Subtitle",
  },
  {
    index: 1,
    id: "script",
    number: "02",
    titleKey: "brief.wizard.step2Title",
    subtitleKey: "brief.wizard.step2Subtitle",
  },
  {
    index: 2,
    id: "specs",
    number: "03",
    titleKey: "brief.wizard.step3Title",
    subtitleKey: "brief.wizard.step3Subtitle",
  },
  {
    index: 3,
    id: "drafts",
    number: "04",
    titleKey: "brief.wizard.step3DraftsTitle",
    subtitleKey: "brief.wizard.step3DraftsSubtitle",
  },
] as const;

export type BriefWizardValidationState = {
  skillSlug: string;
  castNeed: number;
  characterIds: string[];
  source: string;
  talkingHead: boolean;
  spokenScript: string;
  referenceImages: ReferenceImageDraft[];
  aspectRatio: AspectRatio | "";
};

// Step 1: Director skill chosen and required cast count satisfied.
export function isStep1Valid(state: BriefWizardValidationState): boolean {
  return (
    state.skillSlug.trim().length > 0 &&
    (state.castNeed === 0 || state.characterIds.length === state.castNeed)
  );
}

// Step 2: Source instructions present, talking-head script filled when required, and reference images described.
export function isStep2Valid(state: BriefWizardValidationState): boolean {
  return (
    state.source.trim().length > 0 &&
    (!state.talkingHead || state.spokenScript.trim().length > 0) &&
    state.referenceImages.every((item) => item.description.trim().length > 0)
  );
}

// Step 3 (Voice & Specs): Aspect ratio selected so Step 4 (Storyboard Drafts) knows the canvas aspect ratio.
export function isStep3Valid(state: BriefWizardValidationState): boolean {
  return state.aspectRatio !== "";
}

// Highest wizard step index unlocked by the user's current form state.
// Step 3 (04 Storyboard Drafts) unlocks once Step 1, Step 2, and Step 3 (aspect ratio) are valid.
export function maxReachableWizardStep(
  state: BriefWizardValidationState,
): BriefWizardStepIndex {
  if (!isStep1Valid(state)) return 0;
  if (!isStep2Valid(state)) return 1;
  if (!isStep3Valid(state)) return 2;
  return 3;
}

// Whether the user can advance from the given wizard step (or submit on the final step).
export function canAdvanceFromWizardStep(
  step: BriefWizardStepIndex,
  state: BriefWizardValidationState,
): boolean {
  if (step === 0) return isStep1Valid(state);
  if (step === 1) return isStep1Valid(state) && isStep2Valid(state);
  if (step === 2) return isStep1Valid(state) && isStep2Valid(state) && isStep3Valid(state);
  return isStep1Valid(state) && isStep2Valid(state) && isStep3Valid(state);
}
