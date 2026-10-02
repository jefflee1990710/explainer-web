import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import { asRunSkill, behaviorSlug, customSkillSlug, isCustomSkill } from "@/service/director/behavior-slug";

test("system skill keeps its slug", () => {
  assert.equal(behaviorSlug({ slug: "listicle-director" }), "listicle-director");
});
test("custom skill uses its template slug", () => {
  assert.equal(behaviorSlug({ slug: "custom-abc", baseSlug: "talking-head-director" }), "talking-head-director");
});
test("custom slug and owner detection", () => {
  const id = new ObjectId("65f000000000000000000001");
  assert.equal(customSkillSlug(id), "custom-65f000000000000000000001");
  assert.equal(isCustomSkill({ ownerClerkUserId: "u1" }), true);
  assert.equal(isCustomSkill({}), false);
});
test("asRunSkill swaps slug only", () => {
  const skill = { slug: "custom-x", baseSlug: "ending-director", systemPrompt: "p" } as never;
  const run = asRunSkill(skill) as { slug: string; systemPrompt: string };
  assert.equal(run.slug, "ending-director");
  assert.equal(run.systemPrompt, "p");
});
