import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId } from "mongodb";
import {
  collectCharacterBlobUrls,
  isExplainerBlobUrl,
} from "@/service/character/storage";
import type { Character } from "@/model/character";

const blobA =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/ref.jpg";
const blobB =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/abc/def";

test("collectCharacterBlobUrls dedupes reference and blueprint urls", () => {
  const character = {
    _id: new ObjectId(),
    versions: [
      { referenceImageUrl: blobA, blueprintUrl: blobB },
      { referenceImageUrl: blobB, blueprintUrl: undefined },
    ],
  } as Character;
  assert.deepEqual(collectCharacterBlobUrls(character).sort(), [blobA, blobB].sort());
});

test("isExplainerBlobUrl accepts only our public blob paths", () => {
  assert.equal(isExplainerBlobUrl(blobA), true);
  assert.equal(
    isExplainerBlobUrl("https://d3u0tzju9qaucj.cloudfront.net/out.png"),
    false,
  );
  assert.equal(isExplainerBlobUrl("not-a-url"), false);
});
