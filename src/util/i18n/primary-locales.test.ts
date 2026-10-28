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
  assert.match(ja.nav.features, /動画/);
  assert.match(ja.nav.featuresAiInfluencer, /魂|経験|soul/i);
  assert.match(ja.aiInfluencerPage.seo.title, /AI Influencer|魂/);
  assert.match(ja.landing.hero.title, /魂|AI/);
  assert.ok(ja.landing.ip?.title);

  assert.match(ko.nav.features, /영상/);
  assert.match(ko.nav.featuresAiInfluencer, /영혼|경험|soul/i);
  assert.match(ko.aiInfluencerPage.seo.title, /AI Influencer|영혼/);
  assert.match(ko.landing.hero.title, /영혼|AI/);
  assert.ok(ko.landing.ip?.title);
});

test("all primary locales translate Wardrobe (衣櫥) and Post", () => {
  const en = getMessages("en");
  const zhHant = getMessages("zh-Hant");
  const zhHans = getMessages("zh-Hans");
  const ja = getMessages("ja");
  const ko = getMessages("ko");

  assert.equal(en.nav.wardrobe, "Wardrobe");
  assert.equal(zhHant.nav.wardrobe, "衣櫥");
  assert.equal(zhHans.nav.wardrobe, "衣橱");
  assert.equal(ja.nav.wardrobe, "衣装");
  assert.equal(ko.nav.wardrobe, "옷장");

  assert.equal(en.nav.blog, "Post");
  assert.equal(zhHant.nav.blog, "文章");
  assert.equal(zhHans.nav.blog, "文章");
  assert.equal(ja.nav.blog, "記事");
  assert.equal(ko.nav.blog, "블로그");

  assert.equal(en.nav.posts, "Post");
  assert.equal(zhHant.nav.posts, "海報");
  assert.equal(zhHans.nav.posts, "海报");
  assert.equal(ja.nav.posts, "投稿");
  assert.equal(ko.nav.posts, "게시물");

  assert.ok(en.wardrobe.title);
  assert.ok(zhHant.wardrobe.title);
  assert.ok(zhHans.wardrobe.title);
  assert.ok(ja.wardrobe.title);
  assert.ok(ko.wardrobe.title);

  assert.ok(en.blogPage.title);
  assert.ok(zhHant.blogPage.title);
  assert.ok(zhHans.blogPage.title);
  assert.ok(ja.blogPage.title);
  assert.ok(ko.blogPage.title);
});
