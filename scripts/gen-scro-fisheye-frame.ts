import { loadEnvConfig } from "@next/env";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "../src/service/openrouter/generate";

loadEnvConfig(process.cwd());

const SCRO_PORTRAIT_URL =
  "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/characters/6aeeb4f14bfa47590f1a2e35/6aeeb4f14bfa47590f1a2e34-portrait";

async function main() {
  console.log("Downloading Scro portrait reference...");
  const portraitRes = await fetch(SCRO_PORTRAIT_URL);
  if (!portraitRes.ok) throw new Error("Failed to fetch Scro portrait");
  const portraitBuf = Buffer.from(await portraitRes.arrayBuffer());

  const styleRefPath = path.join(
    process.cwd(),
    "Marketing/Poster - Scro Fisheye Economy Cheap AI Video.png",
  );
  let styleRefBuf: Buffer | null = null;
  if (existsSync(styleRefPath)) {
    styleRefBuf = await sharp(styleRefPath)
      .resize(720, 1280, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  const refs: string[] = [
    `data:image/jpeg;base64,${(
      await sharp(portraitBuf).resize(720, 960, { fit: "cover" }).jpeg({ quality: 88 }).toBuffer()
    ).toString("base64")}`,
  ];
  if (styleRefBuf) {
    refs.push(`data:image/jpeg;base64,${styleRefBuf.toString("base64")}`);
  }

  const prompt = `Vertical 9:16 cinematic street photography, extreme 8mm circular fisheye lens perspective.
Subject: The exact same 26-year-old East Asian Hong Kong woman (Scro, matching Reference Image 1 & 2): chin-length bob black hair, natural warm skin texture with fine pores.
Pose & Expression: She leans directly into the curved fisheye camera lens in dramatic, comical shock and disbelief. Her eyes are wide and astonished, mouth open in a stunned gasp 'O' shape, hands raised beside her cheeks in awe.
Camera & Distortion: Extreme fisheye lens distortion with strong barrel curvature warping the perspective, making her expressive face large and central in the foreground.
Background & Environment: Iconic busy Hong Kong urban street at high noon (Nathan Road, Mong Kok): towering vertical Cantonese shop signs, dense urban buildings. On the road behind her, red-and-white Hong Kong Crown Comfort taxis and towering double-decker buses are rushing past in rapid, dynamic long-exposure motion blur and speed streaks.
Lighting: Bright midday sun angled slightly from high above and behind her head, creating a brilliant sunny rim light on her hair and shoulders, casting crisp, sharp dark chiaroscuro shadows across the sunny asphalt street below.
Clean cinematic photograph, deep vibrant contrast, no watermarks, clear lower-third composition.`;

  console.log("Submitting Seedream 5.0 Pro image generation...");
  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt,
    aspectRatio: "9:16",
    resolution: "2k",
    referenceImageUrls: refs,
  });

  const url = res.images?.[0]?.url;
  if (!url) throw new Error("Seedream returned no image");

  let imgBuf: Buffer;
  if (url.startsWith("data:")) {
    const b64 = url.split(",")[1];
    imgBuf = Buffer.from(b64, "base64");
  } else {
    const f = await fetch(url);
    imgBuf = Buffer.from(await f.arrayBuffer());
  }

  const outDir = path.join(process.cwd(), "Marketing");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "Scro-Fisheye-Hong-Kong-Street-Midday.png");
  writeFileSync(outPath, imgBuf);
  console.log("Saved Seedream image to:", outPath);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
