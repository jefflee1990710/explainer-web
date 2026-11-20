import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { en } from "@/util/i18n/messages/en";
import { zhHant } from "@/util/i18n/messages/zh-Hant";
import { zhHans } from "@/util/i18n/messages/zh-Hans";

const ROOT = process.cwd();

test("landing messages focus Scro on effortless Canvas AI media creation with zero technical jargon", () => {
  assert.match(en.meta.title, /Canvas|AI Media|AI Video/i);
  assert.match(en.landing.hero.kicker, /Scro Canvas|AI Media/i);
  assert.match(en.landing.hero.title, /Canvas/i);
  assert.ok(en.landing.hero.title.length <= 60, "en hero title should stay concise");
  assert.ok(en.landing.hero.subtitle.length <= 150, "en hero subtitle should stay concise");
  assert.match(zhHant.meta.title, /Canvas|AI 影片|AI 媒體/);
  assert.match(zhHant.landing.hero.kicker, /Canvas/);
  assert.match(zhHant.landing.hero.title, /畫布|Canvas/);
  assert.match(zhHans.meta?.title ?? "", /Canvas|AI 视频|AI 媒体/);
  assert.match(zhHans.landing?.hero?.kicker ?? "", /Canvas/);

  // Zero technical jargon (ComfyUI / OpenCut / FFmpeg / Multi-Track) in public marketing copy
  for (const [langName, msg] of [
    ["en", en],
    ["zhHant", zhHant],
    ["zhHans", zhHans],
  ] as const) {
    const publicCopy = JSON.stringify({
      meta: msg.meta,
      landing: msg.landing,
      rightTool: msg.rightTool,
      talkingHeadPage: msg.talkingHeadPage,
      explainerPage: msg.explainerPage,
      cantonesePage: msg.cantonesePage,
      aiInfluencerPage: msg.aiInfluencerPage,
      productPromoPage: msg.productPromoPage,
    });
    assert.doesNotMatch(
      publicCopy,
      /comfyui|opencut|ffmpeg|multi-track|多軌\s*timeline|時間軸/i,
      `${langName} public copy must not mention ComfyUI, OpenCut, FFmpeg, or Multi-Track timeline`,
    );
  }

  const heroArt = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/landing-hero-art.tsx"),
    "utf8",
  );
  assert.doesNotMatch(heroArt, /studio-backdrop\.webp/);
  assert.match(heroArt, /#0d0e13/);
});

test("HomePage leads with Canvas-First hero, interactive showcase, 6 templates, and zero ComfyUI/OpenCut/FFmpeg jargon", () => {
  const homePage = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
  const heroIdx = homePage.indexOf("<LandingHero");
  const showcaseIdx = homePage.indexOf("<LandingCanvasShowcase");
  const templatesIdx = homePage.indexOf("<LandingCanvasTemplates");
  const stepsIdx = homePage.indexOf("<LandingSteps");
  const castIdx = homePage.indexOf("<LandingCast");
  const powerIdx = homePage.indexOf("<StudioPowertoolsBand");
  const freeIdx = homePage.indexOf("<LandingFreeCredit");
  assert.ok(
    heroIdx >= 0 &&
      showcaseIdx > heroIdx &&
      templatesIdx > showcaseIdx &&
      stepsIdx > templatesIdx &&
      castIdx > stepsIdx &&
      powerIdx > castIdx &&
      freeIdx > powerIdx,
    "HomePage should follow the 6-band Canvas-First flow",
  );
  assert.doesNotMatch(homePage, /Multi-Track|OpenCut|ComfyUI|FFmpeg/i);

  const heroSrc = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/landing-hero.tsx"),
    "utf8",
  );
  assert.match(heroSrc, /canvasLaunchHref/);
  assert.doesNotMatch(heroSrc, /href="\/simple"|2 cr\/s|comfy|opencut|ffmpeg/i);

  const powerSrc = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/studio-powertools-band.tsx"),
    "utf8",
  );
  assert.doesNotMatch(powerSrc, /comfy|opencut|ffmpeg|時間軸剪輯器/i);

  const catalogSrc = fs.readFileSync(
    path.join(ROOT, "src/presentation/components/landing-catalog.tsx"),
    "utf8",
  );
  assert.doesNotMatch(catalogSrc, /\/app\/life/);
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

  // Public tool pages must use CanvasTemplateLauncher (never PublicStudioCreationHub) and never render OpenCut editor-desk.png
  for (const rel of [
    "src/app/simple/page.tsx",
    "src/app/scroswap/page.tsx",
    "src/app/teleport/page.tsx",
    "src/app/explainer/page.tsx",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotMatch(src, /PublicStudioCreationHub/, `${rel} should not mount legacy PublicStudioCreationHub`);
  }
  for (const rel of [
    "src/app/talking-head/talking-head-finish.tsx",
    "src/app/right-tool/right-tool-edit.tsx",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.doesNotMatch(src, /editor-desk\.png/, `${rel} should not render legacy OpenCut screenshot`);
    assert.match(src, /CanvasPostFlowVisual/);
  }

  // Public feature CTAs should route video creation to Canvas (no raw /app/products or /app/life dead links) and canvas page sets maxDuration=800
  const canvasPage = fs.readFileSync(path.join(ROOT, "src/app/app/canvas/page.tsx"), "utf8");
  assert.match(canvasPage, /maxDuration\s*=\s*800/);

  for (const rel of [
    "src/app/explainer/explainer-hero.tsx",
    "src/app/explainer/explainer-cta.tsx",
    "src/app/talking-head/talking-head-hero.tsx",
    "src/app/talking-head/talking-head-cta.tsx",
    "src/app/cantonese/cantonese-hero.tsx",
    "src/app/cantonese/cantonese-cta.tsx",
    "src/app/product-promo/product-promo-hero.tsx",
    "src/app/product-promo/product-promo-cta.tsx",
    "src/app/right-tool/right-tool-hero.tsx",
    "src/app/right-tool/right-tool-cta.tsx",
    "src/presentation/components/examples-hero.tsx",
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    assert.match(src, /canvasLaunchHref/, `${rel} should route to Scro Canvas via canvasLaunchHref`);
  }
});
