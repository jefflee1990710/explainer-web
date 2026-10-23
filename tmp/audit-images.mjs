import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

// Audit marketing pages: flag stretched (object-fit: fill + ratio mismatch) and heavily cropped images.
const PAGES = ["/", "/ai-influencer", "/product-promo", "/right-tool", "/talking-head", "/cantonese", "/explainer"];
const outDir = process.argv[2] ?? "tmp/audit";
const widths = (process.argv[3] ?? "1440").split(",").map(Number);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const path of PAGES) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "load", timeout: 120000 });
    // Scroll through so lazy content and motion reveals render.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const issues = await page.evaluate(() => {
      const out = [];
      for (const el of [...document.querySelectorAll("img, video")]) {
        const r = el.getBoundingClientRect();
        const nw = el.naturalWidth ?? el.videoWidth;
        const nh = el.naturalHeight ?? el.videoHeight;
        if (!nw || !nh || r.width < 40 || r.height < 40) continue;
        const cs = getComputedStyle(el);
        if (cs.opacity === "0" || cs.filter.includes("blur")) continue;
        const natural = nw / nh;
        const box = r.width / r.height;
        const fit = cs.objectFit;
        const src = (el.currentSrc || el.src || "").replace(location.origin, "");
        if (fit === "fill" && Math.abs(natural / box - 1) > 0.04) {
          out.push({ kind: "STRETCH", src, natural: natural.toFixed(2), box: box.toFixed(2), pos: cs.objectPosition });
        } else if (fit === "cover") {
          // Fraction of the source that is hidden along the cropped axis.
          const kept = natural > box ? box / natural : natural / box;
          if (kept < 0.8) {
            out.push({
              kind: natural > box ? "CROP-X" : "CROP-Y",
              src,
              kept: kept.toFixed(2),
              natural: natural.toFixed(2),
              box: box.toFixed(2),
              pos: cs.objectPosition,
            });
          }
        }
      }
      return out;
    });
    const name = path === "/" ? "home" : path.slice(1);
    await page.screenshot({ path: `${outDir}/${name}-${width}.png`, fullPage: true });
    console.log(`\n## ${path} @${width}`);
    for (const i of issues) console.log(JSON.stringify(i));
  }
  await page.close();
}
await browser.close();
