import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Skill } from "@/model/skill";
import { selectableSkillFilter, sortSelectableSkills } from "@/service/director/selectable-skills";

// Minimal skill doc for ordering checks.
function skill(slug: string, sortOrder: number, updatedAt: Date, ownerClerkUserId?: string): Skill {
  return {
    _id: new ObjectId(),
    slug,
    title: slug,
    titleZh: slug,
    description: "",
    systemPrompt: "",
    references: [],
    inputSchema: { requiresSource: true, aspectRatios: ["16:9"], durationPresets: [], optionalCharacterImage: false },
    higgsfieldDefaults: { imageModel: "", imageQuality: "low", imageResolution: "1k", videoModel: "" },
    isActive: true,
    sortOrder,
    ...(ownerClerkUserId ? { ownerClerkUserId, baseSlug: "listicle-director" } : {}),
    createdAt: updatedAt,
    updatedAt,
  };
}

test("filter selects active system skills plus the owner's directors", () => {
  assert.deepEqual(selectableSkillFilter("user_1"), {
    isActive: true,
    $or: [{ ownerClerkUserId: { $exists: false } }, { ownerClerkUserId: "user_1" }],
  });
});

test("system skills by sortOrder first, then custom newest first", () => {
  const sorted = sortSelectableSkills([
    skill("custom-old", 0, new Date("2026-01-01"), "user_1"),
    skill("system-2", 2, new Date("2026-03-01")),
    skill("custom-new", 0, new Date("2026-02-01"), "user_1"),
    skill("system-1", 1, new Date("2026-01-01")),
  ]);
  assert.deepEqual(
    sorted.map((item) => item.slug),
    ["system-1", "system-2", "custom-new", "custom-old"],
  );
});
