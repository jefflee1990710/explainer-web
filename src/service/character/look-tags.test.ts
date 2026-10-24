import assert from "node:assert/strict";
import test from "node:test";
import {
  lookOptionDescription,
  lookOptionTags,
  optionMatchesLookTags,
} from "@/service/character/look-tags";

test("lookOptionDescription prefers explicit description over prompt", () => {
  assert.equal(
    lookOptionDescription({
      id: "x",
      prompt: "prompt text",
      description: " short desc ",
    }),
    "short desc",
  );
  assert.equal(lookOptionDescription({ id: "x", prompt: "only prompt" }), "only prompt");
});

test("lookOptionTags merges explicit tags with pickleball / sport inference", () => {
  const tags = lookOptionTags("pants", {
    id: "sppeekabooskort",
    prompt: "Flowing coral athletic Peek-A-Boo pickleball skort. Isolated wardrobe piece sppeekabooskort.",
    tags: ["summer"],
  });
  assert.ok(tags.includes("summer"));
  assert.ok(tags.includes("pickleball"));
  assert.ok(tags.includes("athletic"));
  assert.ok(tags.includes("pants"));
});

test("optionMatchesLookTags requires every requested tag", () => {
  const option = {
    id: "spyogawraptop",
    prompt: "Soft dusty-sage ribbed modal pilates ballet wrap crop top. Isolated wardrobe piece spyogawraptop.",
  };
  assert.equal(optionMatchesLookTags("top", option, ["yoga"]), true);
  assert.equal(optionMatchesLookTags("top", option, ["yoga", "pickleball"]), false);
});
