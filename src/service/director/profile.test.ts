import assert from "node:assert/strict";
import { test } from "node:test";
import { PROFILE_KEYS } from "@/model/skill";
import {
  EXTRA_INSTRUCTIONS_MAX,
  PROFILE_FIELD_MAX,
  PROFILE_LABELS_EN,
  emptyProfile,
  parseProfile,
  parseSystemProfile,
  profileLocale,
} from "@/service/director/profile";

function fullProfile(value = "x") {
  return Object.fromEntries(PROFILE_KEYS.map((key) => [key, value]));
}

test("limits and labels", () => {
  assert.equal(PROFILE_FIELD_MAX, 600);
  assert.equal(EXTRA_INSTRUCTIONS_MAX, 4000);
  assert.deepEqual(Object.keys(PROFILE_LABELS_EN), [...PROFILE_KEYS]);
});

test("profileLocale maps zh-* to zh-Hant and everything else to en", () => {
  assert.equal(profileLocale("zh-Hant"), "zh-Hant");
  assert.equal(profileLocale("zh-Hans"), "zh-Hant");
  assert.equal(profileLocale("en"), "en");
  assert.equal(profileLocale("ja"), "en");
  assert.equal(profileLocale(""), "en");
});

test("emptyProfile has every key empty", () => {
  assert.deepEqual(emptyProfile(), fullProfile(""));
});

test("parseProfile coerces, fills missing keys and drops unknown keys", () => {
  const result = parseProfile({ bestFor: "  a ", hook: 3, extra: "nope" });
  assert.ok(result.ok);
  assert.equal(result.profile.bestFor, "  a ");
  assert.equal(result.profile.hook, "3");
  assert.equal(result.profile.rules, "");
  assert.equal("extra" in result.profile, false);
});

test("parseProfile rejects a field over the limit", () => {
  assert.deepEqual(parseProfile({ arc: "a".repeat(601) }), { ok: false, error: "欄位內容過長" });
  assert.ok(parseProfile({ arc: "a".repeat(600) }).ok);
});

test("parseSystemProfile accepts both languages with every key non-empty", () => {
  const profile = parseSystemProfile({ en: fullProfile("e"), "zh-Hant": fullProfile("z") });
  assert.equal(profile.en.bestFor, "e");
  assert.equal(profile["zh-Hant"].rules, "z");
});

test("parseSystemProfile throws on a missing language, empty field or long field", () => {
  assert.throws(() => parseSystemProfile({ en: fullProfile() }), /zh-Hant/);
  assert.throws(() => parseSystemProfile({ en: { ...fullProfile(), hook: " " }, "zh-Hant": fullProfile() }), /en\.hook/);
  assert.throws(
    () => parseSystemProfile({ en: fullProfile(), "zh-Hant": { ...fullProfile(), arc: "a".repeat(601) } }),
    /zh-Hant\.arc/,
  );
});
