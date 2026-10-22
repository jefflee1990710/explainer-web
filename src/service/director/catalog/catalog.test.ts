import assert from "node:assert/strict";
import test from "node:test";
import { DIRECTOR_SLUGS } from "@/model/director";
import {
  DIRECTORS,
  DIRECTORS_BY_ID,
  DIRECTORS_BY_SLUG,
  getDirectorById,
  getDirectorBySlug,
  resolveDirector,
} from "@/service/director/catalog";

test("all 15 DIRECTOR_SLUGS exist in hardcoded catalog and satisfy IDirector", () => {
  assert.equal(DIRECTORS.length, DIRECTOR_SLUGS.length);
  for (const slug of DIRECTOR_SLUGS) {
    const director = DIRECTORS_BY_SLUG[slug];
    assert.ok(director, `missing director ${slug}`);
    assert.equal(director.slug, slug);
    assert.ok(director.title.trim().length > 0, `${slug} title`);
    assert.ok(director.description.trim().length > 0, `${slug} description`);
    assert.ok(director.systemPrompt.trim().length > 0, `${slug} systemPrompt`);
    assert.ok(director.references.length > 0, `${slug} references`);
    assert.equal(getDirectorBySlug(slug), director);
    assert.match(director._id, /^[a-f0-9]{24}$/);
    assert.equal(getDirectorById(director._id), director);
    assert.equal(DIRECTORS_BY_ID[director._id], director);
  }
});

test("IDirector.behavior encodes keyframeMode, continuity, cast count, speechMode, and self-shot camera", () => {
  assert.equal(DIRECTORS_BY_SLUG["talking-head-director"].behavior.keyframeMode, "end-is-next-start");
  assert.equal(DIRECTORS_BY_SLUG["full-body-talking-head-director"].behavior.keyframeMode, "end-is-next-start");
  assert.equal(DIRECTORS_BY_SLUG["cartoon-explainer-video-director"].behavior.keyframeMode, "start-only");
  assert.equal(DIRECTORS_BY_SLUG["cartoon-explainer-video-director"].behavior.dualBeat, true);
  assert.equal(DIRECTORS_BY_SLUG["dialogue-qa-director"].behavior.requiredCastCount, 2);
  assert.equal(DIRECTORS_BY_SLUG["listicle-director"].behavior.forcesSceneText, true);
  assert.equal(DIRECTORS_BY_SLUG["surprise-interview-director"].behavior.bansNarration, true);
  assert.equal(DIRECTORS_BY_SLUG["outfit-reel-director"].behavior.speechMode, "silent");
  assert.equal(DIRECTORS_BY_SLUG["outfit-reel-director"].behavior.hiddenInPicker, true);
});

test("resolveDirector falls back unknown or legacy custom IDs to cartoon-explainer-video-director", () => {
  assert.equal(resolveDirector("story-short-director").slug, "story-short-director");
  assert.equal(resolveDirector("custom-deadbeef").slug, "cartoon-explainer-video-director");
  assert.equal(resolveDirector(undefined).slug, "cartoon-explainer-video-director");
});
