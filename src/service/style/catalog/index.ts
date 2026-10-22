import { resolveStyleId, type StyleId } from "@/model/style-id";
import type { IStyle } from "@/model/style";
import { doodleStyle } from "@/service/style/catalog/doodle";
import { flatVectorStyle } from "@/service/style/catalog/flat-vector";
import { paperCutoutStyle } from "@/service/style/catalog/paper-cutout";
import { chalkboardStyle } from "@/service/style/catalog/chalkboard";
import { chalkboardColorStyle } from "@/service/style/catalog/chalkboard-color";
import { watercolorStyle } from "@/service/style/catalog/watercolor";
import { clayStyle } from "@/service/style/catalog/clay";
import { pixelStyle } from "@/service/style/catalog/pixel";
import { inkMangaStyle } from "@/service/style/catalog/ink-manga";
import { realisticStyle } from "@/service/style/catalog/realistic";
import { lowPolyStyle } from "@/service/style/catalog/low-poly";
import { coloredPencilStyle } from "@/service/style/catalog/colored-pencil";
import { darkTechStyle } from "@/service/style/catalog/dark-tech";
import { cavePaintingStyle } from "@/service/style/catalog/cave-painting";
import { egyptianWallStyle } from "@/service/style/catalog/egyptian-wall";
import { atticBlackFigureStyle } from "@/service/style/catalog/attic-black-figure";
import { romanMosaicStyle } from "@/service/style/catalog/roman-mosaic";
import { gothicIlluminationStyle } from "@/service/style/catalog/gothic-illumination";
import { highRenaissanceStyle } from "@/service/style/catalog/high-renaissance";
import { ukiyoEStyle } from "@/service/style/catalog/ukiyo-e";
import { impressionismStyle } from "@/service/style/catalog/impressionism";
import { postImpressionismStyle } from "@/service/style/catalog/post-impressionism";
import { artNouveauStyle } from "@/service/style/catalog/art-nouveau";
import { cubismStyle } from "@/service/style/catalog/cubism";
import { bauhausStyle } from "@/service/style/catalog/bauhaus";
import { popArtStyle } from "@/service/style/catalog/pop-art";
import { eightBitStyle } from "@/service/style/catalog/eight-bit";
import { rayTracedStyle } from "@/service/style/catalog/ray-traced";
import { flatIllustrationStyle } from "@/service/style/catalog/flat-illustration";
import { creamPosterStyle } from "@/service/style/catalog/cream-poster";
import { highlighterNotesStyle } from "@/service/style/catalog/highlighter-notes";
import { gridIconsStyle } from "@/service/style/catalog/grid-icons";
import { proofPosterStyle } from "@/service/style/catalog/proof-poster";
import { dataRingStyle } from "@/service/style/catalog/data-ring";
import { wireframeBreakdownStyle } from "@/service/style/catalog/wireframe-breakdown";

export const STYLES: readonly IStyle[] = [
  doodleStyle,
  flatVectorStyle,
  paperCutoutStyle,
  chalkboardStyle,
  chalkboardColorStyle,
  watercolorStyle,
  clayStyle,
  pixelStyle,
  inkMangaStyle,
  realisticStyle,
  lowPolyStyle,
  coloredPencilStyle,
  darkTechStyle,
  cavePaintingStyle,
  egyptianWallStyle,
  atticBlackFigureStyle,
  romanMosaicStyle,
  gothicIlluminationStyle,
  highRenaissanceStyle,
  ukiyoEStyle,
  impressionismStyle,
  postImpressionismStyle,
  artNouveauStyle,
  cubismStyle,
  bauhausStyle,
  popArtStyle,
  eightBitStyle,
  rayTracedStyle,
  flatIllustrationStyle,
  creamPosterStyle,
  highlighterNotesStyle,
  gridIconsStyle,
  proofPosterStyle,
  dataRingStyle,
  wireframeBreakdownStyle,
];

export const STYLES_BY_ID: Record<StyleId, IStyle> = Object.fromEntries(
  STYLES.map((style) => [style.id, style]),
) as Record<StyleId, IStyle>;

export function getStyleById(id: StyleId): IStyle {
  return STYLES_BY_ID[id];
}

export function resolveCatalogStyle(id: string | undefined): IStyle {
  return STYLES_BY_ID[resolveStyleId(id)];
}
