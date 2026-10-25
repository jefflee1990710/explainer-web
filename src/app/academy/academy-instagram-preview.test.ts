import assert from "node:assert/strict";
import test from "node:test";
import { instagramEmbedSrc } from "@/app/academy/academy-instagram-preview";

test("instagram embed src keeps the post or reel shortcode and hides the caption chrome", () => {
  assert.equal(
    instagramEmbedSrc("https://www.instagram.com/p/De5rxgaxSYn/"),
    "https://www.instagram.com/p/De5rxgaxSYn/embed/?hidecaption=true",
  );
  assert.equal(
    instagramEmbedSrc("https://www.instagram.com/reel/DL5q6Y7SIbt/"),
    "https://www.instagram.com/reel/DL5q6Y7SIbt/embed/?hidecaption=true",
  );
  assert.equal(instagramEmbedSrc("https://www.instagram.com/scro.io/"), null);
});
