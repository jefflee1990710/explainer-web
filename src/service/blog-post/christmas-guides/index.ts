import { renderSeasonGuide } from "@/service/blog-post/season-guides/render";
import type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";
import { SPECS_A } from "@/service/blog-post/christmas-guides/specs-a";
import { SPECS_B } from "@/service/blog-post/christmas-guides/specs-b";
import { SPECS_C } from "@/service/blog-post/christmas-guides/specs-c";
import { SPECS_D } from "@/service/blog-post/christmas-guides/specs-d";

export type { SeasonGuideSpec } from "@/service/blog-post/season-guides/types";

// One hundred English Christmas production guides.
export const CHRISTMAS_SPECS: SeasonGuideSpec[] = [...SPECS_A, ...SPECS_B, ...SPECS_C, ...SPECS_D];

export function renderChristmasSpec(spec: SeasonGuideSpec): string {
  const index = CHRISTMAS_SPECS.findIndex((item) => item.id === spec.id);
  const related = CHRISTMAS_SPECS[(index + 1) % CHRISTMAS_SPECS.length];
  return renderSeasonGuide(spec, { slug: related.slug, title: related.title });
}
