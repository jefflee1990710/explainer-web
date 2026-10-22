import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { en } from "@/util/i18n/messages/en";
import { zhHant } from "@/util/i18n/messages/zh-Hant";
import { zhHans } from "@/util/i18n/messages/zh-Hans";

const ROOT = process.cwd();

test("landing messages reposition Scro around AI Influencers in English and Chinese", () => {
  assert.match(en.meta.title, /AI Influencer|soul/i);
  assert.match(en.landing.hero.kicker, /AI Influencer/i);
  assert.match(en.landing.hero.title, /soul|AI Influencer/i);
  assert.ok(en.landing.hero.title.length <= 60, "en hero title should stay concise");
  assert.ok(en.landing.hero.subtitle.length <= 100, "en hero subtitle should stay concise");
  assert.match(en.landing.cast.title, /AI Influencer|soul/i);
  assert.match(en.landing.steps.step1Title, /character|wardrobe/i);
  assert.match(en.landing.steps.step2Title, /Life/i);

  assert.match(zhHant.meta.title, /AI 網紅|靈魂|KOL/);
  assert.match(zhHant.landing.hero.kicker, /AI 網紅|AI Influencer|靈魂/);
  assert.match(zhHant.landing.hero.title, /靈魂|KOL/);
  assert.ok(zhHant.landing.hero.title.length <= 24, "zhHant hero title should stay concise");
  assert.ok(zhHant.landing.hero.subtitle.length <= 45, "zhHant hero subtitle should stay concise");
  assert.match(zhHant.landing.cast.title, /AI 網紅|靈魂/);
  assert.match(zhHant.landing.steps.step1Title, /角色|衣櫃/);

  assert.match(zhHans.meta?.title ?? "", /AI 网红|灵魂|KOL/);
  assert.match(zhHans.landing?.hero?.kicker ?? "", /AI 网红|AI Influencer|灵魂/);
});

test("HomePage puts LandingCast then LandingIp after LandingHero and LandingUseCases leads with virtual-you", () => {
  const homePage = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
  const heroIdx = homePage.indexOf("<LandingHero");
  const castIdx = homePage.indexOf("<LandingCast");
  const ipIdx = homePage.indexOf("<LandingIp");
  const useCasesIdx = homePage.indexOf("<LandingUseCases");
  const kolIdx = homePage.indexOf("<LandingKol");
  assert.ok(
    heroIdx >= 0 &&
      castIdx > heroIdx &&
      ipIdx > castIdx &&
      kolIdx > ipIdx &&
      useCasesIdx > kolIdx,
  );

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
    "src/presentation/components/landing-hero-art.tsx",
    "src/presentation/components/landing-hero-cast-rail.tsx",
    "src/presentation/components/landing-hero-outputs.tsx",
    "src/presentation/components/landing-cast.tsx",
    "src/presentation/components/landing-ip.tsx",
    "src/presentation/components/influencer-ip-showcase.tsx",
    "src/presentation/components/landing-use-cases.tsx",
    "src/presentation/components/landing-use-case-row.tsx",
    "src/presentation/components/landing-steps.tsx",
    "src/presentation/components/landing-director.tsx",
    "src/presentation/components/landing-free-credit.tsx",
    "src/presentation/components/landing-kol.tsx",
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
