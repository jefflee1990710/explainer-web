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
} from "@/service/director/profile";

function fullProfile(value = "x") {
  return Object.fromEntries(PROFILE_KEYS.map((key) => [key, value]));
}

test("limits and labels", () => {
  assert.equal(PROFILE_FIELD_MAX, 600);
  assert.equal(EXTRA_INSTRUCTIONS_MAX, 4000);
  assert.deepEqual(Object.keys(PROFILE_LABELS_EN), [...PROFILE_KEYS]);
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

test("parseSystemProfile reads English fields and ignores zh-Hant", () => {
  const profile = parseSystemProfile({ en: fullProfile("e"), "zh-Hant": fullProfile("z") });
  assert.equal(profile.bestFor, "e");
  assert.equal(profile.rules, "e");
  assert.equal("en" in profile, false);
  assert.equal("zh-Hant" in profile, false);
});

test("parseSystemProfile also accepts a flat English profile", () => {
  const profile = parseSystemProfile(fullProfile("flat"));
  assert.equal(profile.hook, "flat");
});

test("parseSystemProfile throws on an empty or long English field", () => {
  assert.throws(() => parseSystemProfile({ en: { ...fullProfile(), hook: " " } }), /hook/);
  assert.throws(() => parseSystemProfile({ ...fullProfile(), arc: "a".repeat(601) }), /arc/);
});
