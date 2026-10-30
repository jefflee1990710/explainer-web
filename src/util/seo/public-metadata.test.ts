import assert from "node:assert/strict";
import { test } from "node:test";
import {
  localePath,
  postDocumentTitle,
  publicAlternates,
} from "@/util/seo/public-metadata";

test("localePath keeps English clean and adds hl for other languages", () => {
  assert.equal(localePath("/pricing", "en"), "/pricing");
  assert.equal(localePath("/pricing", "zh-Hant"), "/pricing?hl=zh-Hant");
  assert.equal(localePath("/posts?page=2", "ja"), "/posts?page=2&hl=ja");
  assert.equal(localePath("/", "ko"), "/?hl=ko");
});

test("publicAlternates points canonical at the active language and lists hreflang", () => {
  const alternates = publicAlternates("/examples", "zh-Hant");
  assert.equal(alternates.canonical, "/examples?hl=zh-Hant");
  assert.equal(alternates.languages?.["x-default"], "/examples");
  assert.equal(alternates.languages?.en, "/examples");
  assert.equal(alternates.languages?.ja, "/examples?hl=ja");
});

test("postDocumentTitle stays within a search-result width", () => {
  assert.equal(postDocumentTitle("Soft CTAs"), "Soft CTAs | Scro");
  const long = "Introducing Limehouse: Creative Video, Animation, and Training Films";
  const titled = postDocumentTitle(long);
  assert.ok(titled.length <= 60);
  assert.equal(titled.endsWith("…"), true);
  assert.equal(titled.includes("| Scro"), false);
});
