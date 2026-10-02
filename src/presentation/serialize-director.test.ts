import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { PROFILE_KEYS, type Skill } from "@/model/skill";
import { toPublicDirector } from "@/presentation/serialize";
import { emptyProfile } from "@/service/director/profile";

const SECRET = "SECRET TEMPLATE PROMPT LINE";

function base(overrides: Partial<Skill>): Skill {
  return {
    _id: new ObjectId(),
    slug: "opening-director",
    title: "Opening",
    titleZh: "開場",
    description: "d",
    systemPrompt: SECRET,
    references: [{ path: "references/x.md", content: SECRET }],
    inputSchema: { requiresSource: true, aspectRatios: ["16:9"], durationPresets: ["micro"], optionalCharacterImage: true },
    higgsfieldDefaults: { imageModel: "i", imageQuality: "medium", imageResolution: "1k", videoModel: "v" },
    isActive: true,
    sortOrder: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const full = Object.fromEntries(PROFILE_KEYS.map((key) => [key, key])) as ReturnType<typeof emptyProfile>;

test("system director exposes the bilingual profile but never the prompt", () => {
  const director = toPublicDirector(base({ profile: { en: full, "zh-Hant": full } }));
  assert.equal("systemPrompt" in director, false);
  assert.equal("references" in director, false);
  assert.equal(JSON.stringify(director).includes(SECRET), false);
  assert.deepEqual(director.profile?.en, full);
  assert.equal(director.customProfile, undefined);
});

test("custom director exposes its own profile and extra instructions", () => {
  const director = toPublicDirector(
    base({ slug: "custom-1", baseSlug: "opening-director", ownerClerkUserId: "u1", customProfile: full, extraInstructions: "x" }),
  );
  assert.equal(JSON.stringify(director).includes(SECRET), false);
  assert.deepEqual(director.customProfile, full);
  assert.equal(director.extraInstructions, "x");
  assert.equal(director.profile, undefined);
});

test("custom director without stored fields gets empty ones", () => {
  const director = toPublicDirector(base({ slug: "custom-1", baseSlug: "opening-director", ownerClerkUserId: "u1" }));
  assert.deepEqual(director.customProfile, emptyProfile());
  assert.equal(director.extraInstructions, "");
});
