import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { isPostAspectRatio, toPublicPost } from "@/model/post";
import {
  buildPostCreatePrompt,
  buildPostElementEditPrompt,
  postTaskTitle,
} from "@/service/post/prompts";
import {
  applyRevisionSelection,
  validateEditPostElementInput,
} from "@/service/post/pipeline";

test("toPublicPost normalizes both new SAM Post docs and legacy SVG Post docs", () => {
  const id = new ObjectId("65f000000000000000000001");
  const now = new Date("2026-11-04T10:00:00.000Z");

  const legacyPublic = toPublicPost({
    _id: id,
    clerkUserId: "u1",
    instruction: "Summer iced coffee promo",
    previewUrl: "https://blob.example/legacy.webp",
    previewStatus: "ready",
    aspectRatio: "2:3",
    createdAt: now,
    updatedAt: now,
  });

  assert.equal(legacyPublic.id, id.toHexString());
  assert.equal(legacyPublic.status, "completed");
  assert.equal(legacyPublic.prompt, "Summer iced coffee promo");
  assert.equal(legacyPublic.currentImageUrl, "https://blob.example/legacy.webp");
  assert.deepEqual(legacyPublic.detectedElements, []);
  assert.equal(legacyPublic.revisions.length, 1);
  assert.equal(isPostAspectRatio("9:16"), true);
  assert.equal(isPostAspectRatio("2:3"), true);
  assert.equal(isPostAspectRatio("4:3"), false);
});

test("buildPostCreatePrompt includes cast outfits, products, and style look in ordinal order", () => {
  const text = buildPostCreatePrompt({
    prompt: "A neon streetwear poster with headline 'NIGHT DROP'",
    styleName: "Cyber Editorial",
    styleLook: "high-contrast neon rim lighting",
    cast: [{ name: "Luna", outfitSpec: "black leather jacket and cargo pants" }],
    products: [{ name: "Glow Sneaker" }],
    hasReferenceImage: true,
  });

  assert.match(text, /attached image 1.*Luna/i);
  assert.match(text, /black leather jacket and cargo pants/i);
  assert.match(text, /attached image 2.*Glow Sneaker/i);
  assert.match(text, /attached image 3/i);
  assert.match(text, /NIGHT DROP/);
});

test("buildPostElementEditPrompt handles person swap_character, object replace_product, text change, and remove", () => {
  const personSwap = buildPostElementEditPrompt({
    element: {
      category: "person",
      categoryIndex: 1,
      label: "Person #1",
      box: { x: 0.1, y: 0.2, width: 0.3, height: 0.7 },
    },
    editMode: "swap_character",
    characterName: "Aria",
    characterOutfitSpec: "white silk blouse and pleated skirt",
    hasDonorImage: true,
  });
  assert.match(personSwap, /attached image 2/i);
  assert.match(personSwap, /attached image 1/i);
  assert.match(personSwap, /white silk blouse and pleated skirt/i);

  const objectChange = buildPostElementEditPrompt({
    element: {
      category: "object",
      categoryIndex: 1,
      label: "Coffee Cup",
      box: { x: 0.6, y: 0.5, width: 0.2, height: 0.25 },
    },
    editMode: "replace_product",
    productName: "Matcha Tin",
    instruction: "held in the right hand",
    hasDonorImage: true,
  });
  assert.match(objectChange, /Coffee Cup/);
  assert.match(objectChange, /Matcha Tin/);
  assert.match(objectChange, /attached image 2/i);

  const textEdit = buildPostElementEditPrompt({
    element: {
      category: "text",
      categoryIndex: 1,
      label: "Headline Text",
      box: { x: 0.15, y: 0.08, width: 0.7, height: 0.14 },
    },
    editMode: "change",
    instruction: "GRAND OPENING 50% OFF",
  });
  assert.match(textEdit, /GRAND OPENING 50% OFF/);
  assert.match(textEdit, /font|typography/i);

  const removeEdit = buildPostElementEditPrompt({
    element: {
      category: "object",
      categoryIndex: 2,
      label: "Sunglasses",
      box: { x: 0.4, y: 0.3, width: 0.15, height: 0.08 },
    },
    editMode: "remove",
  });
  assert.match(removeEdit, /Remove.*Sunglasses/i);
  assert.equal(postTaskTitle({ prompt: "  Hello world  " }), "Hello world");
});

test("validateEditPostElementInput rejects missing donor on swap_character and empty text on text change", () => {
  const personEl = {
    id: "person-1",
    category: "person" as const,
    categoryIndex: 1,
    label: "Person #1",
    rle: "0 10",
    width: 10,
    height: 10,
    score: 0.9,
    box: { x: 0.1, y: 0.1, width: 0.3, height: 0.8 },
    anchorPoint: { x: 0.25, y: 0.5 },
  };
  const textEl = { ...personEl, id: "text-1", category: "text" as const, label: "Text #1" };

  assert.equal(
    validateEditPostElementInput({ element: personEl, editMode: "swap_character" }).ok,
    false,
  );
  assert.equal(
    validateEditPostElementInput({ element: textEl, editMode: "change", instruction: "   " }).ok,
    false,
  );
  assert.equal(
    validateEditPostElementInput({ element: textEl, editMode: "change", instruction: "NEW SALE" }).ok,
    true,
  );
});

test("applyRevisionSelection restores target revision imageUrl and detectedElements", () => {
  const rev1Elements = [
    {
      id: "person-1",
      category: "person" as const,
      categoryIndex: 1,
      label: "Person #1",
      rle: "0 10",
      width: 10,
      height: 10,
      score: 0.95,
      box: { x: 0.1, y: 0.1, width: 0.3, height: 0.8 },
      anchorPoint: { x: 0.2, y: 0.5 },
    },
  ];
  const updated = applyRevisionSelection(
    [
      {
        revisionId: "rev-1",
        imageUrl: "https://blob.example/v1.webp",
        prompt: "v1",
        detectedElements: rev1Elements,
        createdAt: "2026-11-04T10:00:00.000Z",
      },
      {
        revisionId: "rev-2",
        imageUrl: "https://blob.example/v2.webp",
        prompt: "v2",
        detectedElements: [],
        createdAt: "2026-11-04T10:05:00.000Z",
      },
    ],
    "rev-1",
  );
  assert.ok(updated);
  assert.equal(updated.currentImageUrl, "https://blob.example/v1.webp");
  assert.equal(updated.detectedElements.length, 1);
});
