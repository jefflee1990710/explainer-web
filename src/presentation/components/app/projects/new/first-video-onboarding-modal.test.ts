import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveFirstVideoModalDefaults,
  shouldShowFirstVideoModal,
} from "@/presentation/components/app/projects/new/first-video-onboarding-modal";

test("resolveFirstVideoModalDefaults selects paper-cutout explainer, realistic style, and Aera character", () => {
  const defaults = resolveFirstVideoModalDefaults({
    skills: [
      { slug: "talking-head-director" },
      { slug: "paper-cutout-explainer-video-director" },
      { slug: "cartoon-explainer-video-director" },
    ],
    styles: [
      { id: "doodle" },
      { id: "realistic" },
      { id: "pixel" },
    ],
    characters: [
      {
        id: "char_other",
        name: "Liam",
        styleId: "realistic",
        styleIds: ["realistic"],
        previewUrl: "https://blob/liam.webp",
      },
      {
        id: "char_aera",
        name: "Aera",
        styleId: "realistic",
        styleIds: ["realistic", "doodle"],
        previewUrl: "https://blob/aera.webp",
      },
    ],
  });

  assert.equal(defaults.skillSlug, "paper-cutout-explainer-video-director");
  assert.equal(defaults.styleId, "realistic");
  assert.deepEqual(defaults.characterIds, ["char_aera"]);
});

test("resolveFirstVideoModalDefaults honors explicit useCase when provided", () => {
  const talkingDefaults = resolveFirstVideoModalDefaults({
    useCase: "talking-head",
    skills: [
      { slug: "talking-head-director" },
      { slug: "paper-cutout-explainer-video-director" },
    ],
    styles: [{ id: "realistic" }],
    characters: [
      {
        id: "char_aera",
        name: "Aera",
        styleId: "realistic",
        styleIds: ["realistic"],
        previewUrl: "https://blob/aera.webp",
      },
    ],
  });
  assert.equal(talkingDefaults.skillSlug, "talking-head-director");

  const storyDefaults = resolveFirstVideoModalDefaults({
    useCase: "story",
    skills: [
      { slug: "story-short-director" },
      { slug: "paper-cutout-explainer-video-director" },
    ],
    styles: [{ id: "realistic" }],
    characters: [],
  });
  assert.equal(storyDefaults.skillSlug, "story-short-director");
});

test("shouldShowFirstVideoModal opens only for 0-video users on generic new-video entry without useCase or initialPrompt", () => {
  assert.equal(
    shouldShowFirstVideoModal({
      hasAnyVideo: false,
      hasInitialVideo: false,
      dismissedInSession: false,
    }),
    true,
  );
  assert.equal(
    shouldShowFirstVideoModal({
      hasAnyVideo: false,
      hasInitialVideo: false,
      dismissedInSession: false,
      useCase: "talking-head",
    }),
    false,
  );
  assert.equal(
    shouldShowFirstVideoModal({
      hasAnyVideo: false,
      hasInitialVideo: false,
      dismissedInSession: false,
      hasInitialPrompt: true,
    }),
    false,
  );
  assert.equal(
    shouldShowFirstVideoModal({
      hasAnyVideo: true,
      hasInitialVideo: false,
      dismissedInSession: false,
    }),
    false,
  );
  assert.equal(
    shouldShowFirstVideoModal({
      hasAnyVideo: false,
      hasInitialVideo: true,
      dismissedInSession: false,
    }),
    false,
  );
  assert.equal(
    shouldShowFirstVideoModal({
      hasAnyVideo: false,
      hasInitialVideo: false,
      dismissedInSession: true,
    }),
    false,
  );
});
