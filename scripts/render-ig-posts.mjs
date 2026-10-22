/**
 * Render one English Instagram portrait (1080×1350) per feature page.
 * Usage: node scripts/render-ig-posts.mjs
 */
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const sharp = createRequire(import.meta.url)("sharp");

const ROOT = process.cwd();
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DRAFT = path.join(ROOT, "public/_ig-render");
const WIDTH = 1080;
const HEIGHT = 1350;

const POSTS = [
  {
    id: "ai",
    file: "public/landing/ai-influencer/ig-post.jpg",
    photo: "/landing/ai-influencer/ex-cafe.jpg",
    kicker: "AI Influencer",
    title: "A face is the shell. The soul is what you know.",
    lede: "One locked face. Your knowledge. A feed people recognize.",
  },
  {
    id: "promo",
    file: "public/landing/product-promo/ig-post.jpg",
    photo: "/landing/product-promo/ex-serum.jpg",
    kicker: "Product promo",
    title: "A scene a crew would not book.",
    lede: "The real product. A host people know. One clip.",
  },
  {
    id: "tool",
    file: "public/landing/right-tool/ig-post.jpg",
    photo: "/landing/right-tool/ex-talk.jpg",
    kicker: "The right tool",
    title: "One studio for the whole film.",
    lede: "Character, script, and cut. No second app.",
  },
  {
    id: "talk",
    file: "public/landing/talking-head/ig-post.jpg",
    photo: "/landing/talking-head/ex-room.jpg",
    kicker: "Talking head",
    title: "On camera, without living on camera.",
    lede: "A host in a real room. You keep the afternoon.",
  },
  {
    id: "canto",
    file: "public/landing/cantonese/ig-post.jpg",
    photo: "/landing/cantonese/ex-cafe.jpg",
    kicker: "Cantonese",
    title: "Hong Kong speech. Not a translation.",
    lede: "Local words, a local place, the same face.",
  },
  {
    id: "explain",
    file: "public/landing/explainer/ig-post.jpg",
    photo: "/landing/explainer/ex-funnel.jpg",
    kicker: "Explainer",
    title: "Say the idea once, and show it.",
    lede: "One claim. One picture. One host.",
  },
];

function page(post) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #0a0c10; }
  body {
    font-family: "Avenir Next", "Segoe UI", sans-serif;
    color: white;
    padding: 64px;
    display: flex;
    flex-direction: column;
  }
  .brand { display: flex; align-items: center; gap: 16px; }
  .brand img { width: 56px; height: 56px; border-radius: 14px; }
  .brand span { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; }
  .kicker {
    margin-top: 36px;
    align-self: flex-start;
    background: #c6f24b;
    color: #12141c;
    border-radius: 999px;
    padding: 10px 18px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  h1 {
    margin-top: 28px;
    font-size: 68px;
    line-height: 1.05;
    letter-spacing: -0.035em;
    font-weight: 700;
    max-width: 920px;
  }
  .lede {
    margin-top: 20px;
    font-size: 28px;
    line-height: 1.35;
    color: rgba(255,255,255,0.72);
    max-width: 860px;
  }
  .frame {
    margin-top: 36px;
    flex: 1;
    min-height: 0;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.12);
    background: #12141c;
  }
  .frame img { width: 100%; height: 100%; object-fit: cover; object-position: center top; }
  .cta {
    margin-top: 28px;
    align-self: flex-start;
    background: #c6f24b;
    color: #12141c;
    border-radius: 999px;
    padding: 14px 22px;
    font-size: 22px;
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="brand"><img src="/logo-mark.png" alt="" /><span>Scro</span></div>
  <p class="kicker">${post.kicker}</p>
  <h1>${post.title}</h1>
  <p class="lede">${post.lede}</p>
  <div class="frame"><img src="${post.photo}" alt="" /></div>
  <p class="cta">scro.io</p>
</body>
</html>`;
}

function shot(url, dest) {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${WIDTH},${HEIGHT}`,
      `--screenshot=${dest}`,
      url,
    ], { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`chrome ${code} ${url}`))));
  });
}

async function main() {
  await mkdir(DRAFT, { recursive: true });
  for (const post of POSTS) {
    const htmlPath = path.join(DRAFT, `${post.id}.html`);
    await writeFile(htmlPath, page(post));
    const png = path.join(DRAFT, `${post.id}.png`);
    await shot(`http://localhost:3000/_ig-render/${post.id}.html`, png);
    const jpg = await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    const dest = path.join(ROOT, post.file);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, jpg);
    const meta = await sharp(jpg).metadata();
    console.log("wrote", post.file, meta.width, meta.height, jpg.length);
  }
  await rm(DRAFT, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
