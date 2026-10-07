import assert from "node:assert/strict";
import { test } from "node:test";
import type { Project } from "@/model/project";
import {
  MAX_REFERENCE_IMAGES,
  clipReferenceImageUrls,
  instructionFollowsReferenceClothes,
  parseReferenceImages,
  phaseAReferenceImageRules,
  referenceImageLabel,
  sanitizeClipReferenceIds,
} from "@/service/project/reference-images";

const allowed = (url: string) => url.startsWith("https://store/explainer/brand/u/");
const img = (n: number, description = `desc ${n}`) => ({
  url: `https://store/explainer/brand/u/${n}.png`,
  description,
});

test("empty input means no reference images", () => {
  assert.deepEqual(parseReferenceImages("", allowed), { ok: true, images: [] });
});

test("ids are reassigned R1..Rn in user order and descriptions trimmed", () => {
  const raw = JSON.stringify([{ ...img(2), id: "R9", description: "  shop front " }, img(1)]);
  const parsed = parseReferenceImages(raw, allowed);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.images, [
    { id: "R1", url: img(2).url, description: "shop front" },
    { id: "R2", url: img(1).url, description: "desc 1" },
  ]);
});

test("rejects more than the limit, blank descriptions, long descriptions, foreign urls, bad json", () => {
  const tooMany = Array.from({ length: MAX_REFERENCE_IMAGES + 1 }, (_, i) => img(i));
  assert.deepEqual(parseReferenceImages(JSON.stringify(tooMany), allowed), {
    ok: false,
    error: "參考圖最多 4 張",
  });
  assert.deepEqual(parseReferenceImages(JSON.stringify([img(1, "  ")]), allowed), {
    ok: false,
    error: "請為每張參考圖填寫說明",
  });
  assert.deepEqual(parseReferenceImages(JSON.stringify([img(1, "x".repeat(301))]), allowed), {
    ok: false,
    error: "參考圖說明最多 300 字",
  });
  assert.deepEqual(
    parseReferenceImages(JSON.stringify([{ url: "https://evil/x.png", description: "d" }]), allowed),
    { ok: false, error: "參考圖來源無效，請重新上傳" },
  );
  assert.deepEqual(parseReferenceImages("{nope", allowed), { ok: false, error: "參考圖資料無效" });
});

const images = [
  { id: "R1", url: "https://store/r1.png", description: "a" },
  { id: "R2", url: "https://store/r2.png", description: "b" },
];

test("sanitize keeps known ids once and drops the field when empty", () => {
  const clips = sanitizeClipReferenceIds(
    [
      { clipNumber: 1, referenceImageIds: ["R2", "R2", "R7", "R1"] },
      { clipNumber: 2, referenceImageIds: ["R9"] },
      { clipNumber: 3 },
    ],
    images,
  );
  assert.deepEqual(clips, [
    { clipNumber: 1, referenceImageIds: ["R1", "R2"] },
    { clipNumber: 2 },
    { clipNumber: 3 },
  ]);
  assert.deepEqual(sanitizeClipReferenceIds([{ clipNumber: 1, referenceImageIds: ["R1"] }], undefined), [
    { clipNumber: 1 },
  ]);
});

test("clip urls follow the row's ids", () => {
  const video = {
    referenceImages: images,
    phaseA: { clips: [{ clipNumber: 1, referenceImageIds: ["R2"] }, { clipNumber: 2 }] },
  } as unknown as Pick<Project, "phaseA" | "referenceImages">;
  assert.deepEqual(clipReferenceImageUrls(video, 1), ["https://store/r2.png"]);
  assert.deepEqual(clipReferenceImageUrls(video, 2), []);
  assert.deepEqual(clipReferenceImageUrls({ phaseA: undefined }, 1), []);
});

test("director text names each image and the assignment rule", () => {
  assert.equal(referenceImageLabel(images[0]), "Reference image R1: a");
  const rules = phaseAReferenceImageRules(images);
  assert.match(rules, /R1, R2/);
  assert.match(rules, /referenceImageIds/);
  assert.match(rules, /Lock face and hair/);
  assert.match(rules, /Do not copy the person, face, or hairstyle/);
  assert.doesNotMatch(rules, /subject/);
  assert.equal(phaseAReferenceImageRules([]), "");
  const clothing = phaseAReferenceImageRules(images, { clothingOnly: true });
  assert.match(clothing, /clothes only/);
  assert.doesNotMatch(clothing, /composition, subject/);
  const fromInstruction = phaseAReferenceImageRules(images, { clothingFromInstruction: true });
  assert.match(fromInstruction, /Copy only those garments/);
  assert.match(fromInstruction, /Do not copy the wearer/);
});

test("clothes follow a reference only when the instruction says so", () => {
  assert.equal(instructionFollowsReferenceClothes(["Put the bottle in a box and open it"]), false);
  assert.equal(instructionFollowsReferenceClothes(["我們的店面，用在開場"]), false);
  assert.equal(instructionFollowsReferenceClothes(["follow the outfit in the reference image"]), true);
  assert.equal(instructionFollowsReferenceClothes(["衣服跟參考圖"]), true);
  assert.equal(instructionFollowsReferenceClothes(["wear the clothes from the photo"]), true);
  assert.equal(instructionFollowsReferenceClothes([undefined, ""]), false);
});
