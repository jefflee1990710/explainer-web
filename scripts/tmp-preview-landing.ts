import { mkdirSync } from "node:fs";
import sharp from "sharp";

const files = [
  "public/hero/scro-shorts.webp",
  "public/landing/use-cases/saas.webp",
  "public/landing/use-cases/product.webp",
  "public/landing/use-cases/virtual-you.webp",
  "public/landing/use-cases/explain.webp",
  "public/landing/use-cases/tutorial.webp",
  "public/landing/steps/style.webp",
  "public/landing/steps/storyboard.webp",
  "public/landing/steps/export.webp",
  "public/landing/director-scro.webp",
];

async function main() {
  mkdirSync("/tmp/landing-preview", { recursive: true });
  for (const file of files) {
    const img = sharp(file);
    const meta = await img.metadata();
    const name = file.split("/").pop()?.replace(".webp", ".jpg");
    await img.jpeg({ quality: 70 }).toFile(`/tmp/landing-preview/${name}`);
    console.log(meta.width, meta.height, file);
  }
}

main();
