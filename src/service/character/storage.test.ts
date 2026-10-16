import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  collectCharacterBlobUrls,
  collectCharactersBlobUrls,
  isExplainerBlobUrl,
  parseValidCharacterObjectIds,
} from "@/service/character/storage";
import type { Character } from "@/model/character";

const blobA =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/ref.jpg";
const blobB =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/abc/def";
const blobProfile =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/abc/def-profile";

test("collectCharacterBlobUrls dedupes reference and blueprint urls", () => {
  const blobC =
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/side.jpg";
  const character = {
    _id: new ObjectId(),
    versions: [
      { referenceImageUrl: blobA, referenceImageUrls: [blobA, blobC], blueprintUrl: blobB, profileUrl: blobProfile },
      { referenceImageUrl: blobB, blueprintUrl: undefined },
    ],
  } as Character;
  assert.deepEqual(
    collectCharacterBlobUrls(character).sort(),
    [blobA, blobB, blobC, blobProfile].sort(),
  );
});

test("isExplainerBlobUrl accepts only our public blob paths", () => {
  assert.equal(isExplainerBlobUrl(blobA), true);
  assert.equal(
    isExplainerBlobUrl("https://d3u0tzju9qaucj.cloudfront.net/out.png"),
    false,
  );
  assert.equal(isExplainerBlobUrl("not-a-url"), false);
});

test("parseValidCharacterObjectIds dedupes and drops invalid ids", () => {
  const id1 = new ObjectId().toHexString();
  const id2 = new ObjectId().toHexString();
  const parsed = parseValidCharacterObjectIds([id1, "not-an-id", id1, id2, ""]);
  assert.deepEqual(
    parsed.map((item) => item.toHexString()),
    [id1, id2],
  );
});

test("collectCharactersBlobUrls dedupes across multiple characters", () => {
  const c1 = {
    _id: new ObjectId(),
    versions: [{ referenceImageUrl: blobA, blueprintUrl: blobB }],
  } as Character;
  const c2 = {
    _id: new ObjectId(),
    versions: [{ blueprintUrl: blobB, profileUrl: blobProfile }],
  } as Character;
  assert.deepEqual(
    collectCharactersBlobUrls([c1, c2]).sort(),
    [blobA, blobB, blobProfile].sort(),
  );
});
