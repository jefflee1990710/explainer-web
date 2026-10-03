import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import type { Skill } from "@/model/skill";
import { emptyProfile } from "@/service/director/profile";
import { MissingTemplateError, customDirectorBlock, resolveRunSkill } from "@/service/director/run-skill";

function skill(overrides: Partial<Skill>): Skill {
  return {
    _id: new ObjectId(),
    slug: "talking-head-director",
    title: "T",
    description: "",
    systemPrompt: "TEMPLATE PROMPT",
    references: [{ path: "references/a-prompt-contract.md", content: "REF" }],
    inputSchema: { requiresSource: true, aspectRatios: ["16:9"], durationPresets: ["micro"], optionalCharacterImage: true },
    higgsfieldDefaults: { imageModel: "i", imageQuality: "medium", imageResolution: "1k", videoModel: "v" },
    isActive: true,
    sortOrder: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test("customDirectorBlock lists non-empty fields in order, then extra instructions", () => {
  const profile = { ...emptyProfile(), hook: "Ask a question", bestFor: "Product news" };
  const block = customDirectorBlock(profile, "Always end on the logo");
  assert.match(block, /^\n\n# Custom director adjustments\n/);
  const best = block.indexOf("## Best for\nProduct news");
  const hook = block.indexOf("## Opening hook\nAsk a question");
  const extra = block.indexOf("## Extra instructions\nAlways end on the logo");
  assert.ok(best > 0 && hook > best && extra > hook);
  assert.equal(block.includes("## Key rules"), false);
});

test("customDirectorBlock is empty when nothing is set", () => {
  assert.equal(customDirectorBlock(emptyProfile(), "  "), "");
  assert.equal(customDirectorBlock(undefined, undefined), "");
});

test("system skill keeps its own prompt", async () => {
  const system = skill({});
  const run = await resolveRunSkill(system, async () => {
    throw new Error("must not load");
  });
  assert.equal(run.systemPrompt, "TEMPLATE PROMPT");
  assert.equal(run.slug, "talking-head-director");
});

test("custom skill runs on the template prompt plus its adjustments", async () => {
  const template = skill({});
  const custom = skill({
    slug: "custom-1",
    baseSlug: "talking-head-director",
    ownerClerkUserId: "u1",
    title: "Mine",
    systemPrompt: "",
    references: [],
    customProfile: { ...emptyProfile(), rules: "Keep it calm" },
    extraInstructions: "",
    inputSchema: { ...template.inputSchema, aspectRatios: ["9:16"] },
  });
  let asked = "";
  const run = await resolveRunSkill(custom, async (slug) => {
    asked = slug;
    return template;
  });
  assert.equal(asked, "talking-head-director");
  assert.equal(run._id, custom._id);
  assert.equal(run.slug, "talking-head-director");
  assert.equal(run.title, "Mine");
  assert.deepEqual(run.inputSchema.aspectRatios, ["9:16"]);
  assert.deepEqual(run.references, template.references);
  assert.ok(run.systemPrompt.startsWith("TEMPLATE PROMPT\n\n# Custom director adjustments"));
  assert.match(run.systemPrompt, /## Key rules\nKeep it calm/);
});

test("custom skill without a template fails with the skill-missing error", async () => {
  const custom = skill({ slug: "custom-1", baseSlug: "gone", ownerClerkUserId: "u1" });
  await assert.rejects(resolveRunSkill(custom, async () => null), (error: unknown) => {
    assert.ok(error instanceof MissingTemplateError);
    assert.match(error.message, /找不到風格/);
    return true;
  });
});

test("custom skill without a baseSlug fails without calling the loader", async () => {
  for (const baseSlug of [undefined, ""]) {
    const custom = skill({ slug: "custom-1", baseSlug, ownerClerkUserId: "u1" });
    await assert.rejects(
      resolveRunSkill(custom, async () => {
        throw new Error("must not load");
      }),
      MissingTemplateError,
    );
  }
});
