import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { en } from "@/util/i18n/messages/en";
import { zhHant } from "@/util/i18n/messages/zh-Hant";
import { zhHans } from "@/util/i18n/messages/zh-Hans";

const ROOT = process.cwd();

test("landing messages focus Scro on explainer videos and AI Influencers", () => {
  assert.match(en.meta.title, /Explainer|AI Influencer/i);
  assert.match(en.landing.hero.kicker, /Explainer|AI Influencer/i);
  assert.match(en.landing.hero.title, /Explainer|AI Influencer/i);
  assert.ok(en.landing.hero.title.length <= 60, "en hero title should stay concise");
  assert.ok(en.landing.hero.subtitle.length <= 100, "en hero subtitle should stay concise");
  assert.match(en.landing.cast.title, /AI Influencer|explainer/i);
  assert.match(en.landing.steps.step1Title, /character|wardrobe/i);
  assert.match(en.landing.steps.step2Title, /explainer/i);
  assert.match(en.landing.academy.title, /reel/i);
  assert.doesNotMatch(en.landing.academy.title, /course/i);
  assert.match(zhHant.landing.academy.title, /Reel|白板/);

  assert.match(zhHant.meta.title, /Explainer|AI 網紅/);
  assert.match(zhHant.landing.hero.kicker, /Explainer|AI Influencer|AI 網紅/);
  assert.match(zhHant.landing.hero.title, /Explainer|AI 網紅/);
  assert.ok(zhHant.landing.hero.title.length <= 24, "zhHant hero title should stay concise");
  assert.ok(zhHant.landing.hero.subtitle.length <= 45, "zhHant hero subtitle should stay concise");
  assert.match(zhHant.landing.cast.title, /AI 網紅|Explainer/);
  assert.match(zhHant.landing.steps.step1Title, /角色|衣櫃/);

  assert.match(zhHans.meta?.title ?? "", /Explainer|AI 网红/);
  assert.match(zhHans.landing?.hero?.kicker ?? "", /Explainer|AI Influencer|AI 网红/);
});

test("HomePage use cases lead with explainer videos, then the AI Influencer", () => {
  const homePage = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
  const heroIdx = homePage.indexOf("<LandingHero");
  const reelIdx = homePage.indexOf("<LandingExplainerReel");
  const castIdx = homePage.indexOf("<LandingCast");
  const ipIdx = homePage.indexOf("<LandingIp");
  const useCasesIdx = homePage.indexOf("<LandingUseCases");
  const kolIdx = homePage.indexOf("<LandingKol");
  assert.ok(
    heroIdx >= 0 &&
      reelIdx > heroIdx &&
      castIdx > reelIdx &&
      !homePage.includes("LandingAcademy") &&
      ipIdx > castIdx &&
      kolIdx > ipIdx &&
      useCasesIdx > kolIdx,
  );

  const useCases = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/landing-use-cases.tsx"),
    "utf8",
  );
  const explainIdx = useCases.indexOf('"explain"');
  const virtualYouIdx = useCases.indexOf('"virtual-you"');
  assert.ok(explainIdx >= 0 && virtualYouIdx > explainIdx);
  assert.equal(useCases.includes('"product"'), false);
});

