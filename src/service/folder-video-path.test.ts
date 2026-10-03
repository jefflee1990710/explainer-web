import assert from "node:assert/strict";
import { test } from "node:test";
import {
  folderPath,
  folderVideoMatchesTask,
  folderVideoPath,
  folderVideoRedirectFromQuery,
} from "@/service/folder-video-path";

test("folder path is the project video list", () => {
  assert.equal(folderPath("f1"), "/app/projects/f1");
});

test("folder video path is a dedicated editor route", () => {
  assert.equal(folderVideoPath("f1"), "/app/projects/f1/videos/new");
  assert.equal(folderVideoPath("f1", "v1"), "/app/projects/f1/videos/v1");
});

test("legacy query maps to the editor route", () => {
  assert.equal(folderVideoRedirectFromQuery("f1", "v1"), "/app/projects/f1/videos/v1");
  assert.equal(folderVideoRedirectFromQuery("f1", null), null);
  assert.equal(folderVideoRedirectFromQuery("f1", ""), null);
});

test("task href matches a video on the new or legacy path", () => {
  assert.equal(folderVideoMatchesTask("/app/projects/f1/videos/v1", "v1"), true);
  assert.equal(folderVideoMatchesTask("/app/projects/f1?video=v1", "v1"), true);
  assert.equal(folderVideoMatchesTask("/app/projects/f1/videos/other", "v1"), false);
});
