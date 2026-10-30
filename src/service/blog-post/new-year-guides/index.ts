import { renderSeasonGuide } from "@/service/blog-post/season-guides/render";
import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";
import { SPECS_A } from "@/service/blog-post/new-year-guides/specs-a";
import { SPECS_B } from "@/service/blog-post/new-year-guides/specs-b";
import { SPECS_C } from "@/service/blog-post/new-year-guides/specs-c";
import { SPECS_D } from "@/service/blog-post/new-year-guides/specs-d";

export type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

// One hundred Cantonese guides for 31 December and 1 January, not Lunar New Year.
export const NEW_YEAR_SPECS: SeasonGuideSpec[] = [...SPECS_A, ...SPECS_B, ...SPECS_C, ...SPECS_D];

export function renderNewYearSpec(spec: SeasonGuideSpec): string {
  const index = NEW_YEAR_SPECS.findIndex((item) => item.id === spec.id);
  const related = NEW_YEAR_SPECS[(index + 1) % NEW_YEAR_SPECS.length];
  return renderSeasonGuide(spec, { slug: related.slug, title: related.title });
}
