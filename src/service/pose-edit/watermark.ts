import sharp from "sharp";

// Render a bottom-right "Scro.io" watermark badge onto free-tier pose edit outputs.
export async function applyPoseWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const badgeWidth = Math.max(120, Math.round(width * 0.22));
  const badgeHeight = Math.max(36, Math.round(badgeWidth * 0.28));
  const fontSize = Math.max(14, Math.round(badgeHeight * 0.48));
  const margin = Math.max(14, Math.round(Math.min(width, height) * 0.025));
  const radius = Math.round(badgeHeight / 2);

  const svg = `<svg width="${badgeWidth}" height="${badgeHeight}" viewBox="0 0 ${badgeWidth} ${badgeHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="${radius}" ry="${radius}" fill="#12141C" fill-opacity="0.72" stroke="#C6F24B" stroke-opacity="0.65" stroke-width="1.5"/>
    <circle cx="${Math.round(badgeHeight * 0.48)}" cy="${Math.round(badgeHeight / 2)}" r="${Math.max(4, Math.round(badgeHeight * 0.14))}" fill="#C6F24B"/>
    <text x="${Math.round(badgeWidth * 0.56)}" y="${Math.round(badgeHeight * 0.66)}" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#FFFFFF" letter-spacing="0.5">Scro.io</text>
  </svg>`;

  const left = Math.max(0, width - badgeWidth - margin);
  const top = Math.max(0, height - badgeHeight - margin);

  return image
    .composite([
      {
        input: Buffer.from(svg),
        left,
        top,
      },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}
