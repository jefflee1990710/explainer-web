import sharp from "sharp";

const BOARD_HEIGHT = 1024;
const GUTTER = 48;
const MARGIN = 48;

// Lay the identity portrait (left) and the full-body figure (right) on one canvas.
// Scene stills and the director get this single image per character, so the face
// close-up and the whole outfit travel together without two reference slots.
export async function composeBlueprintBoard(input: {
  portrait: Buffer;
  fullBody: Buffer;
  // Flat ground behind both panels; the style canvas colour keeps dark styles dark.
  background?: string;
}) {
  const inner = BOARD_HEIGHT - MARGIN * 2;
  const [portrait, fullBody] = await Promise.all(
    [input.portrait, input.fullBody].map(async (buffer) => {
      const png = await sharp(buffer)
        .resize({ height: inner, width: inner, fit: "inside", withoutEnlargement: false })
        .png()
        .toBuffer();
      const meta = await sharp(png).metadata();
      return { png, width: meta.width || inner, height: meta.height || inner };
    }),
  );
  const width = MARGIN + portrait.width + GUTTER + fullBody.width + MARGIN;
  return sharp({
    create: {
      width,
      height: BOARD_HEIGHT,
      channels: 3,
      background: input.background || "#ffffff",
    },
  })
    .composite([
      // Portrait sits on the left, vertically centred.
      { input: portrait.png, left: MARGIN, top: Math.round((BOARD_HEIGHT - portrait.height) / 2) },
      // Full body sits to its right, feet level with the portrait's bottom edge.
      {
        input: fullBody.png,
        left: MARGIN + portrait.width + GUTTER,
        top: Math.round((BOARD_HEIGHT - fullBody.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}