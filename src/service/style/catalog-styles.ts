import type { StyleId } from "@/model/style-id";
import { ART_HISTORY_STYLES } from "@/service/style/art-history-styles";
import { REEL_STYLES } from "@/service/style/reel-styles";

// Prompt fields for catalog styles that are inserted when Mongo has no complete row.
export type CatalogStyleFields = {
  name: string;
  description: string;
  canvas: string;
  canvasColor: string;
  look: string;
  palette: string;
  typography: string;
  motion: string;
  negatives: string;
  letteringLayout: string;
  letteringLine1: string;
  letteringLine2: string;
  beatTitleLayout: string;
  reelLayout: string;
};

export type CatalogStyleSpec = {
  id: StyleId;
  fields: CatalogStyleFields;
};

// Low-poly world, colored-pencil drawing, and dark science 3D. Appended after the original catalog.
export const CATALOG_EXTRA_STYLES: CatalogStyleSpec[] = [
  {
    id: "low-poly",
    fields: {
      name: "Low-poly 3D",
      description: "低面數方塊、平面上色與柔陰影，遊戲世界感。",
      canvas: "soft daylight 3D space with a simple ground plane and distant low buildings or trees",
      canvasColor: "#d5e4ee",
      look: "low-poly 3D: chunky flat-faced shapes, hard edges, soft ambient occlusion, no fine texture, like a stylised game world",
      palette: "sky blue, warm gray, leaf green, clay orange, and cream; one accent colour for the hero object",
      typography: "bold geometric sans, white or near-black, short labels floating as flat plaques in the world",
      motion: "objects slide, pop, and assemble along simple paths; the camera dollies or trucks slowly; no motion blur smears",
      negatives: "photoreal skin, high-poly detail, noisy textures, chalk, marker doodles, watercolor wash, pixel blocks",
      letteringLayout: "One short line on a flat plaque in the lower third, clear of the hero object.",
      letteringLine1: "Bold geometric sans, one line, high contrast against the plaque.",
      letteringLine2: "A smaller second line under it in the same sans, only when a second line exists.",
      beatTitleLayout: "A short title plaque near the subject, not a paragraph.",
      reelLayout: "Keep type inside the center safe area, away from the top and bottom edges.",
    },
  },
  {
    id: "colored-pencil",
    fields: {
      name: "Colored pencil",
      description: "蠟筆般的彩色鉛筆筆觸，兒童繪本手繪。",
      canvas: "warm off-white paper with a visible tooth",
      canvasColor: "#f4efe4",
      look: "colored-pencil and crayon drawing: waxy directional strokes, visible paper, slightly clumsy outlines, flat cheerful colour, children's book energy",
      palette: "paper cream, pencil black, crayon red, blue, yellow, and green; colours stay inside the strokes",
      typography: "chunky hand-lettered pencil capitals, a little uneven, as if a child wrote the title",
      motion: "strokes scribble themselves on, colours fill in hatch by hatch, elements wipe in like a hand drawing",
      negatives: "photorealism, 3D render, glossy vector, airbrush, watercolor bloom, pixel art, chalkboard",
      letteringLayout: "Hand-lettered pencil titles sit in the drawing, large and readable.",
      letteringLine1: "Chunky colored-pencil capitals, slightly uneven, one line.",
      letteringLine2: "A smaller pencil line under the title when a second line exists.",
      beatTitleLayout: "A pencil title across the top of a panel, not a printed caption bar.",
      reelLayout: "Titles stay inside the drawing, clear of the top and bottom reel chrome.",
    },
  },
  {
    id: "dark-tech",
    fields: {
      name: "Dark tech 3D",
      description: "深藍空間、發光量體與乾淨 3D 示意圖，科學解說感。",
      canvas: "deep navy void with a faint perspective grid",
      canvasColor: "#0c1424",
      look: "dark technical 3D diagram: clean volumes, thin glowing edges, translucent layers, studio light on forms, science-explainer not a game city",
      palette: "navy, black, white, electric blue, and a single warm accent such as amber or magenta for the active layer",
      typography: "condensed technical sans, light on dark, short labels beside the diagram",
      motion: "layers separate, slide, and stack in depth; a slow orbit or push-in; no cartoon squash",
      negatives: "whiteboard doodle, clay, pixel art, daylight city, photoreal faces, chalk, watercolor, cute mascot world",
      letteringLayout: "One condensed sans line in the upper or lower safe band, light on the dark ground.",
      letteringLine1: "White or pale cyan condensed sans, one short line.",
      letteringLine2: "A smaller muted line under it when a second line exists.",
      beatTitleLayout: "A thin label attached to the diagram, not a poster headline.",
      reelLayout: "Type stays in the upper or lower safe band, never over the brightest volume.",
    },
  },
  ...ART_HISTORY_STYLES,
  ...REEL_STYLES,
];
