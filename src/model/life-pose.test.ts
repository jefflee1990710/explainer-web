import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  LIFE_POSE_GROUPS,
  LIFE_POSE_HANDS,
  LIFE_POSES,
  filterLifePoses,
  lifePoseById,
  lifePoseImagePath,
  lifePosePreviewSrc,
} from "@/model/life-pose";
import { lifePoseReferenceUrl } from "@/service/character/life-pose-ref";
import { LIFE_POSES_EN, LIFE_POSES_ZH } from "@/util/i18n/messages/life-poses";

test("pose ids are unique, grouped, and have a skeleton png and Scro preview webp", () => {
  const ids = LIFE_POSES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 60 && ids.length <= 100, `count ${ids.length}`);
  for (const group of LIFE_POSE_GROUPS) assert.ok(filterLifePoses(group).length >= 10, group);
  for (const pose of LIFE_POSES) {
    assert.ok(existsSync(path.join(process.cwd(), "public", lifePoseImagePath(pose.id))), pose.id);
    const previewFile = lifePosePreviewSrc(pose.id).split("?")[0];
    assert.ok(existsSync(path.join(process.cwd(), "public", previewFile)), `preview ${pose.id}`);
    assert.ok(pose.promptText.length > 30, pose.id);
    for (const hand of pose.hands) assert.ok((LIFE_POSE_HANDS as readonly string[]).includes(hand), hand);
  }
});

test("EN and zh-Hant name every pose, group and hand tag", () => {
  for (const labels of [LIFE_POSES_EN, LIFE_POSES_ZH]) {
    for (const pose of LIFE_POSES) assert.ok(labels.names[pose.id], pose.id);
    for (const group of LIFE_POSE_GROUPS) assert.ok(labels.groups[group], group);
    for (const hand of LIFE_POSE_HANDS) assert.ok(labels.hands[hand], hand);
  }
});

test("hand filter narrows the grid", () => {
  const face = filterLifePoses("sit", "face");
  assert.ok(face.length > 0 && face.every((p) => p.hands.includes("face")));
  assert.equal(lifePoseById("nope"), null);
});

test("pose reference uses the https app url, or uploads the png once locally", async () => {
  const id = LIFE_POSES[0].id;
  assert.equal(await lifePoseReferenceUrl(id, "https://scro.app"), `https://scro.app/life-poses/${id}.png`);
  const calls: string[] = [];
  const upload = async (dataUrl: string, pathname: string) => {
    assert.match(dataUrl, /^data:image\/png;base64,/);
    calls.push(pathname);
    return `https://blob.test/${pathname}`;
  };
  const local = await lifePoseReferenceUrl(id, "http://localhost:3000", upload);
  assert.equal(local, `https://blob.test/explainer/life-poses/${id}.png`);
  assert.equal(await lifePoseReferenceUrl(id, "http://localhost:3000", upload), local);
  assert.equal(calls.length, 1);
});
