import type { IStyle } from "@/model/style";

// Hardcoded style definition for "papercraft-diorama" (3D tactile cardstock diorama).
export const papercraftDioramaStyle: IStyle = {
  id: "papercraft-diorama",
  name: "3D papercraft diorama",
  description: "300gsm 厚紋理卡紙摺疊而成的 3D 微縮場景與道具模型，配復古深藍、芥末黃、赤陶紅與青綠撞色。",
  canvas:
    "3D miniature tabletop stage or flat-lay backdrop built entirely from heavy 300gsm matte textured cardstock paper",
  canvasColor: "#1e3a6d",
  look: "3D tactile cardstock papercraft diorama and miniature craft photography: every miniature character figurine, architectural wall, counter, furniture piece, envelope, coin, certificate, scale, and prop is constructed from thick matte 300gsm textured construction paper / heavy cardstock with crisp scored and folded geometric bevel edges, visible paper fiber grain, layered paper thickness, and soft studio tabletop key light with gentle contact shadows and shallow miniature macro depth-of-field (strictly NO white scissor borders and NO flat magazine photo cutouts)",
  palette:
    "curated editorial craft cardstock palette: deep cobalt and navy blue, warm mustard yellow, terracotta coral red, deep teal, and warm cream/ivory paper",
  typography:
    "bold dark-navy editorial serif or clean geometric sans printed on a torn-edge warm cream cardstock strip, with small kraft tape tabs on the strip itself, plus a small burnt-orange cardstock tag for a nearby prop. The strip floats in the center of the frame, clear of every edge",
  motion:
    "fast tactile papercraft: each ribbon feed, coin slide, lid open, and scale tip finishes in under 0.6 seconds, then holds. Folded cardstock stays rigid and never morphs, melts, or dissolves. Do not stretch one move slowly across the clip",
  negatives:
    "white scissor cutout borders, flat 2D magazine photo collage, photorealistic human skin, plastic or glossy 3D CGI, neon cyberpunk, marker whiteboard doodles, chalkboard, watercolor washes, morphing shapes",
  letteringLayout:
    "Layout: cluster the main title and captions around the center of the frame with the teaching prop. The main title is horizontally centered, slightly above the vertical center, on a torn-edge cream cardstock strip that is narrower than the frame. Visible background stays above the strip and on both sides. Captions sit beside the prop in that same cluster. Never glue the strip to an edge and never crop a glyph.",
  letteringLine1:
    "Line 1 is bold dark-navy editorial display type printed on a torn-edge warm cream cardstock strip with two angled kraft tape tabs at the top corners.",
  letteringLine2:
    "When a beat tag exists, set it in crisp cream serif type on a small rectangular burnt-orange cardstock tag strip.",
  beatTitleLayout:
    "Place the short chapter title on a torn-edge warm cream cardstock strip in the center of the frame, slightly above the vertical center. Kraft tape tabs stick to the strip itself. Do not pin the strip to the top edge.",
  reelLayout:
    "Layout: vertical reel. The cardstock background fills the frame edge to edge. Every title and caption stays in the central cluster, with background visible above, below, and on both sides.",
  previewUrl: "/hero/styles/papercraft-diorama-preview.webp",
  previewFullUrl: "/hero/styles/papercraft-diorama.webp",
  behavior: {
    realistic: false,
    usesDrawingSurface: false,
    monochromeChalk: false,
  },
};
