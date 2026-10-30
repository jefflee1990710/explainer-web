import assert from "node:assert/strict";
import { test } from "node:test";
import {
  folderPath,
  folderVideoMatchesTask,
  folderVideoPath,
  folderVideoRedirectFromQuery,
} from "@/service/folder-video-path";

test("folder path is the project video list or dashboard when omitted", () => {
  assert.equal(folderPath("f1"), "/app/projects/f1");
  assert.equal(folderPath(""), "/app?stay=1");
  assert.equal(folderPath(undefined), "/app?stay=1");
});

test("folder video path supports both folder-scoped and standalone editor routes", () => {
  assert.equal(folderVideoPath("f1"), "/app/projects/f1/videos/new");
  assert.equal(folderVideoPath("f1", "v1"), "/app/projects/f1/videos/v1");
  assert.equal(folderVideoPath(""), "/app/videos/new");
  assert.equal(folderVideoPath(undefined), "/app/videos/new");
  assert.equal(folderVideoPath("", "v1"), "/app/videos/v1");
  assert.equal(folderVideoPath(undefined, "v1"), "/app/videos/v1");
});

test("legacy query maps to the editor route", () => {
  assert.equal(folderVideoRedirectFromQuery("f1", "v1"), "/app/projects/f1/videos/v1");
  assert.equal(folderVideoRedirectFromQuery("", "v1"), "/app/videos/v1");
  assert.equal(folderVideoRedirectFromQuery("f1", null), null);
  assert.equal(folderVideoRedirectFromQuery("f1", ""), null);
});

test("task href matches a video on the new or legacy path", () => {
  assert.equal(folderVideoMatchesTask("/app/projects/f1/videos/v1", "v1"), true);
  assert.equal(folderVideoMatchesTask("/app/videos/v1", "v1"), true);
  assert.equal(folderVideoMatchesTask("/app/projects/f1?video=v1", "v1"), true);
  assert.equal(folderVideoMatchesTask("/app/projects/f1/videos/other", "v1"), false);
});
