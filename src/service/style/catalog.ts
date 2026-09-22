import type { StyleId } from "@/model/style-id";

export type { StyleId };

// Single source of truth for visual styles. Characters and videos share it;
// prompts are built from these fields by ./prompts.ts. Colour words only in
// prompt fields (SKILL.md forbids hex inside model prompts); `canvasColor`
// is for UI cards and alpha-flattening and never reaches a prompt.
export type Style = {
  id: StyleId;
  name: string;
  nameZh: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
};

export const DEFAULT_STYLE_ID: StyleId = "doodle";

export const STYLE_IDS: StyleId[] = [
  "doodle",
  "flat-vector",
  "paper-cutout",
  "chalkboard",
  "watercolor",
  "clay",
  "pixel",
  "ink-manga",
  "realistic",
];

// Shared preview scene: identical composition for every style so the nine
// cards compare directly and each shows how the style renders text.
export const STYLE_PREVIEW_SCENE =
  "Scene: a friendly explainer character stands at the left third, pointing up at a large light bulb floating at the right third; the bulb carries the label IDEA; one arrow curves from the character's hand to the bulb. Wide margins on every side. Showcase this style's canvas, look and lettering.";

export const STYLES: Record<StyleId, Style> = {
  doodle: {
    id: "doodle",
    name: "Whiteboard doodle",
    nameZh: "白板塗鴉手繪",
    description: "黑色馬克筆線條、扁平上色，白板解說感。",
    canvas: "clean solid white canvas, as if sketched with a digital marker",
    canvasColor: "#ffffff",
    look: "2D hand-drawn cartoon: bold black outlines with slightly irregular organic stroke weight, lines never perfectly straight; flat marker-style colour fills sitting slightly inside the outlines and a little scribbled; almost no shading",
    palette: "white canvas, black ink, light blue, warm yellow, brown, green and gray; warm yellow for tags and highlights, green for arrows and positive tags, brown for cardboard boxes, gray for neutral props",
    typography: "short handwritten all-caps marker labels in black with the same stroke weight as the outlines and a slightly wobbly baseline; tags are warm-yellow rounded rectangles with a black outline; never printed fonts, never subtitles or captions",
    motion: "marker-doodle animation: objects pop, morph and slide with snappy hand-drawn timing; arrows draw themselves on; icons snap into place",
    negatives: "photorealism, 3D rendering, painterly shading, gradients, chalkboard inversion, polished outline-free vector art, perfect CAD geometry, watermarks",
  },
  "flat-vector": {
    id: "flat-vector",
    name: "Flat vector",
    nameZh: "扁平向量插畫",
    description: "無外框幾何造型、企業風配色，乾淨俐落。",
    canvas: "flat solid off-white canvas",
    canvasColor: "#f6f4ee",
    look: "clean flat vector illustration with no outlines: simple geometric shapes, soft rounded corners, characters with slightly elongated limbs, flat colour blocks with at most one darker tone for depth, no gradients, no textures",
    palette: "off-white canvas with a confident corporate palette: deep indigo, coral, mustard, teal and a warm range of skin tones; one accent colour per scene",
    typography: "clean geometric sans-serif labels in title case, medium weight, set in deep indigo or the scene accent colour; labels sit in soft rounded pill shapes or float with generous spacing; never handwriting",
    motion: "smooth eased motion: shapes slide and scale with gentle overshoot, elements assemble from simple geometric parts, subtle parallax",
    negatives: "outlines, hand-drawn wobble, photorealism, 3D shading, gradients, textures, heavy drop shadows",
  },
  "paper-cutout": {
    id: "paper-cutout",
    name: "Paper cut-out",
    nameZh: "剪紙拼貼",
    description: "層疊色紙、手撕邊緣與微陰影的停格質感。",
    canvas: "kraft-toned textured paper backdrop",
    canvasColor: "#e9dcc5",
    look: "layered paper cut-out collage: every element is a flat piece of coloured construction paper with slightly torn or scissor-cut edges, stacked with small soft drop shadows to show depth; visible paper grain, no outlines",
    palette: "kraft paper background with saturated construction-paper colours: tomato red, sky blue, sunflower yellow, leaf green, cream and charcoal",
    typography: "letters cut individually from dark paper and glued slightly askew, bold uppercase, each letter casting a tiny shadow; labels sit on a torn paper strip in a contrasting colour",
    motion: "stop-motion paper feel: pieces slide in on flat planes, flip and layer, slight jitter between frames, shadows move with the pieces",
    negatives: "outlines, smooth vector shading, photorealistic people, gradients, glossy 3D, digital fonts",
  },
  chalkboard: {
    id: "chalkboard",
    name: "Chalkboard",
    nameZh: "粉筆黑板",
    description: "深綠黑板、白色與粉彩粉筆手繪。",
    canvas: "dark green slate chalkboard with faint chalk-dust smudges",
    canvasColor: "#2f4f3f",
    look: "hand-drawn chalk illustration: white chalk strokes with rough dusty texture and slightly uneven pressure, sparse cross-hatch shading, coloured chalk used only for accents",
    palette: "dark green board, white chalk, pastel chalk accents in yellow, pink, light blue and mint",
    typography: "handwritten chalk lettering in white, all caps, slightly uneven with chalk-dust texture; key words underlined with a quick chalk stroke or boxed in a coloured chalk rectangle",
    motion: "chalk draws itself on stroke by stroke, erased areas leave a faint smear, elements wipe in and out like a hand drawing live",
    negatives: "white background, marker lines, photorealism, 3D, glossy fills, gradients, printed fonts",
  },
  watercolor: {
    id: "watercolor",
    name: "Watercolour storybook",
    nameZh: "水彩繪本",
    description: "柔和暈染、鉛筆線稿的繪本氛圍。",
    canvas: "warm cream cold-pressed watercolour paper with visible grain",
    canvasColor: "#fbf6ea",
    look: "storybook watercolour: loose translucent washes with soft bleeding edges and granulation, fine pencil or sepia ink line work underneath, white paper left showing as highlights",
    palette: "cream paper with soft washes: dusty rose, sage green, ochre, muted cobalt and warm gray; colours stay light and airy",
    typography: "gentle hand-lettered sepia ink in mixed case like a picture-book caption, sitting on a light wash blob or plain paper; never bold blocky text",
    motion: "washes bloom outward, ink lines draw on softly, elements fade and drift like turning pages",
    negatives: "hard vector edges, black marker outlines, photorealism, neon colours, 3D rendering, heavy shadows",
  },
  clay: {
    id: "clay",
    name: "Claymation",
    nameZh: "3D 黏土動畫",
    description: "手捏黏土、柔光攝影棚的停格動畫。",
    canvas: "soft studio backdrop in a single pastel colour",
    canvasColor: "#efe6f5",
    look: "stop-motion claymation: chunky hand-sculpted plasticine characters and props with visible fingerprints and slight lumpiness, soft studio lighting, shallow depth of field, matte surfaces",
    palette: "pastel backdrop with bright plasticine colours: coral, sunshine yellow, mint, sky blue and warm terracotta skin tones",
    typography: "words sculpted from clay in rounded bold letters standing upright on the set with soft shadows; labels are small clay plaques with pressed-in letters; never flat graphic text",
    motion: "stop-motion cadence: squash and stretch, objects morph by reshaping the clay, slight hand-animated jitter",
    negatives: "flat 2D drawing, outlines, glossy CGI plastic, photorealistic humans, painted-on gradients, printed fonts",
  },
  pixel: {
    id: "pixel",
    name: "Pixel art",
    nameZh: "像素風",
    description: "16-bit 方塊像素、復古遊戲機調色。",
    canvas: "flat dark navy background with a subtle pixel grid",
    canvasColor: "#1e2340",
    look: "16-bit pixel art: crisp square pixels with no anti-aliasing, limited palette, chunky one-pixel dark outlines, simple dithering for shading, characters roughly forty-eight pixels tall",
    palette: "dark navy background with a retro console palette: bright cyan, magenta, lime, gold, white and a few skin tones",
    typography: "blocky monospaced pixel font in white or gold, uppercase, with a one-pixel dark drop shadow; labels sit in simple pixel boxes like a game HUD",
    motion: "sprite animation: frame-stepped movement, objects blink and slide in whole-pixel steps, flashing highlights, screen-shake on impacts",
    negatives: "smooth curves, anti-aliasing, gradients, photorealism, hand-drawn lines, blurry edges, vector shapes",
  },
  "ink-manga": {
    id: "ink-manga",
    name: "Ink manga",
    nameZh: "黑白漫畫線稿",
    description: "沾水筆線條、網點與速度線的漫畫張力。",
    canvas: "white manga page with a panel-free composition",
    canvasColor: "#ffffff",
    look: "black-and-white manga ink drawing: confident variable-width brush inking, screentone dot patterns for mid-tones, dramatic speed lines and impact bursts, expressive exaggerated faces",
    palette: "strictly black ink on white with gray screentone; a single spot colour of red allowed for one emphasis element per scene",
    typography: "bold hand-inked sound-effect style lettering in black with white inner fill and thick outline, uppercase, slightly tilted; explanatory labels sit inside rounded speech-bubble shapes with a small tail",
    motion: "manga panel energy: speed lines streak in, elements slam in with impact bursts, quick cuts, tone patterns shimmer",
    negatives: "full colour fills, painterly shading, photorealism, 3D, soft gradients, printed body-text fonts, chibi marker doodle",
  },
  realistic: {
    id: "realistic",
    name: "Cinematic realistic",
    nameZh: "寫實電影感",
    description: "真實光影、35mm 鏡頭感的電影劇照。",
    canvas: "real-world environment appropriate to the scene, softly lit",
    canvasColor: "#d9d6d0",
    look: "photorealistic cinematic still: natural skin and fabric detail, believable lighting with a soft key and gentle fill, 35mm lens look with shallow depth of field, filmic colour grading, no illustration",
    palette: "naturalistic colours with a filmic grade: warm highlights, teal-leaning shadows, restrained saturation",
    typography: "text appears only as physical objects in the scene: printed signs, labels, sticky notes, screens or chalk on a real board, in a clean modern sans-serif with correct perspective and lighting; never floating graphic overlays",
    motion: "live-action camera language: slow dolly, rack focus, handheld micro-drift, natural physics",
    negatives: "cartoon, outlines, flat colour, illustration, 3D toon shading, floating UI text, watermarks, uncanny faces",
  },
};

export function isStyleId(value: string | undefined): value is StyleId {
  return Boolean(value && STYLE_IDS.includes(value as StyleId));
}

// Old videos have no styleId; anything unknown is the original doodle look.
export function resolveStyle(id: string | undefined): Style {
  return STYLES[isStyleId(id) ? id : DEFAULT_STYLE_ID];
}
