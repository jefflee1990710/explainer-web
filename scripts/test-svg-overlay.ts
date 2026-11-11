import sharp from "sharp";
import { writeFileSync } from "node:fs";

async function testOverlay() {
  const width = 1440;
  const height = 2560;

  // Bottom banner overlay:
  // "平民級別嘅影片生成工具！"
  // "原來呢個價錢大家已經可以開始！"
  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#C6F24B"/>
        <stop offset="100%" stop-color="#A3FF47"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.8"/>
      </filter>
      <filter id="textGlow">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.95"/>
      </filter>
    </defs>

    <!-- Lower third container -->
    <g transform="translate(0, 1780)">
      <!-- Backdrop Card with dark frosted glass effect -->
      <rect x="70" y="0" width="1300" height="420" rx="44" ry="44" 
            fill="#0D111A" fill-opacity="0.92" stroke="#A3FF47" stroke-width="4" stroke-opacity="0.5" filter="url(#shadow)"/>
      
      <!-- Top Pill Badge -->
      <g transform="translate(120, -28)">
        <rect x="0" y="0" width="340" height="56" rx="28" ry="28" fill="#A3FF47"/>
        <text x="170" y="38" font-family="Hiragino Sans GB, STHeiti, sans-serif" font-size="28" font-weight="900" fill="#0D111A" text-anchor="middle" letter-spacing="1">
          🔥 超平 AI 影片工具
        </text>
      </g>

      <!-- Main Headline Line 1 -->
      <text x="720" y="150" font-family="Hiragino Sans GB, STHeiti, sans-serif" font-size="76" font-weight="900" fill="#FFFFFF" text-anchor="middle" filter="url(#textGlow)" letter-spacing="2">
        平民級別嘅影片生成工具！
      </text>

      <!-- Sub Headline Line 2 in Neon Lime -->
      <text x="720" y="270" font-family="Hiragino Sans GB, STHeiti, sans-serif" font-size="64" font-weight="900" fill="#A3FF47" text-anchor="middle" filter="url(#textGlow)" letter-spacing="1">
        原來呢個價錢大家已經可以開始！
      </text>

      <!-- Bottom Small Feature Chips -->
      <g transform="translate(260, 330)">
        <rect x="0" y="0" width="280" height="48" rx="24" ry="24" fill="#1C2333" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="2"/>
        <text x="140" y="32" font-family="Hiragino Sans GB, STHeiti, sans-serif" font-size="24" font-weight="bold" fill="#E2E8F0" text-anchor="middle">
          ⚡ 2 credits / 秒
        </text>

        <rect x="310" y="0" width="280" height="48" rx="24" ry="24" fill="#1C2333" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="2"/>
        <text x="450" y="32" font-family="Hiragino Sans GB, STHeiti, sans-serif" font-size="24" font-weight="bold" fill="#E2E8F0" text-anchor="middle">
          🎬 2K 電影級畫質
        </text>

        <rect x="620" y="0" width="300" height="48" rx="24" ry="24" fill="#1C2333" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="2"/>
        <text x="770" y="32" font-family="Hiragino Sans GB, STHeiti, sans-serif" font-size="24" font-weight="bold" fill="#E2E8F0" text-anchor="middle">
          🎁 免費送 Welcome Credits
        </text>
      </g>
    </g>
  </svg>
  `;

  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync("Marketing/overlay-test.png", buf);
  console.log("Saved overlay-test.png");
}

testOverlay().catch(console.error);
