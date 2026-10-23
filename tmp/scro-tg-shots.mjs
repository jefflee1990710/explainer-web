import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const outDir = "/tmp/scro-tg-shots";
await mkdir(outDir, { recursive: true });

const base = "https://www.scro.io";

async function waitForLive() {
  for (let i = 0; i < 36; i++) {
    try {
      const res = await fetch(`${base}/ai-influencer`, { redirect: "follow" });
      const html = await res.text();
      if (html.includes("/landing/ai-influencer/ip-wardrobe.jpg")) {
        console.log("live", res.status);
        return;
      }
      console.log("waiting", i, res.status, html.includes("ip-wardrobe"));
    } catch (error) {
      console.log("waiting-error", i, error instanceof Error ? error.message : "fetch");
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  throw new Error("production HTML does not include the new wardrobe still");
}

await waitForLive();

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
await context.addCookies([
  { name: "explainer.locale", value: "zh-Hant", domain: "www.scro.io", path: "/" },
  { name: "explainer.locale", value: "zh-Hant", domain: ".scro.io", path: "/" },
]);
await context.addInitScript(() => {
  localStorage.setItem("explainer.locale", "zh-Hant");
});
const page = await context.newPage();

const shots = [
  { file: "01-home.jpg", path: "/", selector: null },
  { file: "02-home-steps.jpg", path: "/", selector: 'img[src*="/landing/steps/character"]' },
  { file: "03-ai-hero.jpg", path: "/ai-influencer", selector: null },
  { file: "04-ai-ip.jpg", path: "/ai-influencer", selector: 'img[src*="ip-wardrobe"]' },
  { file: "05-promo-hero.jpg", path: "/product-promo", selector: null },
  { file: "06-promo-wild.jpg", path: "/product-promo", selector: "#wild h2" },
  { file: "07-right-tool.jpg", path: "/right-tool", selector: null },
  { file: "08-right-tool-cards.jpg", path: "/right-tool", selector: "#influencer h2" },
  { file: "09-talking-head.jpg", path: "/talking-head", selector: "#steps h2" },
  { file: "10-cantonese.jpg", path: "/cantonese", selector: "#fit h2" },
  { file: "11-explainer.jpg", path: "/explainer", selector: "#uses h2" },
];

for (const shot of shots) {
  await page.goto(`${base}${shot.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1600);
  if (shot.selector) {
    const target = page.locator(shot.selector).first();
    await target.waitFor({ state: "attached", timeout: 20000 });
    await target.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    await page.waitForTimeout(900);
  }
  await page.screenshot({ path: `${outDir}/${shot.file}`, type: "jpeg", quality: 72 });
  console.log("shot", shot.file);
}

await browser.close();
console.log("files", readdirSync(outDir).join(","));
