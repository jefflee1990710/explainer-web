import assert from "node:assert/strict";
import test from "node:test";
import { poseEditSubmitInput } from "@/service/pose-edit/submit-input";

test("poseEditSubmitInput keeps the photo first and covers legs for a full-body top", () => {
  const input = poseEditSubmitInput(
    {
      sourceUrl: "https://cdn.example/photo.jpg",
      poseId: "standing-arms-relaxed",
      wardrobe: { top: "alredscoopdress" },
      aspect: "3:4",
    },
    "https://cdn.example/skeleton.png",
  );
  assert.deepEqual(input.referenceImageUrls, [
    "https://cdn.example/photo.jpg",
    "https://cdn.example/skeleton.png",
  ]);
  assert.equal(input.aspectRatio, "3:4");
  assert.match(input.prompt, /covers the legs/i);
  assert.match(input.prompt, /stands upright/i);
});
