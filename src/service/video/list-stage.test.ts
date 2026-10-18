import assert from "node:assert/strict";
import { test } from "node:test";
import type { GenerationDetailTag } from "@/service/clip-stage";
import {
  resolvedArchivedAt,
  videoListFiltersFromSearch,
  videoListFiltersSearchValue,
  videoListStage,
} from "@/service/video/list-stage";

const scene = (state: GenerationDetailTag["state"]): GenerationDetailTag => ({
  clipNumber: 1,
  kind: "scene",
  state,
});
const video = (state: GenerationDetailTag["state"]): GenerationDetailTag => ({
  clipNumber: 1,
  kind: "video",
  state,
});

test("the director writing, or a failed plan, is director planning", () => {
  assert.equal(videoListStage({ status: "phase_a", tags: [] }), "director");
  assert.equal(videoListStage({ status: "draft", tags: [] }), "director");
  assert.equal(videoListStage({ status: "failed", tags: [] }), "director");
});

test("scene images that are running or not finished stay in scene generating", () => {
  assert.equal(
    videoListStage({ status: "production", tags: [scene("busy"), video("pending")] }),
    "scenes",
  );
  assert.equal(
    videoListStage({ status: "production", tags: [scene("pending"), video("pending")] }),
    "scenes",
  );
});

test("a clip video in flight is video generating, even if it was posted before", () => {
  assert.equal(
    videoListStage({
      status: "production",
      tags: [scene("ready"), video("busy")],
      postedAt: "2026-01-01T00:00:00.000Z",
    }),
    "videos",
  );
});

test("images done and the video not started is pending video", () => {
  assert.equal(
    videoListStage({ status: "production", tags: [scene("ready"), video("pending")] }),
    "pending_video",
  );
  assert.equal(
    videoListStage({ status: "production", tags: [scene("ready"), video("failed")] }),
    "pending_video",
  );
});

test("the list opens on director planning, generating, pending video, and pending to post unless the url names filters", () => {
  assert.deepEqual(videoListFiltersFromSearch(null), [
    "director",
    "scenes",
    "videos",
    "pending_video",
    "pending_post",
  ]);
  assert.deepEqual(videoListFiltersFromSearch(undefined), [
    "director",
    "scenes",
    "videos",
    "pending_video",
    "pending_post",
  ]);
  assert.deepEqual(videoListFiltersFromSearch("nope"), [
    "director",
    "scenes",
    "videos",
    "pending_video",
    "pending_post",
  ]);
  assert.deepEqual(videoListFiltersFromSearch("posted"), ["posted"]);
  assert.deepEqual(videoListFiltersFromSearch("posted,pending_video"), ["pending_video", "posted"]);
  assert.deepEqual(videoListFiltersFromSearch("all"), [
    "director",
    "scenes",
    "videos",
    "pending_video",
    "pending_post",
    "posted",
    "archived",
  ]);
  assert.deepEqual(videoListFiltersFromSearch("none"), []);
  assert.equal(videoListFiltersSearchValue(["pending_post", "pending_video"]), "pending_video,pending_post");
  assert.equal(videoListFiltersSearchValue([]), "none");
  assert.equal(
    videoListFiltersSearchValue([
      "director",
      "scenes",
      "videos",
      "pending_video",
      "pending_post",
      "posted",
      "archived",
    ]),
    "all",
  );
});

test("a finished video is pending to post until the user marks it posted", () => {
  const tags = [scene("ready"), video("ready")];
  assert.equal(videoListStage({ status: "ready", tags }), "pending_post");
  assert.equal(
    videoListStage({ status: "ready", tags, postedAt: "2026-01-01T00:00:00.000Z" }),
    "posted",
  );
});

test("an optimistic unarchive clears a stale archivedAt, and an optimistic archive wins", () => {
  assert.equal(resolvedArchivedAt("2026-01-02T00:00:00.000Z", null), undefined);
  assert.equal(resolvedArchivedAt("2026-01-02T00:00:00.000Z", undefined), "2026-01-02T00:00:00.000Z");
  assert.equal(
    resolvedArchivedAt(undefined, "2026-01-03T00:00:00.000Z"),
    "2026-01-03T00:00:00.000Z",
  );
  assert.equal(
    videoListStage({
      status: "ready",
      tags: [scene("ready"), video("ready")],
      postedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: resolvedArchivedAt("2026-01-02T00:00:00.000Z", null),
    }),
    "posted",
  );
});

test("any video with archivedAt is archived, ahead of posted or in-flight work", () => {
  const tags = [scene("ready"), video("ready")];
  assert.equal(
    videoListStage({ status: "ready", tags, archivedAt: "2026-01-02T00:00:00.000Z" }),
    "archived",
  );
  assert.equal(
    videoListStage({
      status: "ready",
      tags,
      postedAt: "2026-01-01T00:00:00.000Z",
      archivedAt: "2026-01-02T00:00:00.000Z",
    }),
    "archived",
  );
  assert.equal(
    videoListStage({ status: "draft", tags: [], archivedAt: "2026-01-02T00:00:00.000Z" }),
    "archived",
  );
  assert.equal(
    videoListStage({
      status: "production",
      tags: [scene("busy"), video("pending")],
      archivedAt: "2026-01-02T00:00:00.000Z",
    }),
    "archived",
  );
});
