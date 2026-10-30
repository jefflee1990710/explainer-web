import { renderKeywordGuide } from "@/service/blog-post/keyword-guides/render";
import { SPECS_A } from "@/service/blog-post/keyword-guides/specs-a";
import { SPECS_B } from "@/service/blog-post/keyword-guides/specs-b";
import { SPECS_C } from "@/service/blog-post/keyword-guides/specs-c";
import { SPECS_D } from "@/service/blog-post/keyword-guides/specs-d";
import type { KeywordGuideSpec } from "@/service/blog-post/keyword-guides/types";

export type { KeywordGuideSpec } from "@/service/blog-post/keyword-guides/types";

// One hundred long-tail guides. Images are attached at seed time.
export const KEYWORD_SPECS: KeywordGuideSpec[] = [
  ...SPECS_A,
  ...SPECS_B,
  ...SPECS_C,
  ...SPECS_D,
];

export function renderKeywordSpec(spec: KeywordGuideSpec): string {
  const index = KEYWORD_SPECS.findIndex((item) => item.id === spec.id);
  const related = KEYWORD_SPECS[(index + 1) % KEYWORD_SPECS.length];
  return renderKeywordGuide(spec, { slug: related.slug, title: related.title });
}
