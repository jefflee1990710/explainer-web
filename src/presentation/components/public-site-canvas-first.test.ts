import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { en } from "@/util/i18n/messages/en";
import { zhHans } from "@/util/i18n/messages/zh-Hans";
import { zhHant } from "@/util/i18n/messages/zh-Hant";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// Public marketing surface: these files may never carry internal tool names,
// node-graph jargon, timeline jargon, or legacy standalone routes.
const PUBLIC_COMPONENTS = [
  "src/presentation/components/site-header.tsx",
  "src/presentation/components/site-footer.tsx",
  "src/presentation/components/landing-hero.tsx",
  "src/presentation/components/landing-canvas-showcase.tsx",
  "src/presentation/components/landing-canvas-templates.tsx",
  "src/presentation/components/canvas-template-launcher.tsx",
  "src/presentation/components/canvas-post-flow-visual.tsx",
  "src/presentation/components/landing-steps.tsx",
  "src/presentation/components/landing-catalog.tsx",
  "src/presentation/components/studio-powertools-band.tsx",
  "src/presentation/components/landing-free-credit.tsx",
  "src/presentation/components/examples-hero.tsx",
];

const JARGON = /comfyui|opencut|ffmpeg|multi-track|2 cr\/s|節點|节点|駁線|驳线|連線|连线|時間軸|时间轴/i;

describe("Canvas-First public website invariants", () => {
  it("public components contain no internal tool names or node/timeline jargon", () => {
    for (const rel of PUBLIC_COMPONENTS) {
      const src = read(rel);
      const hit = src.match(JARGON);
      assert.equal(
        hit,
        null,
        `${rel} leaks public-site jargon "${hit?.[0]}" — rewrite it in plain creator language`,
      );
    }
  });

  it("public pages never hard-code the bare /app or /sign-up CTA pair", () => {
    const dirs = ["src/app", "src/presentation/components"];
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(rel);
          continue;
        }
        if (!rel.endsWith(".tsx")) continue;
        if (!/src\/(app|presentation\/components)\//.test(rel)) continue;
        // Product app screens keep their own in-app routes.
        if (rel.includes("/app/app/") || rel.includes("/presentation/components/app/")) continue;
        const src = read(rel);
        if (/signedIn \? "\/app" : "\/sign-up"/.test(src)) offenders.push(rel);
      }
    };
    for (const dir of dirs) walk(dir);
    assert.deepEqual(offenders, [], "public CTAs must use canvasLaunchHref(signedIn, templateId)");
  });

  it("footer Canvas link uses canvasLaunchHref and readable dark hover colors", () => {
    const footer = read("src/presentation/components/site-footer.tsx");
    assert.match(footer, /canvasLaunchHref/);
    assert.match(footer, /SiteFooter\(\{[^}]*signedIn/);
    assert.doesNotMatch(footer, /hover:text-\[#12141c\]/);
  });

  it("header CTA label is localized for zh locales", () => {
    const header = read("src/presentation/components/site-header.tsx");
    assert.match(header, /canvasLaunchHref\(signedIn\)/);
    assert.doesNotMatch(header, />\s*Open Canvas\s*</);
  });

  it("capability band has a zh-Hans branch instead of Cantonese copy", () => {
    const band = read("src/presentation/components/studio-powertools-band.tsx");
    assert.match(band, /zh-Hans/);
    assert.doesNotMatch(band, /const isZh = locale\.startsWith\("zh"\)/);
  });

  it("homepage steps and free-credit bands speak Canvas, not 'AI Influencer → explainer'", () => {
    assert.doesNotMatch(en.landing.steps.title, /AI Influencer/i);
    assert.doesNotMatch(zhHant.landing.steps.title, /AI 網紅/);
    assert.doesNotMatch(zhHans.landing?.steps?.title ?? "", /AI 网红/);
    assert.match(en.landing.steps.title, /Canvas|Template/i);
    assert.match(zhHant.landing.steps.title, /畫布|Canvas|範本/);
    assert.match(zhHans.landing?.steps?.title ?? "", /画布|Canvas|模板/);
    assert.match(en.landing.freeCredit.title, /Canvas/i);
    assert.match(zhHant.landing.freeCredit.title, /Canvas|畫布/);
    assert.match(zhHans.landing?.freeCredit?.title ?? "", /Canvas|画布/);
    assert.doesNotMatch(en.landing.hero.artLabel, /Build Your AI Creator IP/i);
  });

  it("template launcher titles are locale-aware and never name FFmpeg", () => {
    const canvasPage = read("src/app/app/canvas/page.tsx");
    assert.match(canvasPage, /createCanvasFromStarterTemplate\([\s\S]*requestedLocale/);
    const workspace = read("src/service/canvas/use-cases/workspace.ts");
    assert.match(workspace, /locale === "zh-Hant"/, "new Canvas titles must follow the visitor locale");
    assert.match(workspace, /tpl\.name\.en/);
    const templates = read("src/service/canvas/core/templates.ts");
    const ffmpegReelBlock = templates.slice(
      templates.indexOf('id: "merge-reel"'),
      templates.indexOf('id: "text-image-video"'),
    );
    assert.doesNotMatch(ffmpegReelBlock, /FFmpeg/);
  });

  it("landing catalog secondary CTA label matches the Canvas destination", () => {
    assert.doesNotMatch(en.landing.catalog.ctaSecondary, /Life desk|Life 工作台/i);
    assert.doesNotMatch(zhHant.landing.catalog.ctaSecondary, /Life 工作台/);
    assert.doesNotMatch(zhHans.landing?.catalog?.ctaSecondary ?? "", /Life 工作台/);
  });
});
