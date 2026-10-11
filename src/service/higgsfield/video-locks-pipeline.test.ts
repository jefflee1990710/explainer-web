import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import type { Project } from "@/model/project";
import {
  objectSheetNeeded,
  backgroundPlatesNeeded,
  videoLocksCost,
  videoLocksReady,
} from "@/service/higgsfield/video-locks-pipeline";
import { FRAME_COST } from "@/service/credit-costs";

test("videoLocksCost charges one sheet plus each unique set", () => {
  assert.equal(videoLocksCost({ objects: [], sets: [] }), 0);
  assert.equal(
    videoLocksCost({
      objects: [{ name: "gimbal", notes: "metal" }],
      sets: [],
    }),
    FRAME_COST,
  );
  assert.equal(
    videoLocksCost({
      objects: [{ name: "gimbal", notes: "metal" }],
      sets: [
        { setId: "roof", name: "rooftop", notes: "sky", clipNumbers: [1, 2] },
        { setId: "desk", name: "desk", notes: "wood", clipNumbers: [3] },
      ],
    }),
    FRAME_COST * 3,
  );
  // Empty clip list does not bill a plate.
  assert.equal(
    videoLocksCost({
      objects: [],
      sets: [{ setId: "empty", name: "empty", notes: "", clipNumbers: [] }],
    }),
    0,
  );
});

test("videoLocksReady waits for planned props and plates", () => {
  const base = {
    _id: new ObjectId(),
    skillSlug: "cartoon-explainer-video-director",
  } as Project;

  assert.equal(videoLocksReady(base), false);
  assert.equal(
    videoLocksReady({
      ...base,
      objectSheetItems: [],
      backgroundPlates: [],
    }),
    true,
  );
  assert.equal(
    videoLocksReady({
      ...base,
      objectSheetItems: [{ name: "cup", notes: "" }],
      backgroundPlates: [],
    }),
    false,
  );
  assert.equal(
    videoLocksReady({
      ...base,
      objectSheetItems: [{ name: "cup", notes: "" }],
      objectSheetUrl: "https://blob/sheet.png",
      backgroundPlates: [
        { setId: "roof", name: "rooftop", notes: "sky", clipNumbers: [1] },
      ],
    }),
    false,
  );
  assert.equal(
    videoLocksReady({
      ...base,
      objectSheetItems: [{ name: "cup", notes: "" }],
      objectSheetUrl: "https://blob/sheet.png",
      backgroundPlates: [
        {
          setId: "roof",
          name: "rooftop",
          notes: "sky",
          clipNumbers: [1],
          url: "https://blob/roof.png",
        },
      ],
    }),
    true,
  );
  assert.equal(
    videoLocksReady({
      ...base,
      skillSlug: "talking-head-director",
    }),
    true,
  );
});

test("needed helpers ignore empty inventories", () => {
  assert.equal(objectSheetNeeded({ objectSheetItems: [] }), false);
  assert.equal(objectSheetNeeded({ objectSheetItems: [{ name: "a", notes: "" }] }), true);
  assert.equal(
    backgroundPlatesNeeded({
      backgroundPlates: [{ setId: "a", name: "a", notes: "", clipNumbers: [] }],
    }),
    false,
  );
  assert.equal(
    backgroundPlatesNeeded({
      backgroundPlates: [{ setId: "a", name: "a", notes: "", clipNumbers: [1] }],
    }),
    true,
  );
});
