import { chromium } from "playwright-core";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => {
  localStorage.setItem("explainer.locale", "zh-Hant");
  document.cookie = "explainer.locale=zh-Hant; path=/; max-age=31536000; SameSite=Lax";
});
await page.reload({ waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "artifacts/landing/landing-hero-zh.png" });
await page.getByText("建立角色與衣櫃").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: "artifacts/landing/landing-steps-zh.png" });
await browser.close();
console.log("ok");
