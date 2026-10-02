import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ruleSlugFor,
  selectedSkillSlugFor,
} from "@/presentation/components/app/projects/new/skill-selection";

const skills = [
  { id: "s1", slug: "talking-head-director", behaviorSlug: "talking-head-director" },
  { id: "c1", slug: "custom-abc123", behaviorSlug: "talking-head-director" },
];

test("selectedSkillSlugFor picks the custom slug by skill id", () => {
  assert.equal(
    selectedSkillSlugFor({ skillId: "c1", skillSlug: "talking-head-director" }, skills),
    "custom-abc123",
  );
});

test("selectedSkillSlugFor falls back to the stored slug when the skill is gone", () => {
  assert.equal(
    selectedSkillSlugFor({ skillId: "deleted", skillSlug: "talking-head-director" }, skills),
    "talking-head-director",
  );
});

test("ruleSlugFor maps a custom slug to its template behaviour", () => {
  assert.equal(ruleSlugFor("custom-abc123", skills), "talking-head-director");
});

test("ruleSlugFor keeps an unknown slug as-is", () => {
  assert.equal(ruleSlugFor("story-short-director", skills), "story-short-director");
});
