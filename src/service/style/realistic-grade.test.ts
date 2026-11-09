import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDHELD_SELFIE_SHAKE_FILTER,
  REALISTIC_VIDEO_GRADE_FILTER,
  realisticVideoGradeArgs,
  TALKING_HEAD_SENSOR_GRAIN_FILTER,
  talkingHeadSensorGrainArgs,
} from "@/service/style/realistic-grade";

test("realisticVideoGradeArgs applies OpenJutsu Fix Colours (H3 Soft detail contrast softening + DCTL tone curve) instead of harsh sharpening", () => {
  const args = realisticVideoGradeArgs("in.mp4", "out.mp4");
  assert.ok(args.includes("-vf"));
  assert.ok(args.includes(REALISTIC_VIDEO_GRADE_FILTER));
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /unsharp=3:3:-0\.17:3:3:0/);
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /eq=contrast=0\.968:brightness=0\.002:saturation=1\.01/);
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /curves=all=/);
  assert.doesNotMatch(REALISTIC_VIDEO_GRADE_FILTER, /lutrgb=/);
  assert.doesNotMatch(REALISTIC_VIDEO_GRADE_FILTER, /noise=/);
});

test("talkingHeadSensorGrainArgs also applies OpenJutsu Fix Colours (H3 Soft) and yuv420p", () => {
  const args = talkingHeadSensorGrainArgs("in.mp4", "out.mp4");
  assert.ok(args.includes("-vf"));
  assert.ok(args.includes(TALKING_HEAD_SENSOR_GRAIN_FILTER));
  assert.ok(args.includes("-pix_fmt"));
  assert.equal(args[args.indexOf("-pix_fmt") + 1], "yuv420p");
  assert.equal(TALKING_HEAD_SENSOR_GRAIN_FILTER, REALISTIC_VIDEO_GRADE_FILTER);
  assert.doesNotMatch(TALKING_HEAD_SENSOR_GRAIN_FILTER, /lutrgb=|noise=/);

  const selfieArgs = talkingHeadSensorGrainArgs("in.mp4", "out.mp4", {
    handheldSelfie: true,
  });
  const vf = selfieArgs[selfieArgs.indexOf("-vf") + 1] || "";
  assert.ok(vf.includes(HANDHELD_SELFIE_SHAKE_FILTER));
  assert.ok(vf.includes(TALKING_HEAD_SENSOR_GRAIN_FILTER));
  assert.match(HANDHELD_SELFIE_SHAKE_FILTER, /crop=.*sin\(t\*/);
});
