import type { IStyle } from "@/model/style";

// Hardcoded style definition for "papercraft-diorama" (3D tactile cardstock diorama).
export const papercraftDioramaStyle: IStyle = {
  id: "papercraft-diorama",
  name: "3D papercraft diorama",
  description: "300gsm 厚紋理卡紙摺疊而成的 3D 微縮場景與道具模型，配復古深藍、芥末黃、赤陶紅與青綠撞色。",
  canvas:
    "3D miniature tabletop stage or flat-lay backdrop built entirely from heavy 300gsm matte textured cardstock paper",
  canvasColor: "#1e3a6d",
  look: "3D tactile cardstock papercraft diorama and miniature craft photography: every architectural wall, counter, furniture piece, envelope, coin, certificate, scale, and prop is constructed from thick matte 300gsm textured construction paper / heavy cardstock with crisp scored and folded geometric bevel edges, visible paper fiber grain, layered paper thickness, and soft studio tabletop key light with gentle contact shadows and shallow miniature macro depth-of-field (strictly NO white scissor borders and NO flat magazine photo cutouts)",
  palette:
    "curated editorial craft cardstock palette: deep cobalt and navy blue, warm mustard yellow, terracotta coral red, deep teal, and warm cream/ivory paper",
  typography:
    "bold dark-navy editorial serif or clean geometric sans printed on a torn-edge warm cream cardstock banner strip taped at the top corners with small kraft masking-tape tabs, plus a small burnt-orange cardstock tag strip for beat labels",
  motion:
    "tactile stop-motion papercraft mechanics: folded cardstock parts stay rigid while paper receipt ribbons feed and unroll smoothly from slots, embossed paper coins slide into cardstock envelopes, and cardstock balance scales tip and settle with physical weight; never morph, melt, or dissolve",
  negatives:
    "white scissor cutout borders, flat 2D magazine photo collage, photorealistic human skin, plastic or glossy 3D CGI, neon cyberpunk, marker whiteboard doodles, chalkboard, watercolor washes, morphing shapes",
  letteringLayout:
    "Layout: place the main chapter banner near the upper safe zone (16%–24% of frame height) on a torn-edge cream cardstock strip taped at both top corners, and keep beat tags on a small burnt-orange cardstock strip above the lower third.",
  letteringLine1:
    "Line 1 is bold dark-navy editorial display type printed on a torn-edge warm cream cardstock strip with two angled kraft tape tabs at the top corners.",
  letteringLine2:
    "When a beat tag exists, set it in crisp cream serif type on a small rectangular burnt-orange cardstock tag strip.",
  beatTitleLayout:
    "Place a short chapter or beat title on a torn-edge warm cream cardstock banner strip near the upper safe zone (16%–24% of frame height) with two small angled kraft masking-tape tabs on the top corners.",
  reelLayout:
    "Layout: vertical reel safe zone. Keep the top cardstock banner below the top 14% and the burnt-orange subtitle band above the bottom 18% so app chrome never covers the papercraft scene.",
  previewUrl: "/hero/styles/papercraft-diorama-preview.webp",
  previewFullUrl: "/hero/styles/papercraft-diorama.webp",
  behavior: {
    realistic: false,
    usesDrawingSurface: false,
    monochromeChalk: false,
  },
};
