import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_CREATORS, CREATOR_CATEGORIES } from "@/service/academy/creator-database";
import { ACADEMY_HOOKS, HOOK_SHAPES } from "@/service/academy/hook-database";

test("the hook database lists only the Scro speed hook", () => {
  assert.equal(HOOK_SHAPES[0], "speed");
  assert.equal(ACADEMY_HOOKS.length, 1);
  assert.equal(ACADEMY_HOOKS[0]?.id, "speed-downhill-coastal");
  assert.equal(ACADEMY_HOOKS[0]?.shape, "speed");
  assert.equal(ACADEMY_HOOKS[0]?.exampleHandle, "@scro.io");
  assert.equal(ACADEMY_HOOKS[0]?.exampleUrl, "https://www.instagram.com/p/De5rxgaxSYn/");
  assert.ok((ACADEMY_HOOKS[0]?.line.length ?? 0) > 0);
  assert.ok((ACADEMY_HOOKS[0]?.note.length ?? 0) > 0);
  assert.ok((ACADEMY_HOOKS[0]?.exampleCaption.length ?? 0) > 0);
});

test("the creator database covers every creator category with Instagram profile and reel links", () => {
  assert.equal(CREATOR_CATEGORIES.length, 5);
  assert.equal(ACADEMY_CREATORS[0]?.handle, "@scro.io");
  assert.equal(ACADEMY_CREATORS[0]?.exampleUrl, "https://www.instagram.com/p/De5rxgaxSYn/");

  const ids = ACADEMY_CREATORS.map((creator) => creator.id);
  const handles = ACADEMY_CREATORS.map((creator) => creator.handle);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(handles).size, handles.length);

  for (const category of CREATOR_CATEGORIES) {
    const rows = ACADEMY_CREATORS.filter((creator) => creator.category === category);
    assert.ok(rows.length >= 3, category);
    assert.ok(
      rows.every(
        (creator) =>
          creator.name.trim().length > 0 &&
          creator.handle.startsWith("@") &&
          creator.specialty.trim().length > 0 &&
          creator.signatureHook.trim().length > 0 &&
          creator.stealThis.trim().length > 0 &&
          /^https:\/\/www\.instagram\.com\/[^/]+\/$/.test(creator.profileUrl) &&
          /^https:\/\/www\.instagram\.com\/(p|reel)\//.test(creator.exampleUrl),
      ),
    );
  }
});
