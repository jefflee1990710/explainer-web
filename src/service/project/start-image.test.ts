import assert from "node:assert/strict";
import { test } from "node:test";
import {
  openingPhotoReference,
  parseStartImageUrl,
  talkingHeadOpeningPhotoAllowed,
} from "@/service/project/start-image";

const allow = (url: string) => url.startsWith("https://blob/");

test("opening photo follows the talking-head director on every style", () => {
  assert.equal(talkingHeadOpeningPhotoAllowed({ skillSlug: "talking-head-director" }), true);
  assert.equal(talkingHeadOpeningPhotoAllowed({ skillSlug: "full-body-talking-head-director" }), false);
  assert.equal(talkingHeadOpeningPhotoAllowed({ skillSlug: "cartoon-explainer-video-director" }), false);
});

test("parse keeps one allowed url and drops a blank", () => {
  assert.deepEqual(parseStartImageUrl("", allow), { ok: true });
  assert.deepEqual(parseStartImageUrl("  https://blob/me.png  ", allow), {
    ok: true,
    url: "https://blob/me.png",
  });
  assert.equal(parseStartImageUrl("https://evil/me.png", allow).ok, false);
});

test("only clip 1's start still uses the uploaded photo", () => {
  const project = { skillSlug: "talking-head-director", startImageUrl: "https://blob/me.png" };
  assert.equal(openingPhotoReference(project, 1, "start"), "https://blob/me.png");
  assert.equal(openingPhotoReference(project, 1, "end"), undefined);
  assert.equal(openingPhotoReference(project, 2, "start"), undefined);
  assert.equal(
    openingPhotoReference({ skillSlug: "story-short-director", startImageUrl: "https://blob/me.png" }, 1, "start"),
    undefined,
  );
});
