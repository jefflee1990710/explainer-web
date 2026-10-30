import { renderImageTip } from "@/service/blog-post/image-tips/render";
import { SPECS_A } from "@/service/blog-post/image-tips/specs-a";
import { SPECS_B } from "@/service/blog-post/image-tips/specs-b";
import { SPECS_C } from "@/service/blog-post/image-tips/specs-c";
import type { ImageTipSpec } from "@/service/blog-post/image-tips/types";

export type { ImageTipFigure, ImageTipSpec } from "@/service/blog-post/image-tips/types";

// Fifty craft tips. Feature and in-article images are attached at seed time.
export const IMAGE_TIP_SPECS: ImageTipSpec[] = [...SPECS_A, ...SPECS_B, ...SPECS_C];

export function renderImageTipSpec(
  spec: ImageTipSpec,
  figureUrls?: Record<string, string>,
): string {
  const index = IMAGE_TIP_SPECS.findIndex((item) => item.id === spec.id);
  const related = IMAGE_TIP_SPECS[(index + 1) % IMAGE_TIP_SPECS.length];
  const urls =
    figureUrls ??
    (spec.figure
      ? { [spec.figure.key]: `https://example.com/${spec.slug}-${spec.figure.key}.webp` }
      : {});
  return renderImageTip(spec, { slug: related.slug, title: related.title }, urls);
}
