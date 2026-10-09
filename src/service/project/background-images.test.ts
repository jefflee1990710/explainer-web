import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_BACKGROUND_IMAGES, parseBackgroundImageUrls } from "@/service/project/background-images";

const allowed = (url: string) => url.startsWith("https://store/explainer/brand/u/");
const url = (n: number) => `https://store/explainer/brand/u/${n}.png`;

test("empty input means no background photos", () => {
  assert.deepEqual(parseBackgroundImageUrls("", allowed), { ok: true, urls: [] });
});

test("keeps upload order and drops a duplicate", () => {
  const parsed = parseBackgroundImageUrls(JSON.stringify([url(2), `  ${url(1)} `, url(2)]), allowed);
  assert.deepEqual(parsed, { ok: true, urls: [url(2), url(1)] });
});

test("rejects more than two, a foreign url, and bad json", () => {
  const tooMany = Array.from({ length: MAX_BACKGROUND_IMAGES + 1 }, (_, index) => url(index));
  assert.deepEqual(parseBackgroundImageUrls(JSON.stringify(tooMany), allowed), {
    ok: false,
    error: "背景參考圖最多 2 張",
  });
  assert.equal(parseBackgroundImageUrls(JSON.stringify(["https://evil/a.png"]), allowed).ok, false);
  assert.equal(parseBackgroundImageUrls("{", allowed).ok, false);
});
