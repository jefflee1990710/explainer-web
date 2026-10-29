import assert from "node:assert/strict";
import test from "node:test";
import {
  compileDirectorPrompts,
  DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
  normalizeDirectorBehavior,
} from "@/service/director/compile-director-prompts";
import { emptyProfile } from "@/service/director/profile";

test("compileDirectorPrompts builds standalone systemPrompt and Phase A/B references from profile, behavior, and extraInstructions", () => {
  const compiled = compileDirectorPrompts({
    slug: "director-abc123",
    title: "Coffee Shop Founder Interview",
    description: "Warm 15-degree off-camera interview with espresso B-roll.",
    behavior: {
      ...DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
      speechMode: "lip-sync",
      bansNarration: true,
      audioFirstLipSync: true,
    },
    profile: {
      ...emptyProfile(),
      bestFor: "Founder stories and artisan product launches",
      hook: "Opens on a candid confession while pouring espresso",
      visual: "Warm café window light, 50mm f/1.8 shallow bokeh",
    },
    extraInstructions: "Always end on a warm sip of coffee.",
  });

  assert.match(compiled.systemPrompt, /Coffee Shop Founder Interview/);
  assert.match(compiled.systemPrompt, /Founder stories and artisan product launches/);
  assert.match(compiled.systemPrompt, /Always end on a warm sip of coffee/);
  assert.match(compiled.systemPrompt, /lip-sync/i);
  assert.equal(compiled.references.length, 2);
  assert.equal(compiled.references[0].path, "references/proposal-contract.md");
  assert.equal(compiled.references[1].path, "references/prompt-contract.md");
});

test("normalizeDirectorBehavior keeps bansNarration and audioFirstLipSync consistent with speechMode", () => {
  const lipSync = normalizeDirectorBehavior({ speechMode: "lip-sync", audioFirstLipSync: true });
  assert.equal(lipSync.bansNarration, true);
  assert.equal(lipSync.audioFirstLipSync, true);
  assert.equal(lipSync.talkingHeadShot, "face");

  const narrator = normalizeDirectorBehavior({ speechMode: "narrator", audioFirstLipSync: true });
  assert.equal(narrator.bansNarration, false);
  assert.equal(narrator.audioFirstLipSync, false);
});
