import { renderHalloweenGuide } from "@/service/blog-post/halloween-guides/render";
import { HALLOWEEN_SPECS } from "@/service/blog-post/halloween-guides/specs";
import type { HalloweenGuideSpec } from "@/service/blog-post/halloween-guides/types";

export type { HalloweenFigure, HalloweenGuideSpec } from "@/service/blog-post/halloween-guides/types";
export { HALLOWEEN_SPECS };

export function renderHalloweenSpec(
  spec: HalloweenGuideSpec,
  figureUrls?: Record<string, string>,
): string {
  const index = HALLOWEEN_SPECS.findIndex((item) => item.id === spec.id);
  const related = HALLOWEEN_SPECS[(index + 1) % HALLOWEEN_SPECS.length];
  const urls =
    figureUrls ??
    (spec.figure
      ? { [spec.figure.key]: `https://example.com/${spec.slug}-${spec.figure.key}.webp` }
      : {});
  return renderHalloweenGuide(spec, { slug: related.slug, title: related.title }, urls);
}
