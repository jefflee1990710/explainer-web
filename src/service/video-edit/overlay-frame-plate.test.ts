import assert from "node:assert/strict";
import { test } from "node:test";
import { overlayFramePlateUrl } from "@/service/video-edit/overlay-frame-plate";

const plates = [
  { clipNumber: 1, blobUrl: "plate-1" },
  { clipNumber: 2, blobUrl: "plate-2" },
];

test("a talking-head end still waits for the next subtitle", () => {
  assert.equal(
    overlayFramePlateUrl({
      handoff: true,
      clipNumber: 1,
      position: "start",
      clipNumbers: [1, 2],
      plates,
    }),
    "plate-1",
  );
  assert.equal(
    overlayFramePlateUrl({
      handoff: true,
      clipNumber: 1,
      position: "end",
      clipNumbers: [1, 2],
      plates: [plates[0]],
    }),
    undefined,
  );
  assert.equal(
    overlayFramePlateUrl({
      handoff: true,
      clipNumber: 1,
      position: "end",
      clipNumbers: [1, 2],
      plates,
    }),
    "plate-2",
  );
});

test("the last end still keeps its own subtitle", () => {
  assert.equal(
    overlayFramePlateUrl({
      handoff: true,
      clipNumber: 2,
      position: "end",
      clipNumbers: [1, 2],
      plates,
    }),
    "plate-2",
  );
});

test("without the handoff both stills use this clip's plate", () => {
  assert.equal(
    overlayFramePlateUrl({
      handoff: false,
      clipNumber: 1,
      position: "end",
      clipNumbers: [1, 2],
      plates,
    }),
    "plate-1",
  );
});
