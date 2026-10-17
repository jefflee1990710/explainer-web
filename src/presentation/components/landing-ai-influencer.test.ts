import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { en } from "@/util/i18n/messages/en";
import { zhHant } from "@/util/i18n/messages/zh-Hant";
import { zhHans } from "@/util/i18n/messages/zh-Hans";

const ROOT = process.cwd();

test("landing messages reposition Scro around AI Influencers in English and Chinese", () => {
  assert.match(en.meta.title, /AI Influencer/i);
  assert.match(en.landing.hero.kicker, /AI Influencer/i);
  assert.match(en.landing.hero.title, /AI Influencer/i);
  assert.match(en.landing.cast.title, /AI Influencer/i);

  assert.match(zhHant.meta.title, /AI 網紅|AI Influencer/);
  assert.match(zhHant.landing.hero.kicker, /AI 網紅|AI Influencer/);
  assert.match(zhHant.landing.hero.title, /AI 網紅|AI Influencer/);
  assert.match(zhHant.landing.cast.title, /AI 網紅|AI Influencer/);

  assert.match(zhHans.meta?.title ?? "", /AI 网红|AI Influencer/);
  assert.match(zhHans.landing?.hero?.kicker ?? "", /AI 网红|AI Influencer/);
});

test("HomePage puts LandingCast right after LandingHero and LandingUseCases leads with virtual-you", () => {
  const homePage = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
  const heroIdx = homePage.indexOf("<LandingHero");
  const castIdx = homePage.indexOf("<LandingCast");
  const useCasesIdx = homePage.indexOf("<LandingUseCases");
  assert.ok(heroIdx >= 0 && castIdx > heroIdx && useCasesIdx > castIdx);

  const useCases = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/landing-use-cases.tsx"),
    "utf8",
  );
  const virtualYouIdx = useCases.indexOf('"virtual-you"');
  const productIdx = useCases.indexOf('"product"');
  assert.ok(virtualYouIdx >= 0 && productIdx > virtualYouIdx);
});

test("landing components use the clean Studio / Editor design style without brutalist offset shadows", () => {
  const files = [
    "src/presentation/components/landing-hero.tsx",
    "src/presentation/components/landing-cast.tsx",
    "src/presentation/components/landing-use-cases.tsx",
    "src/presentation/components/landing-use-case-row.tsx",
    "src/presentation/components/landing-steps.tsx",
    "src/presentation/components/landing-director.tsx",
    "src/presentation/components/landing-free-credit.tsx",
  ];
  for (const rel of files) {
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotMatch(
      content,
      /shadow-\[[56]px_[56]px_0_0_/,
      `${rel} should not use neo-brutalist hard offset shadows`,
    );
    assert.doesNotMatch(
      content,
      /border-2 border-\[#12141c\]/,
      `${rel} should use clean studio borders instead of thick 2px black borders`,
    );
  }
});
