import assert from "node:assert/strict";
import { test } from "node:test";
import { sceneLockPlan } from "@/service/higgsfield/scene-character-lock";

test("a standing profile is the one character lock", () => {
  assert.deepEqual(
    sceneLockPlan({
      profileUrl: "https://blob/standing.png",
      blueprintWidth: 1344,
      blueprintHeight: 752,
    }),
    { kind: "profile", url: "https://blob/standing.png" },
  );
});

test("a wide sheet without a profile uses the front figure only", () => {
  assert.deepEqual(sceneLockPlan({ blueprintWidth: 1344, blueprintHeight: 752 }), { kind: "front" });
});

test("an already-single portrait stays as the blueprint", () => {
  assert.deepEqual(sceneLockPlan({ blueprintWidth: 720, blueprintHeight: 1280 }), { kind: "blueprint" });
});