test("landing and feature page components use the clean Studio / Editor design style and dedicated character assets", () => {
  const files = [
    "src/presentation/components/landing-explainer-reel.tsx",
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
    "src/presentation/components/studio-powertools-band.tsx",
    "src/presentation/components/landing-director.tsx",
    "src/presentation/components/landing-free-credit.tsx",
    "src/presentation/components/landing-kol.tsx",
    "src/presentation/components/feature-hero.tsx",
    "src/presentation/components/feature-cta-card.tsx",
    "src/presentation/components/feature-examples.tsx",
    "src/presentation/components/feature-post.tsx",
    "src/app/ai-influencer/ai-influencer-post.tsx",
    "src/app/product-promo/product-promo-post.tsx",
    "src/app/right-tool/right-tool-post.tsx",
    "src/app/talking-head/talking-head-post.tsx",
    "src/app/cantonese/cantonese-post.tsx",
    "src/app/explainer/explainer-post.tsx",
    "src/app/ai-influencer/ai-influencer-examples.tsx",
    "src/app/product-promo/product-promo-examples.tsx",
    "src/app/right-tool/right-tool-examples.tsx",
    "src/app/talking-head/talking-head-examples.tsx",
    "src/app/cantonese/cantonese-examples.tsx",
    "src/app/explainer/explainer-examples.tsx",
    "src/app/ai-influencer/ai-influencer-hero.tsx",
    "src/app/ai-influencer/ai-influencer-soul.tsx",
    "src/app/ai-influencer/ai-influencer-ip.tsx",
    "src/app/ai-influencer/ai-influencer-earn.tsx",
    "src/app/ai-influencer/ai-influencer-shift.tsx",
    "src/app/ai-influencer/ai-influencer-cta.tsx",
    "src/app/product-promo/product-promo-hero.tsx",
    "src/app/product-promo/product-promo-cost.tsx",
    "src/app/product-promo/product-promo-flow.tsx",
    "src/app/product-promo/product-promo-wild.tsx",
    "src/app/product-promo/product-promo-cta.tsx",
    "src/app/right-tool/right-tool-hero.tsx",
    "src/app/right-tool/right-tool-pain.tsx",
    "src/app/right-tool/right-tool-directors.tsx",
    "src/app/right-tool/right-tool-influencer.tsx",
    "src/app/right-tool/right-tool-edit.tsx",
    "src/app/right-tool/right-tool-cta.tsx",
    "src/app/talking-head/talking-head-hero.tsx",
    "src/app/talking-head/talking-head-steps.tsx",
    "src/app/talking-head/talking-head-finish.tsx",
    "src/app/talking-head/talking-head-cta.tsx",
    "src/app/cantonese/cantonese-hero.tsx",
    "src/app/cantonese/cantonese-fit.tsx",
    "src/app/cantonese/cantonese-flow.tsx",
    "src/app/cantonese/cantonese-cta.tsx",
    "src/app/explainer/explainer-hero.tsx",
    "src/app/explainer/explainer-uses.tsx",
    "src/app/explainer/explainer-style.tsx",
    "src/app/explainer/explainer-flow.tsx",
    "src/app/explainer/explainer-cta.tsx",
    "src/app/pricing/pricing-plans.tsx",
    "src/app/pricing/pricing-plan-card.tsx",
    "src/app/pricing/pricing-enterprise.tsx",
    "src/presentation/components/examples-hero.tsx",
    "src/presentation/components/examples-view.tsx",
    "src/presentation/components/example-band.tsx",
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

  // Feature pages must use their own dedicated character assets rather than reusing landing page assets.
  const rightToolHero = fs.readFileSync(path.join(ROOT, "src/app/right-tool/right-tool-hero.tsx"), "utf8");
  assert.match(rightToolHero, /\/landing\/right-tool\/hero\.jpg/);
  assert.doesNotMatch(rightToolHero, /director-scro\.webp/);

  const rightToolInfluencer = fs.readFileSync(
    path.join(ROOT, "src/app/right-tool/right-tool-influencer.tsx"),
    "utf8",
  );
  assert.match(rightToolInfluencer, /\/landing\/right-tool\/character\.jpg/);
  assert.doesNotMatch(rightToolInfluencer, /\/landing\/steps\//);

  const aiInfluencerIp = fs.readFileSync(path.join(ROOT, "src/app/ai-influencer/ai-influencer-ip.tsx"), "utf8");
  assert.match(aiInfluencerIp, /AI_INFLUENCER_PAGE_IP_ART/);

  const productPromoWild = fs.readFileSync(
    path.join(ROOT, "src/app/product-promo/product-promo-wild.tsx"),
    "utf8",
  );
  assert.match(productPromoWild, /\/landing\/product-promo\/iceberg\.jpg/);
  assert.doesNotMatch(productPromoWild, /\/landing\/product-promo\/hero\.jpg/);

  // Video styles tiles are locked to 16:9 at every breakpoint so the previews are not cropped on the left and right.
  const castRail = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/landing-hero-cast-rail.tsx"),
    "utf8",
  );
  const videoStylesIdx = castRail.indexOf("Video styles");
  assert.ok(videoStylesIdx >= 0);
  const videoStylesBlock = castRail.slice(videoStylesIdx);
  assert.match(videoStylesBlock, /grid-cols-2/);
  assert.match(videoStylesBlock, /relative aspect-video overflow-hidden/);
  assert.doesNotMatch(videoStylesBlock, /lg:grid-rows-3|lg:aspect-auto/);
});
