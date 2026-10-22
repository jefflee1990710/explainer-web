import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LOCALE_OPTIONS,
  PRIMARY_LOCALE_IDS,
  isPrimaryLocaleId,
} from "@/util/i18n/locales";
import { getMessages } from "@/util/i18n/messages";

test("platform language switcher exposes EN, zh-Hant, zh-Hans, ja, ko", () => {
  assert.deepEqual(
    LOCALE_OPTIONS.map((o) => o.id),
    ["en", "zh-Hant", "zh-Hans", "ja", "ko"],
  );
  assert.deepEqual(PRIMARY_LOCALE_IDS, ["en", "zh-Hant", "zh-Hans", "ja", "ko"]);
  assert.equal(isPrimaryLocaleId("ja"), true);
  assert.equal(isPrimaryLocaleId("es"), false);
});

test("Japanese and Korean cover Features nav and AI Influencer marketing SEO", () => {
  const ja = getMessages("ja");
  const ko = getMessages("ko");
  assert.match(ja.nav.features, /機能|Features/);
  assert.match(ja.nav.featuresAiInfluencer, /魂|経験|soul/i);
  assert.match(ja.aiInfluencerPage.seo.title, /AI Influencer|魂/);
  assert.match(ja.landing.hero.title, /魂|AI/);
  assert.ok(ja.landing.ip?.title);

  assert.match(ko.nav.features, /기능|Features/);
  assert.match(ko.nav.featuresAiInfluencer, /영혼|경험|soul/i);
  assert.match(ko.aiInfluencerPage.seo.title, /AI Influencer|영혼/);
  assert.match(ko.landing.hero.title, /영혼|AI/);
  assert.ok(ko.landing.ip?.title);
});
