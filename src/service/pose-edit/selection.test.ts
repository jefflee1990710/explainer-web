import assert from "node:assert/strict";
import test from "node:test";
import { parsePoseEditSelection } from "@/service/pose-edit/selection";

test("parsePoseEditSelection rejects an empty edit", () => {
  const result = parsePoseEditSelection({});
  assert.deepEqual(result, { ok: false, error: "請選姿勢或至少一件衣服" });
});

test("parsePoseEditSelection rejects an unknown pose and an unknown garment", () => {
  assert.equal(parsePoseEditSelection({ poseId: "not-a-pose" }).ok, false);
  assert.equal(
    parsePoseEditSelection({ poseId: "not-a-pose" }).ok === false
      ? (parsePoseEditSelection({ poseId: "not-a-pose" }) as { error: string }).error
      : "",
    "找不到這個姿勢",
  );
  const outfit = parsePoseEditSelection({ top: "no-such-top" });
  assert.deepEqual(outfit, { ok: false, error: "找不到這件衣服" });
  assert.equal(parsePoseEditSelection({ pants: "none" }).ok, false);
  assert.equal(parsePoseEditSelection({ top: "cw_aaaaaaaaaaaaaaaaaaaaaaaa" }).ok, false);
});

test("parsePoseEditSelection keeps a real pose and jeans, and drops pants on a full-body top", () => {
  const pose = parsePoseEditSelection({ poseId: "standing-arms-relaxed", pants: "jeans" });
  assert.deepEqual(pose, {
    ok: true,
    poseId: "standing-arms-relaxed",
    wardrobe: { pants: "jeans" },
  });
  const dress = parsePoseEditSelection({ top: "alredscoopdress", pants: "jeans" });
  assert.deepEqual(dress, { ok: true, wardrobe: { top: "alredscoopdress" } });
});

test("parsePoseEditSelection accepts free-text pose or outfit and trims to 200 chars", () => {
  const onlyPoseText = parsePoseEditSelection({ poseText: "  雙手插口袋看向鏡頭  " });
  assert.deepEqual(onlyPoseText, {
    ok: true,
    poseText: "雙手插口袋看向鏡頭",
    wardrobe: {},
  });
  const longText = "a".repeat(250);
  const onlyOutfitText = parsePoseEditSelection({ outfitText: longText });
  assert.deepEqual(onlyOutfitText, {
    ok: true,
    outfitText: "a".repeat(200),
    wardrobe: {},
  });
});
