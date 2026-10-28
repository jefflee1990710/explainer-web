import assert from "node:assert/strict";
import test from "node:test";
import {
  REALISTIC_VIDEO_GRADE_FILTER,
  realisticVideoGradeArgs,
  TALKING_HEAD_SENSOR_GRAIN_FILTER,
  talkingHeadSensorGrainArgs,
} from "@/service/style/realistic-grade";

test("realisticVideoGradeArgs applies knee LUT (preserving midtones <=180 and rolling off highlights >180) and no film grain", () => {
  const args = realisticVideoGradeArgs("in.mp4", "out.mp4");
  assert.ok(args.includes("-vf"));
  assert.ok(args.includes(REALISTIC_VIDEO_GRADE_FILTER));
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /lutrgb=/);
  assert.match(REALISTIC_VIDEO_GRADE_FILTER, /lte\(val,180\)/);
  assert.doesNotMatch(REALISTIC_VIDEO_GRADE_FILTER, /val\*0\.72/);
  assert.doesNotMatch(REALISTIC_VIDEO_GRADE_FILTER, /noise=/);
});

test("talkingHeadSensorGrainArgs applies subtle iPhone CMOS luma micro-grain and yuv420p without darkening highlights", () => {
  const args = talkingHeadSensorGrainArgs("in.mp4", "out.mp4");
  assert.ok(args.includes("-vf"));
  assert.ok(args.includes(TALKING_HEAD_SENSOR_GRAIN_FILTER));
  assert.ok(args.includes("-pix_fmt"));
  assert.equal(args[args.indexOf("-pix_fmt") + 1], "yuv420p");
  assert.match(TALKING_HEAD_SENSOR_GRAIN_FILTER, /unsharp=3:3:0\.25/);
  assert.match(TALKING_HEAD_SENSOR_GRAIN_FILTER, /noise=c0s=1\.8:c0f=t\+u/);
  assert.doesNotMatch(TALKING_HEAD_SENSOR_GRAIN_FILTER, /lutrgb=/);
});
