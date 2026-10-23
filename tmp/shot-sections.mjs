import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

// Screenshot every <section> of the marketing pages at one viewport width.
const PAGES = (process.argv[4] ?? "/,/ai-influencer,/product-promo,/right-tool,/talking-head,/cantonese,/explainer").split(",");
const outDir = process.argv[2] ?? "tmp/sections";
const width = Number(process.argv[3] ?? 1440);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 } });
for (const path of PAGES) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "load", timeout: 120000 });
  const count = await page.locator("section").count();
  const name = path === "/" ? "home" : path.slice(1);
  for (let i = 0; i < count; i++) {
    const section = page.locator("section").nth(i);
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await section.screenshot({ path: `${outDir}/${name}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(path, count);
}
await browser.close();
