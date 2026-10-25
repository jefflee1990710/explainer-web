import assert from "node:assert/strict";
import test from "node:test";
import { poseEditPrompt, poseEditReferenceUrls } from "@/service/pose-edit/prompt";

test("poseEditReferenceUrls puts the photo before the skeleton", () => {
  assert.deepEqual(
    poseEditReferenceUrls({ sourceUrl: "https://cdn.example/photo.jpg", poseReferenceUrl: "https://cdn.example/skeleton.png" }),
    ["https://cdn.example/photo.jpg", "https://cdn.example/skeleton.png"],
  );
  assert.deepEqual(poseEditReferenceUrls({ sourceUrl: "https://cdn.example/photo.jpg" }), [
    "https://cdn.example/photo.jpg",
  ]);
});

test("poseEditPrompt names only the selected pose and garments", () => {
  const prompt = poseEditPrompt({
    posePrompt: "A person stands upright.",
    wardrobePrompts: { top: "a white tee" },
    coversLegs: false,
  });
  assert.match(prompt, /first image/i);
  assert.match(prompt, /face/i);
  assert.match(prompt, /do not draw skeleton/i);
  assert.match(prompt, /A person stands upright/);
  assert.match(prompt, /a white tee/);
  assert.doesNotMatch(prompt, /pants/i);
  const dress = poseEditPrompt({ wardrobePrompts: { top: "a red dress" }, coversLegs: true });
  assert.match(dress, /covers the legs/i);
  assert.doesNotMatch(dress, /second image/i);
});
