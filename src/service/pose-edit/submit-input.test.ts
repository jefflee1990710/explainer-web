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

  const freeTextOnly = poseEditSubmitInput({
    sourceUrl: "https://cdn.example/photo.jpg",
    poseText: "sitting on a chair",
    outfitText: "black hoodie and grey joggers",
    wardrobe: {},
    aspect: "1:1",
  });
  assert.deepEqual(freeTextOnly.referenceImageUrls, ["https://cdn.example/photo.jpg"]);
  assert.match(freeTextOnly.prompt, /Change their body pose to: sitting on a chair/);
  assert.match(freeTextOnly.prompt, /Outfit description: black hoodie and grey joggers/);
});
