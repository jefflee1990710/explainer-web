import assert from "node:assert/strict";
import test from "node:test";
import {
  REALISTIC_VIDEO_GRADE_FILTER,
  realisticVideoGradeArgs,
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
