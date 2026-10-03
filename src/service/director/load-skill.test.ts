import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Skill } from "@/model/skill";
import { loadStoredSkill } from "@/service/director/load-skill";

function skill(id: ObjectId, owner?: string): Skill {
  return {
    _id: id,
    slug: owner ? `custom-${id.toHexString()}` : "doodle-director",
    title: owner ? "Mine" : "System",
    description: "",
    systemPrompt: "",
    references: [],
    inputSchema: { requiresSource: true, aspectRatios: ["16:9"], durationPresets: [], optionalCharacterImage: false },
    higgsfieldDefaults: { imageModel: "", imageQuality: "low", imageResolution: "1k", videoModel: "" },
    isActive: !owner,
    sortOrder: 0,
    ...(owner ? { ownerClerkUserId: owner, baseSlug: "listicle-director", deletedAt: new Date("2026-01-01") } : {}),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

test("a system skill id is read from skills and does not consult user directors", async () => {
  const id = new ObjectId();
  let customReads = 0;
  const found = await loadStoredSkill(id, {
    findInSkills: async () => skill(id),
    findInUserDirectors: async () => {
      customReads += 1;
      return null;
    },
  });
  assert.equal(found?.title, "System");
  assert.equal(customReads, 0);
});

test("a video skillId missing from skills is loaded from user directors, including after delete", async () => {
  const id = new ObjectId();
  const found = await loadStoredSkill(id, {
    findInSkills: async () => null,
    findInUserDirectors: async (lookup) => (lookup.equals(id) ? skill(id, "user_1") : null),
  });
  assert.equal(found?._id.equals(id), true);
  assert.equal(found?.ownerClerkUserId, "user_1");
  assert.ok(found?.deletedAt);
});

test("an unknown skill id is missing from both collections", async () => {
  const found = await loadStoredSkill(new ObjectId(), {
    findInSkills: async () => null,
    findInUserDirectors: async () => null,
  });
  assert.equal(found, null);
});
