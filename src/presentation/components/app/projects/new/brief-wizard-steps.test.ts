import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRIEF_WIZARD_STEPS,
  canAdvanceFromWizardStep,
  isStep1Valid,
  isStep2Valid,
  isStep3Valid,
  maxReachableWizardStep,
  type BriefWizardValidationState,
} from "@/presentation/components/app/projects/new/brief-wizard-steps";

function baseState(
  over: Partial<BriefWizardValidationState> = {},
): BriefWizardValidationState {
  return {
    skillSlug: "cartoon-explainer-video-director",
    castNeed: 1,
    characterIds: ["char-1"],
    source: "Explain compound interest in three simple beats.",
    talkingHead: false,
    spokenScript: "",
    referenceImages: [],
    aspectRatio: "9:16",
    ...over,
  };
}

test("BRIEF_WIZARD_STEPS exposes 4 ordered steps including optional storyboard drafts", () => {
  assert.equal(BRIEF_WIZARD_STEPS.length, 4);
  assert.deepEqual(
    BRIEF_WIZARD_STEPS.map((s) => s.number),
    ["01", "02", "03", "04"],
  );
});

test("step 1 requires skillSlug and exact required cast count", () => {
  assert.equal(isStep1Valid(baseState()), true);
  assert.equal(isStep1Valid(baseState({ skillSlug: "" })), false);
  assert.equal(isStep1Valid(baseState({ castNeed: 2, characterIds: ["char-1"] })), false);
  assert.equal(
    isStep1Valid(baseState({ castNeed: 2, characterIds: ["char-1", "char-2"] })),
    true,
  );
  assert.equal(isStep1Valid(baseState({ castNeed: 0, characterIds: [] })), true);
});

test("step 2 requires non-empty source, talking-head script when applicable, and reference descriptions", () => {
  assert.equal(isStep2Valid(baseState()), true);
  assert.equal(isStep2Valid(baseState({ source: "   " })), false);
  assert.equal(
    isStep2Valid(baseState({ talkingHead: true, spokenScript: "   " })),
    false,
  );
  assert.equal(
    isStep2Valid(baseState({ talkingHead: true, spokenScript: "Hello world." })),
    true,
  );
  assert.equal(
    isStep2Valid(
      baseState({
        referenceImages: [{ url: "https://example.com/a.png", description: "  " }],
      }),
    ),
    false,
  );
  assert.equal(
    isStep2Valid(
      baseState({
        referenceImages: [{ url: "https://example.com/a.png", description: "Hero prop" }],
      }),
    ),
    true,
  );
});

test("step 3 requires aspectRatio and maxReachableWizardStep unlocks progressively", () => {
  assert.equal(isStep3Valid(baseState({ aspectRatio: "" })), false);
  assert.equal(isStep3Valid(baseState({ aspectRatio: "16:9" })), true);

  // Step 1 incomplete -> stays at step 0
  assert.equal(
    maxReachableWizardStep(baseState({ castNeed: 1, characterIds: [] })),
    0,
  );
  // Step 1 valid, Step 2 incomplete -> unlocks up to step 1
  assert.equal(
    maxReachableWizardStep(baseState({ source: "" })),
    1,
  );
  // Step 1 & Step 2 valid -> unlocks both Step 2 (optional drafts) and Step 3 (specs)
  assert.equal(maxReachableWizardStep(baseState({ aspectRatio: "" })), 3);

  assert.equal(canAdvanceFromWizardStep(0, baseState({ source: "" })), true);
  assert.equal(canAdvanceFromWizardStep(1, baseState({ source: "" })), false);
  assert.equal(canAdvanceFromWizardStep(1, baseState()), true);
  assert.equal(canAdvanceFromWizardStep(2, baseState({ aspectRatio: "" })), true);
  assert.equal(canAdvanceFromWizardStep(3, baseState({ aspectRatio: "" })), false);
  assert.equal(canAdvanceFromWizardStep(3, baseState()), true);
});
