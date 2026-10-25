import assert from "node:assert/strict";
import test from "node:test";
import { ACADEMY_CREATORS, CREATOR_CATEGORIES } from "@/service/academy/creator-database";
import { ACADEMY_HOOKS, HOOK_SHAPES } from "@/service/academy/hook-database";

test("the hook database starts with the speed hook example and covers all 10 hook types with Instagram examples", () => {
  assert.equal(HOOK_SHAPES.length, 10);
  assert.equal(ACADEMY_HOOKS[0]?.shape, "speed");
  assert.equal(ACADEMY_HOOKS[0]?.exampleUrl, "https://www.instagram.com/p/De5rxgaxSYn/");

  const ids = ACADEMY_HOOKS.map((hook) => hook.id);
  const lines = ACADEMY_HOOKS.map((hook) => hook.line);
  const urls = ACADEMY_HOOKS.map((hook) => hook.exampleUrl);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(lines).size, lines.length);
  assert.equal(new Set(urls).size, urls.length);

  for (const shape of HOOK_SHAPES) {
    const rows = ACADEMY_HOOKS.filter((hook) => hook.shape === shape);
    assert.ok(rows.length >= 3, shape);
    assert.ok(
      rows.every(
        (hook) =>
          hook.line.trim().length > 0 &&
          hook.note.trim().length > 0 &&
          hook.exampleHandle.startsWith("@") &&
          hook.exampleCaption.trim().length > 0 &&
          /^https:\/\/www\.instagram\.com\/(p|reel)\//.test(hook.exampleUrl),
      ),
    );
  }
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
